# DIRA PULSE TECHNOLOGIES

A responsive, dark-mode tech storefront with a sticky glass navbar, searchable/category-filtered catalog, local cart drawer, WhatsApp order handoff, and Supabase-backed admin dashboard.

The Digital Utilities & Tools section includes browser-based utilities and the DIRA AI Image Generator. Local PDF and image utilities run in the browser; AI image generation uses the Render API. Standard tool access is KES 10 and requires manual M-Pesa verification by an administrator.

Tool cards and featured tools have distinct built-in SVG illustrations. Optional rendered artwork can override an illustration by adding `public/assets/tools/<tool-id>.webp` or `.png`; the storefront tries WebP first and falls back to PNG.

## Run locally

Requires Node.js 18.17 or newer.

```powershell
npm.cmd start
```

Open <http://127.0.0.1:10000>.

## Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase-setup.sql`](./supabase-setup.sql). It creates the product, category, Dynamic Image QR, and Digital Utilities subscription tables, constraints/indexes, public product/QR image buckets, and row/storage policies. Re-run this updated script to install the latest QR and `tool_subscriptions` tables and RPCs.
3. Set the project URL and **public anon key** in [`supabase-config.js`](./supabase-config.js). These browser values are not secrets. Never put a service-role key in this file.
4. Optionally set the store currency (an ISO 4217 code, default `KES`) and WhatsApp number in international format without `+`, such as `2547XXXXXXXX`.
5. Enable email/password sign-in in Supabase Auth and create an administrator account. Set the trusted `app_metadata` claim `role: "admin"` using the Supabase Dashboard or a trusted Admin API operation. Never set admin claims from browser/user-editable metadata.
6. Open the shield icon on desktop to sign in. Create categories first, then add products with a JPEG, PNG, or WebP image (maximum 5 MB). Admin writes are enforced by database and Storage RLS, not by hiding the dashboard.

The storefront reads only active products in active categories. The cart persists in the current browser and checks the latest loaded stock. Checkout opens a WhatsApp message with the cart summary; availability, delivery, and payment are confirmed with the business. No payment processing or order database is configured.

### Dynamic image QR codes

After deploying this feature, run the updated [`supabase-setup.sql`](./supabase-setup.sql) in the Supabase SQL Editor. It creates the public `qr-images` bucket and `dynamic_image_qrs` table, permits bounded anonymous image uploads and pending KES 99 QR submissions, and exposes only the image, status and expiry fields through the public `get_dynamic_image_qr` RPC. It also adds the fixed `amount_kes = 99` column/grant used by the submission API. New QR URLs use an `IMG-XXXXXX` code and the `/img-qr/:code` path. The Node server renders active hosted images with a Save Image button, pending-payment instructions, and branded not-found/expired pages. It validates that viewer and submission image URLs belong to the configured Supabase Storage bucket. Existing `dynamic_qr_codes` rows are copied forward with their status and expiry preserved; historical rows have no M-Pesa code recorded. Legacy `/qr/:code`, `/r/:code`, and `#q=CODE` links remain supported.

Customers submit a JPG, PNG or WebP image (up to 5 MB), their phone number, and M-Pesa confirmation code with the KES 99/month request. The API allows the Firebase Hosting origins configured for this project and local development by default; add comma-separated origins to the Render `QR_ALLOWED_ORIGINS` environment variable when using another custom frontend domain. Verify payment manually, then use the authenticated Store dashboard's **Image QR Activations** tab to activate the code for 30 days. Activation opens a prefilled WhatsApp notification to the customer; if the browser blocks the popup, use the notification link on the active row. Payment collection and confirmation are not automated.

The viewer checks status and expiry server-side. Pending requests show payment instructions; only active, unexpired codes display their hosted image.

Digital Utilities access is purchased per tool. Customers submit their phone number and M-Pesa transaction code for KES 10; submissions remain `pending_approval` until an administrator verifies payment and selects **Enable Service** in the Store dashboard's Tool Subscriptions tab. The browser calls the `has_active_tool_subscription` RPC to check access; it does not trust a client-set active flag. The RPC returns only a boolean, while subscription records are visible/manageable only to store administrators. Payment verification and M-Pesa collection are manual; the browser does not initiate or confirm payments.

