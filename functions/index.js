const functions = require("firebase-functions");
const express = require("express");
require("dotenv").config();
const {
  SECURITY_HEADERS,
  createAllowedOrigins,
  createRateLimiter,
  getRateLimitPolicy,
} = require('./security-utils');

const app = express();
const allowedOrigins = createAllowedOrigins(
  [
    'https://bstartechnologies-da1fe.web.app',
    'https://bstartechnologies-da1fe.firebaseapp.com',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:10000',
    'http://127.0.0.1:10000',
  ],
  process.env.CORS_ALLOWED_ORIGINS || '',
  process.env.QR_ALLOWED_ORIGINS || '',
  process.env.DIRA_IMAGE_ALLOWED_ORIGINS || '',
);
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);

app.use((req, res, next) => {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(header, value);
  }
  const origin = req.get('Origin');
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: 'This website is not allowed to access this API.' });
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
    res.setHeader('Access-Control-Max-Age', '600');
    return res.status(204).end();
  }
  return next();
});

const enforceRateLimit = createRateLimiter({ trustProxy: true });
app.use((req, res, next) => {
  const policy = getRateLimitPolicy(req.method, req.path);
  if (policy && !enforceRateLimit(req, res, `${req.method} ${req.path}`, policy)) return;
  return next();
});
app.use(express.json({ limit: '32kb', strict: true }));

const supabaseUrl = 'https://mwnburzestcooeyyuwow.supabase.co';
const supabaseAnonKey = 'sb_publishable_ReqFerJTxI8vYQ2X7yJKcg_VGUo1J2p';

const MODELER_TIERS = new Map([
  ['maker', { toolId: '3d-modeler-maker', amount: 50 }],
  ['pro', { toolId: '3d-modeler-pro', amount: 300 }],
]);

