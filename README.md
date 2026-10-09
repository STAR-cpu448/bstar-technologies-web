# B-STAR TECHNOLOGIES

A responsive, dark-mode tech storefront with a sticky glass navbar, searchable/category-filtered catalog, local cart drawer, WhatsApp order handoff, and Supabase-backed admin dashboard.

The Digital Utilities & Tools section includes 21 browser-based utilities. PDFs and images are processed locally in the browser; only tool-payment submissions are sent to Supabase. Each tool unlock is KES 10 and requires manual M-Pesa verification by an administrator.

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

After deploying this feature, run the updated [`supabase-setup.sql`](./supabase-setup.sql) in the Supabase SQL Editor. It creates the public `qr-images` bucket and `dynamic_image_qrs` table, permits bounded anonymous image uploads and pending KES 99 QR submissions, and exposes only the image, status and expiry fields through the public `get_dynamic_image_qr` RPC. New QR URLs use an `IMG-XXXXXX` code and the `/img-qr/:code` path. The Node server renders active hosted images with a Save Image button, pending-payment instructions, and branded not-found/expired pages. It validates that viewer image URLs belong to the configured Supabase Storage bucket. Existing `dynamic_qr_codes` rows are copied forward with their status and expiry preserved; historical rows have no M-Pesa code recorded. Legacy `/qr/:code`, `/r/:code`, and `#q=CODE` links remain supported.

Customers submit a JPG, PNG or WebP image (up to 5 MB), their phone number, and M-Pesa confirmation code with the KES 99/month request. Verify payment manually, then use the authenticated Store dashboard's **Image QR Activations** tab to activate the code for 30 days. Activation opens a prefilled WhatsApp notification to the customer; if the browser blocks the popup, use the notification link on the active row. Payment collection and confirmation are not automated.

The viewer checks status and expiry server-side. Pending requests show payment instructions; only active, unexpired codes display their hosted image.

Digital Utilities access is purchased per tool. Customers submit their phone number and M-Pesa transaction code for KES 10; submissions remain `pending_approval` until an administrator verifies payment and selects **Enable Service** in the Store dashboard's Tool Subscriptions tab. The browser calls the `has_active_tool_subscription` RPC to check access; it does not trust a client-set active flag. The RPC returns only a boolean, while subscription records are visible/manageable only to store administrators. Payment verification and M-Pesa collection are manual; the browser does not initiate or confirm payments.

Public bucket images can be accessed by anyone who has the URL, and this static frontend has no upload rate limiter; configure additional abuse protection before promoting the upload form widely.

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
