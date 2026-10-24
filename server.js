const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const storeConfig = require('./public/supabase-config.js');

const root = __dirname;
const publicDir = path.join(root, 'public');
const port = Number(process.env.PORT || 10000);
const supabaseUrl = process.env.SUPABASE_URL || storeConfig.url;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || storeConfig.anonKey;
const publicFiles = new Set(['Index.html', 'app.js', 'tools.js', 'styles.css', 'supabase-config.js', 'modeler.html']);
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

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

async function readJson(request, maxBytes = 12000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

function buildCorporateEmail({ roughText, tone, audience }) {
  const notes = roughText.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const isBullet = /^[-*•]\s+/.test(line);
      const cleaned = line.replace(/^(?:[-*•]|\d+[.)])\s+/, '')
        .replace(/\s+/g, ' ')
        .replace(/\bpls\b/gi, 'please')
        .replace(/\basap\b/gi, 'as soon as possible')
        .replace(/\bthx\b/gi, 'thank you')
        .replace(/\bi\b/g, 'I')
        .trim();
      const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      const punctuated = /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
      return cleaned ? `${isBullet ? '• ' : ''}${punctuated}` : '';
    })
    .filter(Boolean);
  const lead = {
    formal: 'I am writing to share the following information for your consideration:',
    diplomatic: 'Thank you for your continued engagement. To move forward constructively, I would like to discuss the following:',
    urgent: 'I am following up on this time-sensitive matter and would appreciate your prompt attention to the following:',
    decline: 'Thank you for considering us. After careful review, we are unable to proceed with the following request at this time:',
  }[tone];
  const close = {
    formal: 'Please let me know if you have any questions or would like to discuss this further.',
    diplomatic: 'I would welcome your perspective so we can agree on a constructive next step.',
    urgent: 'Please confirm receipt and advise on the next steps at your earliest convenience.',
    decline: 'We appreciate your understanding and hope there may be an opportunity to work together in the future.',
  }[tone];
  const audienceSalutation = {
    client: 'Client',
    supplier: 'Supplier',
    investor: 'Investor',
    colleague: 'Team',
  }[audience];
  const subjectSeed = (notes[0] || 'Business correspondence')
    .replace(/^•\s+/, '')
    .replace(/[.!?]+$/, '')
    .slice(0, 90);
  return {
    subject: `Regarding: ${subjectSeed}`,
    salutation: `Dear ${audienceSalutation},`,
    body: `${lead}\n\n${notes.join('\n')}\n\n${close}`,
    signoff: 'Kind regards,\nB-STAR TECHNOLOGIES',
  };
}

