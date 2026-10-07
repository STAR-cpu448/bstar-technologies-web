const { createHash } = require('node:crypto');

const SUPABASE_URL = 'https://mwnburzestcooeyyuwow.supabase.co';
const CATALOG_URL = 'https://amayakenya.com/?post_type=product';
const DISCOUNT_KES = 50;
const MAX_LISTING_PAGES = 20;
const REQUEST_CONCURRENCY = 4;

const categories = [
  {
    name: 'Amaya Audio',
    slug: 'amaya-audio',
    description: 'Amaya earbuds, headphones and audio accessories.',
    sort_order: 60,
  },
  {
    name: 'Amaya Power',
    slug: 'amaya-power',
    description: 'Amaya power banks and portable power products.',
    sort_order: 70,
  },
  {
    name: 'Amaya Chargers',
    slug: 'amaya-chargers',
    description: 'Amaya wall chargers, cables and car chargers.',
    sort_order: 80,
  },
];

const requestHeaders = {
  'User-Agent': 'BStarAmayaCatalogSeeder/1.0 (+catalog sync)',
  Accept: 'text/html,application/xhtml+xml',
};

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function slugify(value) {
  return value
    .toLocaleLowerCase('en')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeImageUrl(value, baseUrl) {
  if (!value) return null;
  try {
    const url = new URL(value, baseUrl);
    const isAmayaHost = url.hostname === 'amayakenya.com' || url.hostname.endsWith('.amayakenya.com');
    const isImageFile = /\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname);
    return url.protocol === 'https:' && isAmayaHost && isImageFile ? url.href : null;
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: requestHeaders });
  if (!response.ok) {
    throw new Error(`Amaya returned HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

async function validateImageUrl(imageUrl, productName) {
  const response = await fetch(imageUrl, { method: 'HEAD', headers: requestHeaders });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    throw new Error(`Amaya image URL is not a reachable image for ${productName}: ${imageUrl}`);
  }
}

function categoryForProduct($, card, name) {
  const classes = $(card).attr('class') || '';
  const searchable = `${classes} ${name}`.toLocaleLowerCase('en');
  if (/product_cat-(?:audio|earphones|headphones|wireless-earbuds)|earbud|headphone|headset|earphone/.test(searchable)) {
    return 'amaya-audio';
  }
  if (/product_cat-(?:power|power-banks)|power.?bank|power supply|portable power|battery pack/.test(searchable)) {
    return 'amaya-power';
  }
  if (/product_cat-(?:charger|chargers|wireless-charger|car-chargers|cables)|charg|cable|adapter/.test(searchable)) {
    return 'amaya-chargers';
  }
  return null;
}

function isAmayaProduct($, card) {
  const brandLink = $(card).find('a[href*="/product-brand/"]').filter((_, link) => (
    /\/product-brand\/amaya\/?$/i.test(new URL(link.attribs.href, CATALOG_URL).pathname)
  ));
  const brandText = $(card).find('.mf-product-brand, .product-brand, .posted_in').text();
  return brandLink.length > 0 || /\bbrand\s*:\s*amaya\b/i.test(brandText);
}

function highestResolutionImage($, card, baseUrl) {
  const image = $(card).find('img').first();
  const candidates = [
    image.attr('data-large_image'),
    image.attr('data-src'),
    image.attr('src'),
    ...String(image.attr('srcset') || '')
      .split(',')
      .map((candidate) => candidate.trim().split(/\s+/)[0])
      .reverse(),
  ];
  return candidates.map((candidate) => normalizeImageUrl(candidate, baseUrl)).find(Boolean) || null;
}

function regularPriceFrom($, element) {
  const delPrice = $(element).find('del .woocommerce-Price-amount, del .amount').first().text();
  const priceText = delPrice || $(element).find('.woocommerce-Price-amount, .amount').first().text() || $(element).text();
  const match = priceText.replace(/\u00a0/g, ' ').match(/(?:KSh|KES)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function stableProductIdentity(name, categorySlug) {
  const model = name.match(/\b[A-Z]{2,5}-[A-Z0-9]{2,12}(?:-[A-Z0-9]{1,12})*\b/i)?.[0];
  const categorySuffix = categorySlug === 'amaya-power'
    ? 'power-bank'
    : categorySlug === 'amaya-audio'
      ? (/headphone|headset/i.test(name) ? 'headphones' : 'wireless-earbuds')
      : (/cable/i.test(name) ? 'cable' : 'charger');
  const slug = model
    ? `amaya-${slugify(model)}-${categorySuffix}`
    : `amaya-${slugify(name)}`;
  return { slug, model };
}

function parseListingPage($, pageUrl) {
  const products = [];
  $('.mf-shop-content ul.products > li.product').each((_, card) => {
    if (!isAmayaProduct($, card)) return;

    const title = $(card).find('.woocommerce-loop-product__title, h2').first().text().trim();
    const link = $(card).find('a[href*="/product/"]').filter((__, anchor) => (
      /\/product\//.test(new URL(anchor.attribs.href, pageUrl).pathname)
    )).first();
    if (!title || !link.length) return;

    const category = categoryForProduct($, card, title);
    if (!category) return;

    const productUrl = new URL(link.attr('href'), pageUrl).href;
    products.push({
      name: title,
      url: productUrl,
      category,
      regularPrice: regularPriceFrom($, $(card).find('.price').first()),
      imageUrl: highestResolutionImage($, card, pageUrl),
    });
  });

  const pageLinks = $('.mf-shop-content .woocommerce-pagination a.page-numbers, .mf-shop-content .woocommerce-pagination a.next')
    .map((_, link) => new URL($(link).attr('href'), pageUrl).href)
    .get()
    .filter((href) => new URL(href).origin === new URL(CATALOG_URL).origin);

  return { products, pageLinks };
}

async function scrapeListings() {
  const pendingPages = [CATALOG_URL];
  const visitedPages = new Set();
  const productsByUrl = new Map();

  while (pendingPages.length && visitedPages.size < MAX_LISTING_PAGES) {
    const pageUrl = pendingPages.shift();
    if (visitedPages.has(pageUrl)) continue;
    visitedPages.add(pageUrl);

    const html = await fetchHtml(pageUrl);
    const { load } = await import('cheerio');
    const $ = load(html);
    const result = parseListingPage($, pageUrl);
    for (const product of result.products) productsByUrl.set(product.url, product);

    for (const nextPage of result.pageLinks) {
      if (!visitedPages.has(nextPage) && !pendingPages.includes(nextPage)) {
        pendingPages.push(nextPage);
      }
    }
  }

  if (pendingPages.length) {
    throw new Error(`Stopped after ${MAX_LISTING_PAGES} listing pages with more pages still linked.`);
  }
  return [...productsByUrl.values()];
}

async function enrichProduct(product) {
  const { load } = await import('cheerio');
  const html = await fetchHtml(product.url);
  const $ = load(html);

  const productTitle = $('.product_title, h1.entry-title').first().text().trim() || product.name;
  const descriptionHtml = $('.woocommerce-Tabs-panel--description, #tab-description').first().html()
    || $('.woocommerce-product-details__short-description').first().html()
    || '';
  const description = load(descriptionHtml).text().replace(/\s+/g, ' ').trim();
  const summary = $('.summary .price').first();
  const regularPrice = regularPriceFrom($, summary) || product.regularPrice;

  const galleryImage = $('.woocommerce-product-gallery__image img.wp-post-image, img.wp-post-image').first();
  const galleryCandidates = [
    galleryImage.attr('data-large_image'),
    galleryImage.attr('data-src'),
    galleryImage.attr('src'),
    ...String(galleryImage.attr('srcset') || '')
      .split(',')
      .map((candidate) => candidate.trim().split(/\s+/)[0])
      .reverse(),
  ];
  const imageUrl = galleryCandidates
    .map((candidate) => normalizeImageUrl(candidate, product.url))
    .find(Boolean) || product.imageUrl;

  if (!regularPrice || regularPrice <= DISCOUNT_KES) {
    throw new Error(`Could not find a valid regular KES price for ${productTitle} at ${product.url}`);
  }
  if (!imageUrl) throw new Error(`Could not find a valid image URL for ${productTitle} at ${product.url}`);
  await validateImageUrl(imageUrl, productTitle);

  const { slug, model } = stableProductIdentity(productTitle, product.category);
  return {
    name: productTitle,
    slug,
    model,
    productUrl: product.url,
    category: product.category,
    regularPrice,
    price: regularPrice - DISCOUNT_KES,
    description: `${description || productTitle}\n\nRegular price: KES ${regularPrice.toLocaleString('en-KE')}. Promotional price: KES ${(regularPrice - DISCOUNT_KES).toLocaleString('en-KE')} (KES ${DISCOUNT_KES} off).`,
    imageUrl,
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function assignUniqueIdentities(products) {
  const slugs = new Set();
  const skus = new Set();
  for (const product of products) {
    const baseSlug = product.slug;
    if (slugs.has(product.slug)) {
      const urlSlug = slugify(new URL(product.productUrl).pathname.split('/').filter(Boolean).pop() || product.name);
      product.slug = `${baseSlug}-${urlSlug.slice(-16)}`;
    }
    if (slugs.has(product.slug)) throw new Error(`Duplicate generated product slug: ${product.slug}`);

    const modelOrName = slugify(product.model || product.name).toLocaleUpperCase('en').slice(0, 64);
    const urlHash = createHash('sha256').update(product.productUrl).digest('hex').slice(0, 8).toLocaleUpperCase('en');
    product.sku = `AMY-${modelOrName}-${urlHash}`;
    if (skus.has(product.sku)) throw new Error(`Duplicate generated product SKU: ${product.sku}`);

    slugs.add(product.slug);
    skus.add(product.sku);
  }
}

async function main() {
  const listings = await scrapeListings();
  if (!listings.length) {
    throw new Error(`No Amaya audio, power or charger products were found at ${CATALOG_URL}`);
  }
  console.log(`Found ${listings.length} Amaya audio, power and charger listings.`);

  const scrapedProducts = await mapWithConcurrency(listings, REQUEST_CONCURRENCY, enrichProduct);
  assignUniqueIdentities(scrapedProducts);

  if (process.argv.includes('--dry-run')) {
    console.log(`Validated ${scrapedProducts.length} products with scraped prices and image URLs.`);
    for (const product of scrapedProducts) {
      console.log(`${product.name} | KES ${product.regularPrice} -> ${product.price} | ${product.imageUrl}`);
    }
    return;
  }

  const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categoryRows, error: categoryError } = await client
    .from('categories')
    .upsert(categories, { onConflict: 'slug' })
    .select('id,slug');
  if (categoryError) throw new Error(`Could not seed Amaya categories: ${categoryError.message}`);

  const categoryIds = new Map(categoryRows.map((category) => [category.slug, category.id]));
  const rows = scrapedProducts.map((product) => {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) throw new Error(`Supabase did not return category ${product.category}`);

    return {
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      category_id: categoryId,
      price: product.price,
      currency: 'KES',
      stock: 10,
      image_path: product.imageUrl,
      is_featured: false,
      is_active: true,
    };
  });

  for (let index = 0; index < rows.length; index += 100) {
    const { error } = await client
      .from('products')
      .upsert(rows.slice(index, index + 100), { onConflict: 'slug' });
    if (error) throw new Error(`Could not upsert Amaya products: ${error.message}`);
  }

  console.log(`Upserted ${categoryRows.length} categories and ${rows.length} Amaya products with images.`);
}

main().catch((error) => {
  console.error(`Amaya catalog scrape/seed failed: ${error.message}`);
  process.exitCode = 1;
});