// --- HELPER FUNCTIONS ---
function buildCorporateEmail({ roughText, tone, audience }) {
  const notes = roughText.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const isBullet = /^[-*•]\s+/.test(line);
      const cleaned = line.replace(/^(?:[-*•]|\d+[.)])\s+/, '').replace(/\s+/g, ' ')
        .replace(/\bpls\b/gi, 'please').replace(/\basap\b/gi, 'as soon as possible')
        .replace(/\bthx\b/gi, 'thank you').replace(/\bi\b/g, 'I').trim();
      const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      const punctuated = /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
      return cleaned ? `${isBullet ? '• ' : ''}${punctuated}` : '';
    }).filter(Boolean);

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

  const audienceSalutation = { client: 'Client', supplier: 'Supplier', investor: 'Investor', colleague: 'Team' }[audience];
  const subjectSeed = (notes[0] || 'Business correspondence').replace(/^•\s+/, '').replace(/[.!?]+$/, '').slice(0, 90);

  return {
    subject: `Regarding: ${subjectSeed}`,
    salutation: `Dear ${audienceSalutation},`,
    body: `${lead}\n\n${notes.join('\n')}\n\n${close}`,
    signoff: 'Kind regards,\nDIRA PULSE TECHNOLOGIES',
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function imageQrPage(title, message, options = {}) {
  const image = options.imageUrl ? `<img class="qr-image" src="${escapeHtml(options.imageUrl)}" data-download-name="${escapeHtml(options.downloadName || 'shared-image.jpg')}" alt="Image shared through DIRA PULSE Dynamic Image QR">` : '';
  const saveButton = options.imageUrl ? '<button class="save-image" id="save-image" type="button">Save Image</button>' : '';
  const contact = options.contact ? `<a class="contact-link" href="${escapeHtml(options.contact)}">Contact DIRA PULSE on WhatsApp</a>` : '';
  const expiry = options.expiresAt ? `<p class="expiry">Active until ${escapeHtml(new Date(options.expiresAt).toLocaleDateString('en-KE'))}</p>` : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#080b12">
  <title>${escapeHtml(title)} — DIRA PULSE TECHNOLOGIES</title>
  <script src="/security-diagnostics.js?v=2"></script>
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
    <a class="brand" href="/"><span class="mark" aria-hidden="true">D</span><span>DIRA PULSE<small>TECHNOLOGIES</small></span></a>
    <section class="card"><p class="eyebrow">DYNAMIC IMAGE QR</p><h1>${escapeHtml(title)}</h1><p class="message">${escapeHtml(message)}</p>${image}${saveButton}${contact}${expiry}</section>
    <footer class="footer">©️ DIRA PULSE TECHNOLOGIES · Technology that moves with you.</footer>
  </main>
  ${options.imageUrl ? `<script>
    document.getElementById('save-image').addEventListener('click', async function () {
      const button = this; button.disabled = true;
      try {
        const image = document.querySelector('.qr-image');
        const response = await fetch(image.src, { mode: 'cors' });
        if (!response.ok) throw new Error('Image download failed.');
        const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = objectUrl; link.download = image.dataset.downloadName;
        document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(objectUrl);
      } catch (error) {
        const imageUrl = document.querySelector('.qr-image').src;
        window.DIRASecurityDiagnostics?.reportNavigationAttempt(imageUrl, 'QR image open fallback');
        window.open(imageUrl, '_blank', 'noopener,noreferrer');
      } finally { button.disabled = false; }
    });
  </script>` : ''}
</body>
</html>`;
}

async function callSupabaseRpc(name, body) {
  const result = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!result.ok) throw new Error(`Supabase returned HTTP ${result.status}.`);
  return result.json();
}

// --- API ENDPOINTS ---

app.post('/api/email/transform', async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }
  const { roughText, tone, audience, phone, mpesaCode } = req.body;
  if (typeof roughText !== 'string' || !roughText.trim() || roughText.length > 6000) return res.status(400).json({ error: 'Enter rough notes between 1 and 6,000 characters.' });
  if (!roughText.split(/\r?\n/).some((line) => line.replace(/^(?:[-*•]|\d+[.)])\s+/, '').trim())) return res.status(400).json({ error: 'Add at least one note or key point to transform.' });
  if (!['formal', 'diplomatic', 'urgent', 'decline'].includes(tone)) return res.status(400).json({ error: 'Select a supported email tone.' });
  if (!['client', 'supplier', 'investor', 'colleague'].includes(audience)) return res.status(400).json({ error: 'Select a supported target audience.' });
  if (!phone || typeof phone !== 'string' || !/^[0-9]{9,15}$/.test(phone)) return res.status(400).json({ error: 'Enter the phone number used for your payment.' });
  if (!mpesaCode || typeof mpesaCode !== 'string' || !/^[A-Z0-9]{8,20}$/i.test(mpesaCode)) return res.status(400).json({ error: 'Enter a valid M-Pesa transaction code.' });
  if (!supabaseUrl || !supabaseAnonKey) return res.status(503).json({ error: 'Payment verification is not configured.' });

  try {
    const isApproved = await callSupabaseRpc('has_active_tool_payment', {
      p_phone: phone, p_tool_id: 'business-email-transformer', p_mpesa_code: mpesaCode.toUpperCase()
    });
    if (isApproved !== true) return res.status(402).json({ error: 'Payment has not been approved yet. Your email tool unlocks after an administrator verifies your M-Pesa transaction.' });
    return res.status(200).json(buildCorporateEmail({ roughText: roughText.trim(), tone, audience }));
  } catch (error) {
    console.error(error);
    return res.status(503).json({ error: 'Could not verify payment right now. Please try again shortly.' });
  }
});

app.post('/api/modeler/payment', async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }
  const { tier: tierName, phone: rawPhone, mpesaCode: rawCode, amount_kes } = req.body;
  const tier = MODELER_TIERS.get(tierName);
  const phone = typeof rawPhone === 'string' ? rawPhone.replace(/\D/g, '') : '';
  const mpesaCode = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';

  if (!tier || amount_kes !== tier.amount) return res.status(400).json({ error: 'Select a valid modeler license and matching price.' });
  if (!/^[0-9]{9,15}$/.test(phone)) return res.status(400).json({ error: 'Enter the phone number used for your M-Pesa payment.' });
  if (!/^[A-Z0-9]{8,20}$/.test(mpesaCode)) return res.status(400).json({ error: 'Enter a valid M-Pesa transaction code.' });

  try {
    const rpcInput = { p_phone: phone, p_tool_id: tier.toolId, p_mpesa_code: mpesaCode, p_amount_kes: tier.amount };
    const state = await callSupabaseRpc('get_modeler_payment_state', rpcInput);
    
    if (state === 'approved') return res.status(200).json({ approved: true, tier: tier.toolId, amount_kes: tier.amount });
    if (state === 'used') return res.status(409).json({ error: 'This M-Pesa transaction has already been used for an STL export.' });
    if (state === 'pending') return res.status(202).json({ approved: false, pending: true, message: 'Payment submitted.' });
    if (state === 'rejected') return res.status(402).json({ error: 'Payment rejected. Contact DIRA PULSE.' });

    const insertResponse = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/tool_subscriptions`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ phone, tool_id: tier.toolId, mpesa_code: mpesaCode, amount_kes: tier.amount, status: 'pending_approval' })
    });
    
    if (!insertResponse.ok) return res.status(insertResponse.status === 409 ? 409 : 503).json({ error: 'Error submitting payment.' });
    return res.status(202).json({ approved: false, pending: true, message: 'Payment submitted.' });
  } catch (error) {
    return res.status(503).json({ error: 'Could not submit payment right now.' });
  }
});