async function handleEmailTransform(request, response) {
  let payload;
  try {
    payload = await readJson(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    sendJson(response, 400, { error: 'Request body must be a JSON object.' });
    return;
  }
  const { roughText, tone, audience, phone, mpesaCode } = payload;
  if (typeof roughText !== 'string' || !roughText.trim() || roughText.length > 6000) {
    sendJson(response, 400, { error: 'Enter rough notes between 1 and 6,000 characters.' });
    return;
  }
  if (!roughText.split(/\r?\n/).some((line) => line.replace(/^(?:[-*•]|\d+[.)])\s+/, '').trim())) {
    sendJson(response, 400, { error: 'Add at least one note or key point to transform.' });
    return;
  }
  if (!['formal', 'diplomatic', 'urgent', 'decline'].includes(tone)) {
    sendJson(response, 400, { error: 'Select a supported email tone.' });
    return;
  }
  if (!['client', 'supplier', 'investor', 'colleague'].includes(audience)) {
    sendJson(response, 400, { error: 'Select a supported target audience.' });
    return;
  }
  if (typeof phone !== 'string' || !/^[0-9]{9,15}$/.test(phone)) {
    sendJson(response, 400, { error: 'Enter the phone number used for your payment.' });
    return;
  }
  if (typeof mpesaCode !== 'string' || !/^[A-Z0-9]{8,20}$/i.test(mpesaCode)) {
    sendJson(response, 400, { error: 'Enter a valid M-Pesa transaction code.' });
    return;
  }
  if (!supabaseUrl || !supabaseKey) {
    sendJson(response, 503, { error: 'Payment verification is not configured. Please contact B-STAR TECHNOLOGIES.' });
    return;
  }

  try {
    const verificationResponse = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/has_active_tool_payment`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_phone: phone,
        p_tool_id: 'business-email-transformer',
        p_mpesa_code: mpesaCode.toUpperCase(),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!verificationResponse.ok) throw new Error(`Supabase returned HTTP ${verificationResponse.status}.`);
    if (await verificationResponse.json() !== true) {
      sendJson(response, 402, { error: 'Payment has not been approved yet. Your email tool unlocks after an administrator verifies your M-Pesa transaction.' });
      return;
    }
    sendJson(response, 200, buildCorporateEmail({ roughText: roughText.trim(), tone, audience }));
  } catch (error) {
    console.error('Business email payment verification failed:', error);
    sendJson(response, 503, { error: 'Could not verify payment right now. Please try again shortly.' });
  }
}

const MODELER_TIERS = new Map([
  ['maker', { toolId: '3d-modeler-maker', amount: 50 }],
  ['pro', { toolId: '3d-modeler-pro', amount: 300 }],
]);

async function readModelerPayment(request, response) {
  let payload;
  try {
    payload = await readJson(request, 4000);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return null;
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    sendJson(response, 400, { error: 'Request body must be a JSON object.' });
    return null;
  }
  const tier = MODELER_TIERS.get(payload.tier);
  const phone = typeof payload.phone === 'string' ? payload.phone.replace(/\D/g, '') : '';
  const mpesaCode = typeof payload.mpesaCode === 'string' ? payload.mpesaCode.trim().toUpperCase() : '';
  if (!tier || payload.amount_kes !== tier.amount) {
    sendJson(response, 400, { error: 'Select a valid modeler license and matching price.' });
    return null;
  }
  if (!/^[0-9]{9,15}$/.test(phone)) {
    sendJson(response, 400, { error: 'Enter the phone number used for your M-Pesa payment.' });
    return null;
  }
  if (!/^[A-Z0-9]{8,20}$/.test(mpesaCode)) {
    sendJson(response, 400, { error: 'Enter a valid M-Pesa transaction code.' });
    return null;
  }
  if (!supabaseUrl || !supabaseKey) {
    sendJson(response, 503, { error: 'Payment verification is not configured. Please contact B-STAR TECHNOLOGIES.' });
    return null;
  }
  return { ...tier, phone, mpesaCode };
}

async function callSupabaseRpc(name, body) {
  const result = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!result.ok) throw new Error(`Supabase payment verification returned HTTP ${result.status}.`);
  return result.json();
}

async function handleModelerPayment(request, response) {
  const payment = await readModelerPayment(request, response);
  if (!payment) return;
  try {
    const rpcInput = {
      p_phone: payment.phone,
      p_tool_id: payment.toolId,
      p_mpesa_code: payment.mpesaCode,
      p_amount_kes: payment.amount,
    };
    const state = await callSupabaseRpc('get_modeler_payment_state', rpcInput);
    if (state === 'approved') {
      sendJson(response, 200, { approved: true, tier: payment.toolId, amount_kes: payment.amount });
      return;
    }
    if (state === 'used') {
      sendJson(response, 409, { error: 'This M-Pesa transaction has already been used for an STL export.' });
      return;
    }
    if (state === 'pending') {
      sendJson(response, 202, { approved: false, pending: true, message: 'Payment submitted. An administrator must verify it before the STL export is enabled.' });
      return;
    }
    if (state === 'rejected') {
      sendJson(response, 402, { error: 'This payment request was not approved. Contact B-STAR TECHNOLOGIES for help.' });
      return;
    }

    const insertResponse = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/tool_subscriptions`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        phone: payment.phone,
        tool_id: payment.toolId,
        mpesa_code: payment.mpesaCode,
        amount_kes: payment.amount,
        status: 'pending_approval',
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!insertResponse.ok) {
      const detail = await insertResponse.text();
      console.error('Modeler payment request could not be recorded:', detail);
      sendJson(response, insertResponse.status === 409 ? 409 : 503, {
        error: insertResponse.status === 409
          ? 'This M-Pesa transaction code has already been submitted.'
          : 'Could not record the payment request. Run the latest supabase-setup.sql and try again.',
      });
      return;
    }
    sendJson(response, 202, { approved: false, pending: true, message: 'Payment submitted. An administrator must verify it before the STL export is enabled.' });
  } catch (error) {
    console.error('Could not process modeler payment:', error);
    sendJson(response, 503, { error: 'Could not check or submit this payment right now. Please try again shortly.' });
  }
}