The Business Email Transformer is available in Digital Utilities for KES 50. Customers submit their phone number and M-Pesa transaction code for manual administrator approval. After approval, the server verifies the matching active payment before returning an email with a subject, salutation, polished body, and sign-off. Its tone templates preserve the supplied details and do not call an external AI service. Run the updated `supabase-setup.sql` to enable this tool's KES 50 subscription and payment-verification RPC.

### DIRA AI Image Generator

The featured Digital Tools card opens a focused image-generator view with Base and Pro tiers. The user's prompt is sent unchanged apart from trimming surrounding whitespace, with the selected 1:1, 4:5, or 16:9 aspect ratio. Base is limited to 5 generations per IP per day. Pro costs KES 700/month via M-Pesa Send Money to 0794940193, allows up to 60 generations per approved payer phone in a rolling 30-day period, and expires one month after an administrator approves the payment. Pro requests are checked by the Render API against `tool_subscriptions`; run the updated `supabase-setup.sql` before accepting payments.

Configure these environment variables on the Render web service. Keep both keys in Render secrets; never add them to browser files:

- `OPENAI_API_KEY` — secret OpenAI API key.
- `SUPABASE_SERVICE_ROLE_KEY` — secret service-role key used only by the backend for Pro authorization and atomic usage limits.
- `DIRA_IMAGE_BASE_MODEL` — defaults to `gpt-image-2.5-flare`.
- `DIRA_IMAGE_BASE_QUALITY` — defaults to `medium`.
- `DIRA_IMAGE_PRO_MODEL` — defaults to `gpt-image-2.5-sunburst`.
- `DIRA_IMAGE_PRO_QUALITY` — defaults to `high`.
- `DIRA_IMAGE_ALLOWED_ORIGINS` — optional comma-separated frontend origins; Firebase Hosting and localhost ports 5000, 5500 and 10000 are allowed by default in `server.js`.

The frontend calls the Render `/api/image/*` endpoints by default. Local backends on ports 5000 and 10000 use the page's origin; static Live Server ports such as 5500 use Render. To point Live Server at a local backend, set `imageApiBaseUrl: 'http://127.0.0.1:10000'` in `public/supabase-config.js`, or set `window.DIRA_API_BASE_URL` before `voice-assistant.js` loads. For a changed Render hostname, set the same value to that public backend origin using HTTPS. Remote HTTP overrides are rejected; HTTP is allowed only for a same-origin URL or localhost development. Never put credentials in either browser setting.

[`public/security-diagnostics.js`](./public/security-diagnostics.js) logs failed browser resource loads, Content Security Policy blocks, and unrecognized external link/form navigation attempts to the console. Query values are redacted in diagnostic URLs.

Image-generator errors distinguish an unreachable or disallowed backend origin, missing backend configuration, Supabase approval/usage failures, exhausted limits, and OpenAI model, permission, or quota errors. Backend responses include safe diagnostic details; server secrets and provider response bodies are not sent to the browser.

### API security settings

