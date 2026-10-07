const DISCOUNT_KES = 100;
const BATCH_SIZE = 100;

const categories = [
  {
    name: 'ORAIMO True Wireless Earbuds',
    slug: 'oraimo-true-wireless-earbuds',
    description: 'Official ORAIMO SpaceBuds and AirBuds true wireless earbuds.',
    sort_order: 10,
  },
  {
    name: 'ORAIMO Headphones',
    slug: 'oraimo-headphones',
    description: 'Official ORAIMO BoomPop wireless over-ear headphones.',
    sort_order: 20,
  },
  {
    name: 'ORAIMO Power Banks',
    slug: 'oraimo-power-banks',
    description: 'Official ORAIMO portable power banks in multiple capacities.',
    sort_order: 30,
  },
  {
    name: 'ORAIMO Chargers',
    slug: 'oraimo-chargers',
    description: 'Official ORAIMO wall chargers, charging kits and travel adapters.',
    sort_order: 40,
  },
  {
    name: 'ORAIMO Smart Watches',
    slug: 'oraimo-smart-watches',
    description: 'Official ORAIMO smart watches with health and activity features.',
    sort_order: 50,
  },
];

const products = [
  {
    name: 'ORAIMO SpaceBuds Neo',
    slug: 'oraimo-spacebuds-neo',
    sku: 'ORAIMO-OTW-323',
    category: 'oraimo-true-wireless-earbuds',
    referencePrice: 2400,
    image: 'https://cdn-img.oraimo.com/GH/product/2025/01/09/spacebuds-neo-otw-323.png',
    description: 'True wireless spatial-audio earbuds for everyday listening and calls. Model OTW-323. Compact charging case, Bluetooth wireless connection and a comfortable in-ear fit. Check the linked official product listing for current supported codecs, play time and in-box accessories.',
  },
  {
    name: 'ORAIMO SpaceBuds Lite',
    slug: 'oraimo-spacebuds-lite',
    sku: 'ORAIMO-OTW-324',
    category: 'oraimo-true-wireless-earbuds',
    referencePrice: 1900,
    image: 'https://cdn-img.oraimo.com/KE/product/2025/08/14/OTW-324-1080-b.png',
    description: 'Lightweight true wireless earbuds designed for portable listening, calls and daily commutes. Model OTW-324. Includes a pocket-sized charging case and independent left/right earbuds. Confirm device compatibility and battery duration on the official product page.',
  },
  {
    name: 'ORAIMO SpaceBuds N',
    slug: 'oraimo-spacebuds-n',
    sku: 'ORAIMO-OTW-626N',
    category: 'oraimo-true-wireless-earbuds',
    referencePrice: 3000,
    image: 'https://cdn-img.oraimo.com/KE/product/2024/12/20/OTW-626N-2.png',
    description: 'True wireless earbuds with active noise cancellation and up to 38 hours of stated total play time with the charging case. Model OTW-626N. Designed for immersive listening and clearer calls; actual battery life varies with volume, ANC use and connection conditions.',
  },
  {
    name: 'ORAIMO SpaceBuds Neo+',
    slug: 'oraimo-spacebuds-neo-plus',
    sku: 'ORAIMO-OTW-323P',
    category: 'oraimo-true-wireless-earbuds',
    referencePrice: 3500,
    image: 'https://cdn-img.oraimo.com/GH/product/2025/05/09/wireless-earphones-spacebuds-neo-plus-otw-323p-black.png',
    description: 'Spatial-audio true wireless earbuds with active noise cancellation. Model OTW-323P. Built for wireless music and hands-free calling with a compact charging case. Use the official listing to confirm supported controls, battery performance and included accessories.',
  },
  {
    name: 'ORAIMO AirBuds 4',
    slug: 'oraimo-airbuds-4',
    sku: 'ORAIMO-OTW-340',
    category: 'oraimo-true-wireless-earbuds',
    referencePrice: 1500,
    image: 'https://cdn-img.oraimo.com/AE/product/2024/02/06/OTW-340-680-1.png',
    description: 'True wireless earbuds featuring an LED case display, up to 36 hours of stated total play time and ENC call-noise reduction. Model OTW-340. Suitable for music, video and everyday calls; play time depends on usage and volume.',
  },
  {
    name: 'ORAIMO SpaceBuds Air+',
    slug: 'oraimo-spacebuds-air-plus',
    sku: 'ORAIMO-OTW-323SP',
    category: 'oraimo-true-wireless-earbuds',
    referencePrice: 3000,
    image: 'https://cdn-img.oraimo.com/MA/product/2025/10/11/OTW-323SP-Total.png',
    description: 'Metallic-finish true wireless earbuds with an IPX4-rated design for everyday splash resistance. Model OTW-323SP. Compact case, wireless listening and hands-free calling in a portable form factor. Not intended for swimming or submersion.',
  },
  {
    name: 'ORAIMO BoomPop N',
    slug: 'oraimo-boompop-n',
    sku: 'ORAIMO-OHP-915N',
    category: 'oraimo-headphones',
    referencePrice: 4000,
    image: 'https://cdn-img.oraimo.com/GH/product/2025/07/14/oraimo-Wireless-Headphones-BoomPop-N-OHP-915N-0.png',
    description: 'Wireless over-ear headphones from the BoomPop range, designed for immersive personal listening and everyday calls. Model OHP-915N. Padded earcups and a foldable-style portable form factor; check the official listing for exact battery life, Bluetooth version and charging details.',
  },
  {
    name: 'ORAIMO BoomPop Lite',
    slug: 'oraimo-boompop-lite',
    sku: 'ORAIMO-OHP-317',
    category: 'oraimo-headphones',
    referencePrice: 2500,
    image: 'https://cdn-img.oraimo.com/NG/product/2025/01/08/OHP-317-GREY.png',
    description: 'Lightweight wireless over-ear headphones with ENC and up to 65 hours of stated play time. Model OHP-317. Built for long listening sessions, commuting and wireless calls. Battery duration varies by volume and connection conditions.',
  },
  {
    name: 'ORAIMO BoomPop Pro',
    slug: 'oraimo-boompop-pro',
    sku: 'ORAIMO-OHP-917',
    category: 'oraimo-headphones',
    referencePrice: 6000,
    image: 'https://cdn-img.oraimo.com/PK/product/2025/05/20/oraimo-BoomPop-Pro-OHP-917-wireless-headphones-GREY.png',
    description: 'Wireless over-ear headphones with hybrid noise cancellation and swipe controls. Model OHP-917. Designed to reduce surrounding noise while listening or taking calls. Check the official product listing for ANC modes, battery specifications and supported controls.',
  },
  {
    name: 'ORAIMO BoomPop 2',
    slug: 'oraimo-boompop-2',
    sku: 'ORAIMO-OHP-610',
    category: 'oraimo-headphones',
    referencePrice: 2600,
    image: 'https://cdn-img.oraimo.com/NG/album/ohp-610/ohp-610-black.png',
    description: 'Wireless headset with powerful deep bass and dual-device connectivity. Model OHP-610. Connect compatible devices over Bluetooth and switch between paired devices for music and calls. Check the official listing for battery life and charging specifications.',
  },
  {
    name: 'ORAIMO BoomPop Air',
    slug: 'oraimo-boompop-air',
    sku: 'ORAIMO-OHP-316',
    category: 'oraimo-headphones',
    referencePrice: 3000,
    image: 'https://cdn-img.oraimo.com/KE/product/2026/04/13/oraimo-Headphone-BoomPop-Air-OHP-316-GRAVITYBLACK-mainimage.png',
    description: 'Lightweight wireless over-ear headphones in the BoomPop family. Model OHP-316. A portable option for everyday music, video and calls. Refer to the official product page for verified battery, driver and charging specifications.',
  },
  {
    name: 'ORAIMO Traveler 12 Byte 20,000mAh Power Bank',
    slug: 'oraimo-traveler-12-byte-20000mah',
    sku: 'ORAIMO-OPB-1205N',
    category: 'oraimo-power-banks',
    referencePrice: 3000,
    image: 'https://cdn-img.oraimo.com/KE/product/2024/09/03/OPB-1205N.png',
    description: 'Portable 20,000mAh power bank with 12W charging. Model OPB-1205N. A high-capacity option for topping up phones and other compatible USB devices while travelling. Actual usable capacity and charge time vary by device, cable and operating conditions.',
  },
  {
    name: 'ORAIMO MagPower 15 10,000mAh Power Bank',
    slug: 'oraimo-magpower-15-10000mah',
    sku: 'ORAIMO-OPB-7102W',
    category: 'oraimo-power-banks',
    referencePrice: 3500,
    image: 'https://cdn-img.oraimo.com/GH/product/2025/01/09/magpower-15-opb-7102w-1.png',
    description: '10,000mAh portable power bank supporting wireless and wired charging. Model OPB-7102W. Provides flexible charging for compatible phones and USB devices; wireless charging requires a compatible device and correct alignment.',
  },
  {
    name: 'ORAIMO Slice Link 10,000mAh Power Bank',
    slug: 'oraimo-slice-link-10000mah',
    sku: 'ORAIMO-OPB-P5101',
    category: 'oraimo-power-banks',
    referencePrice: 2000,
    image: 'https://cdn-img.oraimo.com/NG/album/opb-p5101/opb-p5101-black.png',
    description: 'Slim 10,000mAh, 12W power bank with built-in Lightning, USB-C and Micro-USB cables. Model OPB-P5101. Integrated cables reduce the need to carry separate leads; output and recharge times depend on the connected device.',
  },
  {
    name: 'ORAIMO PowerNova Q21 20,000mAh Power Bank',
    slug: 'oraimo-powernova-q21-20000mah',
    sku: 'ORAIMO-OPB-7200Q',
    category: 'oraimo-power-banks',
    referencePrice: 2500,
    image: 'https://cdn-img.oraimo.com/GH/product/2025/07/03/oraimo-power-bank-powernova-q21-opb-7200q.png',
    description: '20,000mAh portable battery in the PowerNova range. Model OPB-7200Q. Designed for multiple device top-ups between wall charges. Use a compatible cable and adapter; actual delivered capacity is lower than nominal cell capacity due to conversion losses.',
  },
  {
    name: 'ORAIMO PowerNova QF1 27,000mAh 22.5W Power Bank',
    slug: 'oraimo-powernova-qf1-27000mah',
    sku: 'ORAIMO-OPB-7270Q',
    category: 'oraimo-power-banks',
    referencePrice: 3500,
    image: 'https://cdn-img.oraimo.com/GH/product/2025/07/11/oraimo-power-bank-powernova-qf1-opb-7270q-0.png',
    description: '27,000mAh high-capacity power bank with up to 22.5W fast charging. Model OPB-7270Q. Suitable for extended trips and charging compatible phones or USB devices. Fast-charge speed depends on the device, cable and selected output port.',
  },
  {
    name: 'ORAIMO PowerNova L11 10,000mAh 22.5W Power Bank',
    slug: 'oraimo-powernova-l11-10000mah',
    sku: 'ORAIMO-OPB-7103C',
    category: 'oraimo-power-banks',
    referencePrice: 2000,
    image: 'https://cdn-img.oraimo.com/CM/product/2026/01/05/OPB-7103C-BLUE.png',
    description: '10,000mAh power bank with up to 22.5W fast charging and USB-C. Model OPB-7103C. A compact capacity for daily carry and compatible fast-charge devices. Supported charging rates depend on device and cable.',
  },
  {
    name: 'ORAIMO PowerJet 130 27,600mAh 130W Power Bank',
    slug: 'oraimo-powerjet-130-27600mah',
    sku: 'ORAIMO-OPB-727SQ',
    category: 'oraimo-power-banks',
    referencePrice: 12000,
    image: 'https://cdn-img.oraimo.com/NG/product/2024/08/14/OPB-727SQ.png',
    description: '27,600mAh high-output power bank with a smart display and up to 130W fast charging for compatible laptops and phones. Model OPB-727SQ. Actual output is shared across ports and depends on the attached device and cable.',
  },
  {
    name: 'ORAIMO Toast 22.5 Byte 10,000mAh Power Bank',
    slug: 'oraimo-toast-22-5-byte-10000mah',
    sku: 'ORAIMO-OPB-7100Q',
    category: 'oraimo-power-banks',
    referencePrice: 2000,
    image: 'https://cdn-img.oraimo.com/KE/product/2024/11/27/OPB-7100Q-2.png',
    description: '10,000mAh portable power bank with up to 22.5W charging. Model OPB-7100Q. Designed for convenient phone top-ups on the move. Fast charging requires a compatible phone, cable and output port.',
  },
  {
    name: 'ORAIMO PowerNova L21 20,000mAh 30W Power Bank',
    slug: 'oraimo-powernova-l21-20000mah',
    sku: 'ORAIMO-OPB-7203C',
    category: 'oraimo-power-banks',
    referencePrice: 3500,
    image: 'https://cdn-img.oraimo.com/EG/product/2026/02/02/OPB-7203C-GRAPHITEBLACK.png',
    description: '20,000mAh power bank with up to 30W fast charging. Model OPB-7203C. A balanced high-capacity option for phones and compatible USB-C devices. Charging protocols, output and recharge speed depend on device compatibility.',
  },
  {
    name: 'ORAIMO PowerCube 201 Charger Kit',
    slug: 'oraimo-powercube-201-charger-kit',
    sku: 'ORAIMO-OCW-5203U',
    category: 'oraimo-chargers',
    referencePrice: 1500,
    image: 'https://cdn-img.oraimo.com/GH/product/2025/10/11/oraimo-uk-type-plug-pd3.0-and-qc3.0-compatible-charger-kit-powercube-201-ocw-5203ucl-image.png',
    description: 'UK-plug charger kit compatible with USB Power Delivery 3.0 and Quick Charge 3.0. Model OCW-5203U. Supports compatible devices and charging cables; maximum charging speed is limited by the device and cable.',
  },
  {
    name: 'ORAIMO PowerOmni 251 Travel Adapter',
    slug: 'oraimo-poweromni-251-travel-adapter',
    sku: 'ORAIMO-OCW-T01',
    category: 'oraimo-chargers',
    referencePrice: 3000,
    image: 'https://cdn-img.oraimo.com/GH/product/2025/07/14/oraimo-travel-adapter-PowerOmni-251-OCW-T01-Black.png',
    description: 'Travel adapter with up to 2,500W high-power output for compatible appliances. Model OCW-T01. Check plug compatibility and appliance voltage requirements before use; the stated power rating is not a USB charging wattage.',
  },
  {
    name: 'ORAIMO PowerCube 202 20W Charger Kit',
    slug: 'oraimo-powercube-202-20w-charger-kit',
    sku: 'ORAIMO-OCW-5202U',
    category: 'oraimo-chargers',
    referencePrice: 1400,
    image: 'https://cdn-img.oraimo.com/NG/product/2025/09/30/oraimo-uk-type-20w-compatible-charger-kit-powercube-202-ocw-5202u-image-white-ucc.png',
    description: 'UK-type 20W charger kit for compatible phones and USB-C devices. Model OCW-5202U. Portable wall charger for home, office and travel; charging speed depends on the connected device and cable.',
  },
  {
    name: 'ORAIMO PowerMate 101 10W Portable Charger',
    slug: 'oraimo-powermate-101-10w-charger',
    sku: 'ORAIMO-OCW-1112UM',
    category: 'oraimo-chargers',
    referencePrice: 800,
    image: 'https://cdn-img.oraimo.com/NG/product/2025/11/21/OCW-1112UM.png',
    description: 'Compact 10W portable wall charger. Model OCW-1112UM. A straightforward option for compatible phones and accessories using a suitable USB cable. Charging rate is limited by the connected device.',
  },
  {
    name: 'ORAIMO HyperGaN 701 70W Charger',
    slug: 'oraimo-hypergan-701-70w-charger',
    sku: 'ORAIMO-OCW-5701U',
    category: 'oraimo-chargers',
    referencePrice: 6500,
    image: 'https://cdn-img.oraimo.com/MZ/product/2026/09/17/OCW-5701-UK-W.png',
    description: '70W all-in-one GaN charger for compatible phones, tablets and laptops. Model OCW-5701U. GaN charging hardware delivers high output in a compact form; device charging profiles and included cables determine the usable speed.',
  },
  {
    name: 'ORAIMO PowerGaN 252 Fast Charger Kit',
    slug: 'oraimo-powergan-252-fast-charger-kit',
    sku: 'ORAIMO-OCW-5253UCC',
    category: 'oraimo-chargers',
    referencePrice: 2500,
    image: 'https://cdn-img.oraimo.com/KE/product/2026/09/18/OCW-5253UCC-GREY-MAIN.png',
    description: 'Compact GaN fast charger kit for compatible USB-C devices. Model OCW-5253UCC. Designed for efficient everyday charging in a portable wall-plug format. Verify the exact output profiles and included cable on the official listing.',
  },
  {
    name: 'ORAIMO PowerCube 20 20W PD Charger Kit',
    slug: 'oraimo-powercube-20-20w-pd-charger-kit',
    sku: 'ORAIMO-OCW-U160S-C55',
    category: 'oraimo-chargers',
    referencePrice: 1500,
    image: 'https://cdn-img.oraimo.com/KE/product/2026/06/24/OCW-U160S-C55-1080-A1.png',
    description: '20W USB Power Delivery wall charger kit with USB-C-to-USB-C cable. A compact everyday charger for compatible phones and accessories. Maximum speed depends on the connected device and charging protocol.',
  },
  {
    name: 'ORAIMO Watch 6N Smart Watch',
    slug: 'oraimo-watch-6n',
    sku: 'ORAIMO-OSW-8000N',
    category: 'oraimo-smart-watches',
    referencePrice: 1800,
    image: 'https://cdn-img.oraimo.com/NG/product/2025/09/16/oraimo-smart-watch-watch-6n-osw-8000n-image-0.png',
    description: 'Smart watch with a 1.83-inch full-touch colour display, AI-generated watch faces, anti-scratch Panda Glass, IP68 water resistance and blood-oxygen and heart-rate monitoring. Model OSW-8000N. Health readings are for general wellness and are not medical advice.',
  },
  {
    name: 'ORAIMO Watch Muse AMOLED Smart Watch',
    slug: 'oraimo-watch-muse-amoled',
    sku: 'ORAIMO-OSW-831N',
    category: 'oraimo-smart-watches',
    referencePrice: 4500,
    image: 'https://cdn-img.oraimo.com/KE/product/2025/05/23/oraimo-watch-muse-OSW-831N-4.png',
    description: 'Smart watch with a 1.32-inch AMOLED display and health and activity features. Model OSW-831N. Designed for everyday notifications, fitness tracking and customisable watch faces. Health metrics are estimates and are not a substitute for clinical measurements.',
  },
  {
    name: 'ORAIMO Watch 5 Lite IP68 Smart Watch',
    slug: 'oraimo-watch-5-lite',
    sku: 'ORAIMO-OSW-804',
    category: 'oraimo-smart-watches',
    referencePrice: 2000,
    image: 'https://cdn-img.oraimo.com/GH/product/2025/01/09/watch-5-lite-osw-804.png',
    description: 'IP68-rated smart watch with an HD display for everyday activity tracking and notifications. Model OSW-804. Water resistance has limits and may be affected by wear or damage; avoid hot water and follow the official care guidance.',
  },
  {
    name: 'ORAIMO Watch Nova 2N AMOLED Smart Watch',
    slug: 'oraimo-watch-nova-2n',
    sku: 'ORAIMO-OSW-815N',
    category: 'oraimo-smart-watches',
    referencePrice: 6000,
    image: 'https://cdn-img.oraimo.com/MA/product/2026/03/06/OSW-815N-CHROME.png',
    description: 'Smart watch with a 1.93-inch AMOLED display and up to 33 days of stated standby time. Model OSW-815N. Built for notifications, daily activity and health tracking. Standby duration varies with settings and use; sensor readings are estimates.',
  },
  {
    name: 'ORAIMO Watch Nova 2R Lite AMOLED Smart Watch',
    slug: 'oraimo-watch-nova-2r-lite',
    sku: 'ORAIMO-OSW-824',
    category: 'oraimo-smart-watches',
    referencePrice: 4500,
    image: 'https://cdn-img.oraimo.com/MA/product/2026/03/09/OSW-824-GRAPHITEBLACK.png',
    description: 'Smart watch featuring a 1.43-inch AMOLED display and up to 30 days of stated standby time. Model OSW-824. Designed for daily notifications, activity tracking and customisation. Actual standby time depends on settings and usage.',
  },
  {
    name: 'ORAIMO Watch 6 Nano Smart Watch',
    slug: 'oraimo-watch-6-nano',
    sku: 'ORAIMO-OSW-807N',
    category: 'oraimo-smart-watches',
    referencePrice: 2500,
    image: 'https://cdn-img.oraimo.com/MA/product/2026/03/11/OSW-807N-Orange.png',
    description: 'Smart watch with a 1.52-inch TFT full-touch display. Model OSW-807N. A compact wearable for everyday notifications and activity tracking. Check the official listing for exact battery life, water-resistance rating and supported phone app.',
  },
  {
    name: 'ORAIMO Watch 6R Anti-Scratch Smart Watch',
    slug: 'oraimo-watch-6r',
    sku: 'ORAIMO-OSW-823',
    category: 'oraimo-smart-watches',
    referencePrice: 3000,
    image: 'https://cdn-img.oraimo.com/GH/product/2025/10/20/oraimo-anti-scratch-smart-watch-watch-6r-osw-823-image.png',
    description: 'Smart watch with an anti-scratch design for daily wear. Model OSW-823. Supports connected wearable features such as notifications and activity tracking; check the official listing for display, sensors, battery and water-resistance specifications.',
  },
  {
    name: 'ORAIMO Watch 6 Pro Smart Watch',
    slug: 'oraimo-watch-6-pro',
    sku: 'ORAIMO-OSW-807S',
    category: 'oraimo-smart-watches',
    referencePrice: 4000,
    image: 'https://cdn-img.oraimo.com/CI/product/2025/09/23/oraimo-Smart-Watch-Watch-6-Pro-OSW-807S.png',
    description: 'Smart watch with AI-generated watch faces and connected activity features. Model OSW-807S. Customise the display and receive supported phone notifications; feature availability depends on the paired phone and companion app.',
  },
];

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validateCatalog() {
  const slugs = new Set();
  const skus = new Set();
  const categorySlugs = new Set(categories.map((category) => category.slug));

  for (const product of products) {
    if (slugs.has(product.slug)) throw new Error(`Duplicate product slug: ${product.slug}`);
    if (skus.has(product.sku)) throw new Error(`Duplicate product SKU: ${product.sku}`);
    if (!categorySlugs.has(product.category)) throw new Error(`Unknown category for ${product.slug}`);
    if (!Number.isInteger(product.referencePrice) || product.referencePrice <= DISCOUNT_KES) {
      throw new Error(`Invalid reference price for ${product.slug}`);
    }
    if (!product.image.startsWith('https://cdn-img.oraimo.com/')) {
      throw new Error(`Expected an official ORAIMO CDN image URL for ${product.slug}`);
    }
    slugs.add(product.slug);
    skus.add(product.sku);
  }
}