async function handleModelerExport(request, response) {
  const payment = await readModelerPayment(request, response);
  if (!payment) return;
  try {
    const consumed = await callSupabaseRpc('consume_modeler_export_payment', {
      p_phone: payment.phone,
      p_tool_id: payment.toolId,
      p_mpesa_code: payment.mpesaCode,
      p_amount_kes: payment.amount,
    });
    if (consumed !== true) {
      sendJson(response, 409, { error: 'Payment is not approved, or this transaction has already been used for an STL export.' });
      return;
    }
    sendJson(response, 200, { consumed: true });
  } catch (error) {
    console.error('Could not authorize modeler STL export:', error);
    sendJson(response, 503, { error: 'Could not authorize the STL export right now. Please try again shortly.' });
  }
}

async function handleCreateImageQr(request, response) {
  let payload;
  try {
    payload = await readJson(request, 20000);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or key is not configured.');
    }
    const insertResponse = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/dynamic_image_qrs`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        code: payload.code,
        image_url: payload.imageUrl,
        phone: payload.phone,
        mpesa_code: payload.mpesaCode,
        amount_kes: payload.amount || 99,
        status: 'pending_payment',
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!insertResponse.ok) {
      const errText = await insertResponse.text();
      if (insertResponse.status === 409 || /duplicate key|unique constraint/i.test(errText)) {
        sendJson(response, 409, { error: 'That M-Pesa confirmation code has already been submitted.' });
        return;
      }
      throw new Error(`Supabase insert failed: ${errText}`);
    }
    const data = await insertResponse.json();
    sendJson(response, 200, { success: true, data });
  } catch (error) {
    console.error('Could not create dynamic image QR record:', error);
    sendJson(response, 503, { error: error.message || 'Could not create your dynamic image QR record right now.' });
  }
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
    <footer class="footer">©️ B-STAR TECHNOLOGIES · Technology that moves with you.</footer>
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
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase is not configured.');
    const lookupResponse = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/get_dynamic_image_qr`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
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
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or key is not configured.');
    }

    const lookupResponse = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/get_dynamic_qr_code`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
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
  if (request.method === 'POST' && request.url === '/api/email/transform') {
    void handleEmailTransform(request, response);
    return;
  }
  if (request.method === 'POST' && request.url === '/api/modeler/payment') {
    void handleModelerPayment(request, response);
    return;
  }
  if (request.method === 'POST' && request.url === '/api/modeler/export') {
    void handleModelerExport(request, response);
    return;
  }
  if (request.method === 'POST' && request.url === '/api/qr/create') {
    void handleCreateImageQr(request, response);
    return;
  }
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
  const filePath = path.resolve(publicDir, `.${requestedPath}`);
  const relativePath = path.relative(publicDir, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    sendText(response, 403, 'Forbidden');
    return;
  }
  const isAppRoute = !path.extname(relativePath);
  if (!publicFiles.has(relativePath) && !isAppRoute) {
    sendText(response, 404, 'Not found');
    return;
  }

  const staticFilePath = publicFiles.has(relativePath) ? filePath : path.join(publicDir, 'Index.html');
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