The Node server and Firebase Function set `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a Content Security Policy. The policy permits the site's inline code and the current Google Fonts, unpkg, cdnjs, jsDelivr, Supabase, and HTTPS API resources. Keep third-party resources HTTPS-only; adding a new CDN or API may require updating the CSP in `firebase.json` and `functions/security-utils.js`.

API endpoints enforce JSON request bodies and per-IP limits: image generation and Pro payment submissions 5/minute, QR creation 5 per 10 minutes, email transformation 10/minute, modeler payment 8/minute, modeler export 20/minute, Pro access checks 20/minute, and QR lookups 120/minute. These in-memory limits are per running process and are a best-effort safeguard, not a shared/global quota; use an edge/WAF or shared rate-limit service before scaling to multiple instances. Direct anonymous Supabase Storage uploads do not pass through these API limits.

Firebase Functions allows the project's Firebase Hosting origins and local development by default. Set comma-separated `CORS_ALLOWED_ORIGINS` on the Function when using a custom frontend domain; use exact HTTPS origins without a trailing slash. The Render Node server also accepts `CORS_ALLOWED_ORIGINS`, `QR_ALLOWED_ORIGINS`, and `DIRA_IMAGE_ALLOWED_ORIGINS`. It trusts the forwarded client IP on Render (`RENDER=true`) or when `TRUST_PROXY=true`; do not enable proxy trust unless requests arrive through a proxy that overwrites/appends a reliable `X-Forwarded-For` chain. Firebase Functions trusts one proxy hop by default; set `TRUST_PROXY_HOPS` only when the deployed proxy topology requires a different value.

In Supabase, keep the service-role key exclusively in backend secrets, retain RLS on customer/payment tables, and verify Storage bucket size/type limits and policies. The QR image bucket is intentionally public and supports anonymous uploads; public image URLs are not private, and upload abuse protection should be added before traffic grows. In Firebase, verify custom domains use managed HTTPS and configure the Function's allowed-origin environment variable for each custom domain. In Render, keep OpenAI and Supabase service-role credentials in secret environment variables and confirm the service is behind Render's trusted proxy.

The standalone 3D Parametric Modeler is available at [`/modeler.html`](./modeler.html) and is linked from the home-page hero. It builds a closed hollow lantern mesh in the browser with Three.js, previews a non-exported lit bulb, and exports binary STL in millimeters. Each Maker / Personal export costs KES 50; each Pro / Commercial export costs KES 300 and enables wall-thickness and radial-segment controls. Payment requests are recorded in `tool_subscriptions` with the corresponding modeler license `tool_id`, `amount_kes`, and M-Pesa code; an administrator must approve the payment before export. The database marks each approved payment as consumed on its one STL export. Re-run [`supabase-setup.sql`](./supabase-setup.sql) to add the modeler license IDs, amount rules, `exported_at`, and payment RPCs. The modeler loads its pinned Three.js modules from jsDelivr, so browser access to that CDN is required.

Public bucket images can be accessed by anyone who has the URL. Anonymous Storage uploads bypass the application API rate limits; configure additional upload abuse protection before promoting the upload form widely.

### Seed the ORAIMO catalog

Install dependencies with `npm install`, then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the environment of a trusted local shell. Never expose the service-role key in browser code or commit it. Preview the catalog with `npm run seed:oraimo -- --dry-run`; run `npm run seed:oraimo` to upsert its categories and 35 distinct ORAIMO products. Product images use official ORAIMO CDN URLs. The seeded promotional prices are KES 100 below each script-defined reference price. The current schema has a single `price` field, so reference prices are also recorded in each product description.

This is a curated set of distinct model listings, not 1,000 products. The official catalog does not provide 1,000 distinct ORAIMO models; this seed avoids inventing duplicate models or color variants.

### Seed the Amaya catalog

Set `SUPABASE_SERVICE_ROLE_KEY` in a trusted local shell and run `npm run seed:amaya`; preview the scrape without writing to Supabase using `npm run seed:amaya -- --dry-run`. The script scrapes Amaya's public WooCommerce catalog, enriches qualifying audio, power and charger listings with detail-page descriptions, regular prices and direct product image URLs, then upserts by slug. It applies a KES 50 reduction to each scraped regular price. This storefront schema uses `image_path` (not `image_url`), so the CDN URL is written to `image_path` for the storefront. Do not put service-role keys in source files, browser configuration or version control.

## Data and access

- `categories`: names, slugs, ordering and active status.
- `products`: descriptions, category, unique slug/SKU, decimal price/currency, non-negative stock, image path, featured and active flags.
- `product-images` Storage bucket: public read; authenticated store-admin upload/update/delete.
- Public visitors can read active catalog records. Admin CRUD requires the trusted `app_metadata.role = admin` claim.

The included Node server serves the storefront and dynamic QR redirects. Supabase is the data/auth/storage backend, with RLS as the authorization boundary. Deploy as a Node web service on an HTTPS-capable host and configure the same Supabase Auth redirect origin in the Supabase project. QR records persist in Supabase across server restarts and deploys.