async function upsertInBatches(table, rows, onConflict) {
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    const { error } = await client
      .from(table)
      .upsert(batch, { onConflict });
    if (error) throw new Error(`Could not seed ${table}: ${error.message}`);
  }
}

async function main() {
  validateCatalog();

  if (process.argv.includes('--dry-run')) {
    console.log(`Validated ${categories.length} categories and ${products.length} unique products.`);
    console.log(`Every product price is exactly KES ${DISCOUNT_KES} below its reference price.`);
    return;
  }

  const supabaseUrl = requiredEnvironment('SUPABASE_URL');
  const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');
  const { createClient } = await import('@supabase/supabase-js');
  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categoryRows, error: categoryError } = await client
    .from('categories')
    .upsert(categories, { onConflict: 'slug' })
    .select('id,slug');
  if (categoryError) throw new Error(`Could not seed categories: ${categoryError.message}`);

  const categoryIds = new Map(categoryRows.map((category) => [category.slug, category.id]));
  const rows = products.map((product) => {
    const { referencePrice, image, category, ...item } = product;
    const price = referencePrice - DISCOUNT_KES;
    const description = `${item.description}\n\nB-STAR reference price: KES ${referencePrice.toLocaleString('en-KE')}. Promotional price: KES ${price.toLocaleString('en-KE')} (KES ${DISCOUNT_KES} off).`;
    const categoryId = categoryIds.get(category);
    if (!categoryId) throw new Error(`Supabase did not return the seeded category ${category}`);

    return {
      ...item,
      category_id: categoryId,
      description,
      price,
      currency: 'KES',
      stock: 10,
      image_path: image,
      is_featured: false,
      is_active: true,
    };
  });

  await upsertInBatches('products', rows, 'slug');
  console.log(`Seeded ${categoryRows.length} categories and ${rows.length} ORAIMO products.`);
}

let client;

main().catch((error) => {
  console.error(`ORAIMO catalog seed failed: ${error.message}`);
  process.exitCode = 1;
});
