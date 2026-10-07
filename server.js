const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const storeConfig = require('./supabase-config.js');

const root = __dirname;
const port = Number(process.env.PORT || 10000);
const supabaseUrl = process.env.SUPABASE_URL || storeConfig.url;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || storeConfig.anonKey;
const publicFiles = new Set(['Index.html', 'app.js', 'styles.css', 'supabase-config.js']);
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

function sendText(response, status, message) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  response.end(message);
}

function redirect(response, targetUrl) {
  response.writeHead(302, { Location: targetUrl, 'Cache-Control': 'no-store' });
  response.end();
}

async function handleQrRedirect(response, code) {
  console.log(`Processing QR scan for code: ${code}`);
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    sendText(response, 404, 'QR code not found');
    return;
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL or anon key is not configured.');
    }

    const lookupResponse = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/get_dynamic_qr_code`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_short_code: code }),
      signal: AbortSignal.timeout(10000),
    });
    if (!lookupResponse.ok) {
      throw new Error(`Supabase returned HTTP ${lookupResponse.status}.`);
    }

    const records = await lookupResponse.json();
    const record = Array.isArray(records) ? records[0] : records;
    if (!record) {
      sendText(response, 404, 'QR code not found');
      return;
    }

    const cleanPhone = '254794940193';
    const message = `Hello B-STAR, scanned QR ${code}`;
    redirect(response, `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`);
  } catch (error) {
    console.error(`Error looking up QR code ${code}:`, error);
    if (!response.writableEnded && !response.destroyed) {
      sendText(response, 503, 'QR link temporarily unavailable. Please try again later.');
    }
  }
}

const server = http.createServer((request, response) => {
  console.log(`[ROUTE HIT] ${request.method} ${request.url}`);
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    sendText(response, 405, 'Method not allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    sendText(response, 400, 'Invalid request path');
    return;
  }

  const qrMatch = pathname.match(/^\/(?:qr|r)\/([^/]+)\/?$/i);
  if (qrMatch) {
    void handleQrRedirect(response, qrMatch[1].trim().toUpperCase());
    return;
  }

  const requestedPath = pathname === '/' ? '/Index.html' : pathname;
  const filePath = path.resolve(root, `.${requestedPath}`);
  const relativePath = path.relative(root, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    sendText(response, 403, 'Forbidden');
    return;
  }
  const isAppRoute = !path.extname(relativePath);
  if (!publicFiles.has(relativePath) && !isAppRoute) {
    sendText(response, 404, 'Not found');
    return;
  }

  const staticFilePath = publicFiles.has(relativePath) ? filePath : path.join(root, 'Index.html');
  fs.stat(staticFilePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendText(response, 404, 'Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentTypes.get(path.extname(staticFilePath).toLowerCase()) || 'application/octet-stream',
      'Content-Length': stats.size,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': path.extname(staticFilePath) === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    const stream = fs.createReadStream(staticFilePath);
    stream.on('error', (error) => {
      console.error('Static file read failed:', error);
      if (!response.headersSent) sendText(response, 500, 'Unable to read file');
      else response.destroy(error);
    });
    stream.pipe(response);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`B-STAR TECHNOLOGIES is available on port ${port}`);
});

server.on('error', (error) => {
  console.error('Unable to start the B-STAR web server:', error);
  process.exitCode = 1;
});
