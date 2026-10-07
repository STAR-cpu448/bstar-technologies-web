const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const storeConfig = require('./supabase-config.js');

const root = __dirname;
const port = Number(process.env.PORT || 10000);
const BASE_URL = process.env.BASE_URL || 'https://bstar-technologies-web.onrender.com';
const supabaseUrl = process.env.SUPABASE_URL || storeConfig.url;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || storeConfig.anonKey;
const whatsappNumber = (storeConfig.whatsappNumber || '').replace(/\D/g, '');
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

function sendHtml(response, status, title, message) {
  response.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><main><h1>${title}</h1><p>${message}</p><p><a href="${BASE_URL}/">Visit B-STAR TECHNOLOGIES</a></p></main></html>`);
}

function redirect(response, targetUrl) {
  response.writeHead(302, { Location: targetUrl, 'Cache-Control': 'no-store' });
  response.end();
}

async function handleQrRedirect(response, code) {
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    sendHtml(response, 404, 'QR code not found', 'This dynamic QR link is invalid. Please check the code or contact B-STAR TECHNOLOGIES.');
    return;
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Dynamic QR redirect is unavailable: Supabase URL or anon key is missing.');
    sendHtml(response, 503, 'QR link temporarily unavailable', 'Please try scanning this QR code again later or contact B-STAR TECHNOLOGIES.');
    return;
  }

  let lookupResponse;
  try {
    lookupResponse = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/get_dynamic_qr_code`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_short_code: code }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.error(`Dynamic QR lookup failed for ${code}:`, error);
    sendHtml(response, 503, 'QR link temporarily unavailable', 'We could not check this QR link right now. Please try again shortly.');
    return;
  }

  if (!lookupResponse.ok) {
    console.error(`Dynamic QR lookup failed for ${code}: Supabase returned HTTP ${lookupResponse.status}.`);
    sendHtml(response, 503, 'QR link temporarily unavailable', 'We could not check this QR link right now. Please try again shortly.');
    return;
  }

  let records;
  try {
    records = await lookupResponse.json();
  } catch (error) {
    console.error(`Dynamic QR lookup returned invalid data for ${code}:`, error);
    sendHtml(response, 503, 'QR link temporarily unavailable', 'We could not check this QR link right now. Please try again shortly.');
    return;
  }

  const record = Array.isArray(records) ? records[0] : records;
  if (!record) {
    sendHtml(response, 404, 'QR code not found', `We could not find dynamic QR code ${code}. Please check the code or contact B-STAR TECHNOLOGIES.`);
    return;
  }

  const expiry = Date.parse(record.expires_at || '');
  if (record.status !== 'active' || !Number.isFinite(expiry) || expiry <= Date.now()) {
    const message = `Hi B-STAR, please help me with dynamic QR code ${code}.`;
    redirect(response, `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`);
    return;
  }

  if (!/^\d{9,15}$/.test(whatsappNumber)) {
    console.error('Dynamic QR redirect is unavailable: the configured WhatsApp number is invalid.');
    sendHtml(response, 503, 'QR link temporarily unavailable', 'We could not open this QR link right now. Please contact B-STAR TECHNOLOGIES.');
    return;
  }

  redirect(response, `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi B-STAR, I scanned dynamic QR code ${code}.`)}`);
}

const server = http.createServer((request, response) => {
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

  const qrMatch = pathname.match(/^\/qr\/([^/]+)\/?$/i);
  if (qrMatch) {
    void handleQrRedirect(response, qrMatch[1].toUpperCase());
    return;
  }

  const requestedPath = pathname === '/' ? '/Index.html' : pathname;
  const filePath = path.resolve(root, `.${requestedPath}`);
  const relativePath = path.relative(root, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    sendText(response, 403, 'Forbidden');
    return;
  }
  if (!publicFiles.has(relativePath)) {
    sendText(response, 404, 'Not found');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendText(response, 404, 'Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
      'Content-Length': stats.size,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': path.extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    const stream = fs.createReadStream(filePath);
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
