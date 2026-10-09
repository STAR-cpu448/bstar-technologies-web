const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const storeConfig = require('./supabase-config.js');

const root = __dirname;
const port = Number(process.env.PORT || 10000);
const supabaseUrl = process.env.SUPABASE_URL || storeConfig.url;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || storeConfig.anonKey;
const publicFiles = new Set(['Index.html', 'app.js', 'tools.js', 'styles.css', 'supabase-config.js']);
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

function sendHtml(response, status, html, headOnly = false) {
  const body = headOnly ? '' : html;
  response.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function imageQrPage(title, message, options = {}) {
  const image = options.imageUrl
    ? `<img class="qr-image" src="${escapeHtml(options.imageUrl)}" data-download-name="${escapeHtml(options.downloadName || 'shared-image.jpg')}" alt="Image shared through B-STAR Dynamic Image QR">`
    : '';
  const saveButton = options.imageUrl
    ? '<button class="save-image" id="save-image" type="button">Save Image</button>'
    : '';
  const contact = options.contact
    ? `<a class="contact-link" href="${escapeHtml(options.contact)}">Contact B-STAR on WhatsApp</a>`
    : '';
  const expiry = options.expiresAt
    ? `<p class="expiry">Active until ${escapeHtml(new Date(options.expiresAt).toLocaleDateString('en-KE'))}</p>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#080b12">
  <title>${escapeHtml(title)} — B-STAR TECHNOLOGIES</title>
  <style>
    :root{color-scheme:dark;--bg:#080b12;--panel:#111620;--line:rgba(255,255,255,.1);--text:#f5f7fb;--muted:#a0a6b3;--lime:#c7f24d}
    *{box-sizing:border-box}body{min-height:100vh;margin:0;padding:24px;background:radial-gradient(ellipse at 50% 0,rgba(199,242,77,.08),transparent 48%),var(--bg);color:var(--text);font:15px/1.6 "DM Sans",system-ui,sans-serif}
    .page{width:min(100%,760px);margin:0 auto}.brand{display:flex;align-items:center;gap:11px;margin:0 0 32px;color:var(--text);font:700 13px/1.2 system-ui,sans-serif;letter-spacing:.1em;text-decoration:none}
    .mark{display:grid;width:38px;height:38px;place-items:center;border-radius:11px;background:var(--lime);color:#141a0b;font-size:21px}.brand small{display:block;padding-top:4px;color:var(--muted);font-size:8px;letter-spacing:.2em}
    .card{padding:clamp(20px,5vw,36px);border:1px solid var(--line);border-radius:16px;background:rgba(17,22,32,.92);box-shadow:0 24px 80px rgba(0,0,0,.35)}
    .eyebrow{margin:0 0 10px;color:var(--lime);font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}h1{margin:0 0 14px;font-size:clamp(25px,6vw,38px);line-height:1.15;letter-spacing:-.04em}
    .message{margin:0;color:var(--muted);white-space:pre-line}.qr-image{display:block;width:100%;height:auto;max-height:75vh;margin:24px auto 16px;border-radius:10px;object-fit:contain;background:#080b12}
    .save-image,.contact-link{display:inline-flex;min-height:46px;align-items:center;justify-content:center;margin:4px 8px 0 0;padding:0 18px;border:1px solid transparent;border-radius:8px;background:var(--lime);color:#141a0b;font:700 14px system-ui,sans-serif;text-decoration:none;cursor:pointer}
    .contact-link{border-color:var(--line);background:transparent;color:var(--text)}.expiry{color:var(--muted);font-size:12px}.footer{margin-top:20px;color:#7e8491;font-size:10px}
  </style>
</head>
<body>
  <main class="page">
    <a class="brand" href="/">
      <span class="mark" aria-hidden="true">B</span>
      <span>B-STAR<small>TECHNOLOGIES</small></span>
    </a>
    <section class="card">
      <p class="eyebrow">DYNAMIC IMAGE QR</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="message">${escapeHtml(message)}</p>
      ${image}${saveButton}${contact}${expiry}
    </section>
    <footer class="footer">© B-STAR TECHNOLOGIES · Technology that moves with you.</footer>
  </main>
  ${options.imageUrl ? `<script>
    document.getElementById('save-image').addEventListener('click', async function () {
      const button = this;
      button.disabled = true;
      try {
        const image = document.querySelector('.qr-image');
        const response = await fetch(image.src, { mode: 'cors' });
        if (!response.ok) throw new Error('Image download failed.');
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = image.dataset.downloadName;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
      } catch (error) {
        window.open(document.querySelector('.qr-image').src, '_blank', 'noopener,noreferrer');
      } finally {
        button.disabled = false;
      }
    });
  <\/script>` : ''}
</body>
</html>`;
}

function redirect(response, targetUrl) {
  response.writeHead(302, { Location: targetUrl, 'Cache-Control': 'no-store' });
  response.end();
}

async function handleImageQr(response, code, headOnly = false) {
  if (!/^IMG-[A-Z0-9]{6}$/.test(code)) {
    sendHtml(response, 404, imageQrPage('QR code not found', 'This B-STAR Dynamic Image QR could not be found.'), headOnly);
    return;
  }
  try {
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase is not configured.');
    const lookupResponse = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/get_dynamic_image_qr`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: code }),
      signal: AbortSignal.timeout(10000),
    });
    if (!lookupResponse.ok) throw new Error(`Supabase returned HTTP ${lookupResponse.status}.`);
    const result = await lookupResponse.json();
    const record = Array.isArray(result) ? result[0] : result;
    if (!record) {
      sendHtml(response, 404, imageQrPage('QR code not found', 'This B-STAR Dynamic Image QR could not be found.'), headOnly);
      return;
    }

    const imageUrl = new URL(record.image_url);
    const projectOrigin = new URL(supabaseUrl).origin;
    if (imageUrl.protocol !== 'https:' || imageUrl.origin !== projectOrigin || !imageUrl.pathname.startsWith('/storage/v1/object/public/qr-images/uploads/')) {
      throw new Error('The hosted image URL failed validation.');
    }

    if (record.status === 'pending_payment') {
      const contact = 'https://wa.me/254794940193?text=Hello%20B-STAR%2C%20please%20help%20activate%20my%20Dynamic%20Image%20QR%20' + encodeURIComponent(code);
      sendHtml(response, 200, imageQrPage(
        'Awaiting Payment Confirmation',
        'This Dynamic Image QR is awaiting payment confirmation (KES 99 to 0794940193). Contact admin to activate.',
        { contact },
      ), headOnly);
      return;
    }

    const expiry = Date.parse(record.expires_at || '');
    if (record.status !== 'active' || !Number.isFinite(expiry) || expiry <= Date.now()) {
      sendHtml(response, 200, imageQrPage('Image QR Not Active', 'This Dynamic Image QR is expired or inactive. Contact B-STAR for assistance.', {
        contact: 'https://wa.me/254794940193?text=Hello%20B-STAR%2C%20please%20help%20with%20Dynamic%20Image%20QR%20' + encodeURIComponent(code),
      }), headOnly);
      return;
    }
    sendHtml(response, 200, imageQrPage('Your shared image', 'This image was shared with B-STAR Dynamic Image QR.', {
      imageUrl: imageUrl.href,
      downloadName: `${code}.${imageUrl.pathname.match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg'}`,
      expiresAt: record.expires_at,
    }), headOnly);
  } catch (error) {
    console.error(`Dynamic image QR lookup failed for ${code}:`, error);
    sendHtml(response, 503, imageQrPage('Temporarily Unavailable', 'This Dynamic Image QR could not be loaded right now. Please try again later.'), headOnly);
  }
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

  const imageQrMatch = pathname.match(/^\/img-qr\/([^/]+)\/?$/i);
  if (imageQrMatch) {
    void handleImageQr(response, imageQrMatch[1].trim().toUpperCase(), request.method === 'HEAD');
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
