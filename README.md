# B-STAR TECHNOLOGIES

A responsive, dark-mode tech storefront with a sticky glass navbar, searchable/category-filtered catalog, local cart drawer, WhatsApp order handoff, and Supabase-backed admin dashboard.

## Run locally

Requires Node.js 18.17 or newer.

```powershell
npm.cmd start
```

Open <http://127.0.0.1:3000>.

## Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase-setup.sql`](./supabase-setup.sql). It creates the product, category and dynamic QR tables, constraints/indexes, public product/QR image buckets, and row/storage policies.
3. Set the project URL and **public anon key** in [`supabase-config.js`](./supabase-config.js). These browser values are not secrets. Never put a service-role key in this file.
4. Optionally set the store currency (an ISO 4217 code, default `KES`) and WhatsApp number in international format without `+`, such as `2547XXXXXXXX`.
5. Enable email/password sign-in in Supabase Auth and create an administrator account. Set the trusted `app_metadata` claim `role: "admin"` using the Supabase Dashboard or a trusted Admin API operation. Never set admin claims from browser/user-editable metadata.
6. Open the shield icon on desktop to sign in. Create categories first, then add products with a JPEG, PNG, or WebP image (maximum 5 MB). Admin writes are enforced by database and Storage RLS, not by hiding the dashboard.

The storefront reads only active products in active categories. The cart persists in the current browser and checks the latest loaded stock. Checkout opens a WhatsApp message with the cart summary; availability, delivery, and payment are confirmed with the business. No payment processing or order database is configured.

### Dynamic image QR codes

After deploying this feature, run the updated [`supabase-setup.sql`](./supabase-setup.sql) in the Supabase SQL Editor. It creates the public `qr-images` bucket and `dynamic_qr_codes` table, permits bounded anonymous image uploads and pending KES 99 QR submissions, and exposes only the image, status and expiry fields through the public `get_dynamic_qr_code` RPC. The storefront QR flow stores image URLs in the `image_url` field of this separate table; product images continue to use `products.image_path`.

Customers can create pending QR codes, but payment is not processed automatically. Verify payment through WhatsApp, then use the authenticated Store dashboard's Dynamic QR Codes tab to activate, renew or expire the code and copy an activation confirmation. For manual database activation, set the row to `active` and `expires_at` to its paid-through timestamp in the Supabase SQL Editor, for example:

```sql
update public.dynamic_qr_codes
set status = 'active', expires_at = now() + interval '1 month'
where short_code = 'B8K29Z';
```

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

The included Node server only serves static assets for local development. Supabase is the data/auth/storage backend, with RLS as the authorization boundary. Deploy the static site using any HTTPS-capable static host or Node host; configure the same Supabase Auth redirect origin in the Supabase project.