app.post('/api/modeler/export', async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }
  const { tier: tierName, phone: rawPhone, mpesaCode: rawCode, amount_kes } = req.body;
  const tier = MODELER_TIERS.get(tierName);
  const phone = typeof rawPhone === 'string' ? rawPhone.replace(/\D/g, '') : '';
  const mpesaCode = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
  if (!tier || amount_kes !== tier.amount
    || !/^[0-9]{9,15}$/.test(phone)
    || !/^[A-Z0-9]{8,20}$/.test(mpesaCode)) {
    return res.status(400).json({ error: 'Enter a valid modeler license, payment phone, transaction code, and matching price.' });
  }

  try {
    const consumed = await callSupabaseRpc('consume_modeler_export_payment', {
      p_phone: phone, p_tool_id: tier.toolId, p_mpesa_code: mpesaCode, p_amount_kes: tier.amount
    });
    if (consumed !== true) return res.status(409).json({ error: 'Payment is not approved or already used.' });
    return res.status(200).json({ consumed: true });
  } catch (error) {
    return res.status(503).json({ error: 'Could not authorize export right now.' });
  }
});

// --- DYNAMIC QR ENDPOINTS ---

app.get(['/qr/:code', '/r/:code'], async (req, res) => {
  const code = req.params.code.toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return res.status(404).send('QR code not found');

  try {
    const record = await callSupabaseRpc('get_dynamic_qr_code', { p_short_code: code });
    if (!record || (Array.isArray(record) && !record[0])) return res.status(404).send('QR code not found');
    res.redirect(`https://wa.me/254794940193?text=${encodeURIComponent(`Hello DIRA PULSE, scanned QR ${code}`)}`);
  } catch (error) {
    res.status(503).send('QR link temporarily unavailable.');
  }
});

app.get('/img-qr/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();
  if (!/^IMG-[A-Z0-9]{6}$/.test(code)) return res.status(404).send(imageQrPage('QR code not found', 'This DIRA PULSE Dynamic Image QR could not be found.'));

  try {
    const recordResponse = await callSupabaseRpc('get_dynamic_image_qr', { p_code: code });
    const record = Array.isArray(recordResponse) ? recordResponse[0] : recordResponse;
    if (!record) return res.status(404).send(imageQrPage('QR code not found', 'This DIRA PULSE Dynamic Image QR could not be found.'));

    if (record.status === 'pending_payment') {
      return res.status(200).send(imageQrPage('Awaiting Payment', 'This Dynamic Image QR is awaiting payment confirmation.', { contact: `https://wa.me/254794940193?text=Hello%20DIRA%20PULSE%2C%20please%20help%20activate%20my%20Dynamic%20Image%20QR%20${code}` }));
    }

    const expiry = Date.parse(record.expires_at || '');
    if (record.status !== 'active' || !Number.isFinite(expiry) || expiry <= Date.now()) {
      return res.status(200).send(imageQrPage('Image QR Not Active', 'This Dynamic Image QR is expired or inactive.', { contact: `https://wa.me/254794940193?text=Hello%20DIRA%20PULSE%2C%20please%20help%20with%20Dynamic%20Image%20QR%20${code}` }));
    }

    const imageUrl = new URL(record.image_url);
    const projectOrigin = new URL(supabaseUrl).origin;
    if (imageUrl.protocol !== 'https:' || imageUrl.origin !== projectOrigin
      || !imageUrl.pathname.startsWith('/storage/v1/object/public/qr-images/uploads/')
      || imageUrl.search || imageUrl.hash) {
      throw new Error('The hosted image URL failed validation.');
    }
    res.status(200).send(imageQrPage('Your shared image', 'This image was shared with DIRA PULSE Dynamic Image QR.', {
      imageUrl: imageUrl.href,
      downloadName: `${code}.${imageUrl.pathname.match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg'}`,
      expiresAt: record.expires_at,
    }));
  } catch (error) {
    res.status(503).send(imageQrPage('Temporarily Unavailable', 'This Dynamic Image QR could not be loaded right now.'));
  }
});

// Expose the Express app as a Firebase Cloud Function
exports.api = functions.https.onRequest(app);