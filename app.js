const CART_STORAGE_KEY = 'bstar-cart-v1';
const DYNAMIC_QR_ORDER_STORAGE_KEY = 'bstar-dynamic-qr-order-v1';
const IMAGE_BUCKET = 'product-images';
const QR_IMAGE_BUCKET = 'qr-images';
const QR_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const QR_APPROVAL_POLL_INTERVAL = 3500;
const QR_WHATSAPP_NUMBER = '254742562742';
let supabaseSdkPromise;
let storeClient;
let qrPreviewUrl;
let generatedQrCode;
let qrApprovalPollCode;
let qrApprovalPollTimer;
let adminQrCodes = [];
let products = [];
let categories = [];
let activeCategory = 'all';
let cart = readCart();

const currency = window.BSTAR_CONFIG?.currency || 'KES';
const money = new Intl.NumberFormat(undefined, { style: 'currency', currency });

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.error('Could not read the saved cart:', error);
    return {};
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function loadSupabaseSdk() {
  if (window.supabase?.createClient) return Promise.resolve(window.supabase);
  if (!supabaseSdkPromise) {
    supabaseSdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => window.supabase?.createClient
        ? resolve(window.supabase)
        : reject(new Error('Supabase client did not initialize.'));
      script.onerror = () => reject(new Error('Could not load the Supabase client library.'));
      document.head.append(script);
    });
  }
  return supabaseSdkPromise;
}

async function getStoreClient() {
  if (storeClient) return storeClient;
  const config = window.BSTAR_CONFIG;
  if (!config?.url || !config?.anonKey || config.url.includes('YOUR_') || config.anonKey.includes('YOUR_')) {
    throw new Error('Set your Supabase project URL and public anon key in supabase-config.js.');
  }
  const sdk = await loadSupabaseSdk();
  storeClient = sdk.createClient(config.url, config.anonKey);
  return storeClient;
}

window.BSTAR_APP = Object.freeze({ getStoreClient });

function publicImageUrl(imagePath) {
  if (!imagePath) return '';
  if (/^https:\/\//i.test(imagePath)) return imagePath;
  const { data } = storeClient.storage.from(IMAGE_BUCKET).getPublicUrl(imagePath);
  return data.publicUrl;
}

function setQrStatus(message, state) {
  const status = document.getElementById('qr-status');
  status.textContent = message;
  status.dataset.state = state || '';
  status.hidden = !message;
}

function selectedQrImage() {
  const file = document.getElementById('qr-image-file').files[0];
  if (!file) return null;
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    setQrStatus('Choose a JPG, PNG or WebP image.', 'error');
    return null;
  }
  if (file.size > QR_IMAGE_MAX_SIZE) {
    setQrStatus('Choose an image no larger than 5 MB.', 'error');
    return null;
  }
  setQrStatus('', '');
  return file;
}

function showQrImagePreview(file) {
  if (qrPreviewUrl) URL.revokeObjectURL(qrPreviewUrl);
  const preview = document.getElementById('qr-image-preview');
  const fileName = document.getElementById('qr-file-name');
  const dropzone = document.getElementById('qr-dropzone');
  if (!file) {
    preview.removeAttribute('src');
    preview.hidden = true;
    fileName.hidden = true;
    dropzone.classList.remove('has-preview');
    return;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > QR_IMAGE_MAX_SIZE) {
    showQrImagePreview(null);
    selectedQrImage();
    return;
  }
  qrPreviewUrl = URL.createObjectURL(file);
  preview.src = qrPreviewUrl;
  preview.hidden = false;
  fileName.textContent = file.name;
  fileName.hidden = false;
  dropzone.classList.add('has-preview');
  setQrStatus('', '');
}

function setQrFile(file) {
  const fileInput = document.getElementById('qr-image-file');
  const transfer = new DataTransfer();
  if (file) transfer.items.add(file);
  fileInput.files = transfer.files;
  showQrImagePreview(file);
}

function createQrShortCode() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomValues = new Uint8Array(6);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (value) => alphabet[value % alphabet.length]).join('');
}

function qrPhoneForWhatsApp(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  return digits;
}

function dynamicQrLink(code) {
  return `${window.location.origin}/img-qr/${encodeURIComponent(code)}`;
}

function redirectLegacyQrHash() {
  const match = window.location.hash.match(/^#q=([^&]*)/i);
  if (!match) return;
  const code = match[1].toUpperCase();
  window.location.replace(`${window.location.origin}/qr/${encodeURIComponent(code)}`);
}

function qrImagePath(file) {
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const nameWithoutExtension = file.name.replace(/\.[^.]*$/, '');
  const safeName = nameWithoutExtension.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^\.+/, '').slice(-100) || 'image';
  return `uploads/${Date.now()}-${crypto.randomUUID()}-${safeName}.${extensions[file.type]}`;
}

function renderGeneratedQr(code) {
  if (typeof window.QRCode !== 'function') {
    throw new Error('QR code generator did not load. Refresh the page and try again.');
  }
  const output = document.getElementById('qr-code-output');
  output.replaceChildren();
  new window.QRCode(output, {
    text: dynamicQrLink(code),
    width: 220,
    height: 220,
    colorDark: '#080b12',
    colorLight: '#ffffff',
    correctLevel: window.QRCode.CorrectLevel.H,
  });
}

function showQrOrder(code) {
  generatedQrCode = code;
  const output = document.getElementById('qr-code-output');
  output.replaceChildren();
  output.hidden = true;
  document.getElementById('qr-download-button').hidden = true;
  document.getElementById('qr-active-state').hidden = true;
  document.getElementById('qr-pending-state').hidden = false;
  document.getElementById('qr-success-title').textContent = `Order Submitted (Code: ${code})`;
  const status = document.getElementById('qr-success-status');
  status.textContent = 'Awaiting Admin Activation (KES 99)';
  status.dataset.state = '';
  document.querySelector('#qr-pending-state .qr-pending-loader').hidden = false;
  document.getElementById('qr-approval-message').textContent = 'Checking payment approval…';
  document.getElementById('qr-approval-message').dataset.state = '';
  document.getElementById('qr-success-code').textContent = '';
  const linkElement = document.getElementById('qr-success-link');
  linkElement.removeAttribute('href');
  linkElement.textContent = '';
  document.getElementById('qr-success-dialog').showModal();
}

function showActivatedQr(code) {
  generatedQrCode = code;
  renderGeneratedQr(code);
  const link = dynamicQrLink(code);
  const title = document.getElementById('qr-success-title');
  title.textContent = 'Your QR code is ready!';
  document.getElementById('qr-success-status').textContent = 'Payment approved · Active for 30 days';
  document.getElementById('qr-success-status').dataset.state = 'active';
  document.getElementById('qr-success-code').textContent = code;
  const linkElement = document.getElementById('qr-success-link');
  linkElement.href = link;
  linkElement.textContent = link;
  const output = document.getElementById('qr-code-output');
  output.hidden = false;
  document.getElementById('qr-pending-state').hidden = true;
  const activeState = document.getElementById('qr-active-state');
  activeState.hidden = false;
  activeState.classList.remove('is-revealed');
  void activeState.offsetWidth;
  activeState.classList.add('is-revealed');
  document.getElementById('qr-download-button').hidden = false;
  const dialog = document.getElementById('qr-success-dialog');
  if (!dialog.open) dialog.showModal();
}

function stopQrApprovalPolling() {
  if (qrApprovalPollTimer) window.clearTimeout(qrApprovalPollTimer);
  qrApprovalPollTimer = undefined;
  qrApprovalPollCode = undefined;
}

async function checkQrApproval(code) {
  if (qrApprovalPollCode !== code) return;
  try {
    const client = await getStoreClient();
    const { data, error } = await client.rpc('get_dynamic_image_qr', { p_code: code });
    if (error) throw new Error(`Could not check QR approval: ${error.message}`);
    const record = Array.isArray(data) ? data[0] : data;
    if (!record) {
      throw new Error('The submitted QR order could not be found. Contact B-STAR for help.');
    }

    const expiresAt = Date.parse(record.expires_at || '');
    if (record.status === 'active' && Number.isFinite(expiresAt) && expiresAt > Date.now()) {
      showActivatedQr(code);
      stopQrApprovalPolling();
      return;
    }
    if (record.status === 'expired') {
      document.getElementById('qr-approval-message').textContent = 'This QR order has expired. Contact B-STAR for assistance.';
      document.getElementById('qr-approval-message').dataset.state = 'error';
      document.getElementById('qr-pending-state').querySelector('.qr-pending-loader').hidden = true;
      stopQrApprovalPolling();
      return;
    }
    document.getElementById('qr-approval-message').textContent = 'Checking payment approval…';
    document.getElementById('qr-approval-message').dataset.state = '';
  } catch (error) {
    console.error('Dynamic QR approval check failed:', error);
    const message = document.getElementById('qr-approval-message');
    message.textContent = `${error.message} Retrying…`;
    message.dataset.state = 'error';
  }
  if (qrApprovalPollCode === code) {
    qrApprovalPollTimer = window.setTimeout(() => checkQrApproval(code), QR_APPROVAL_POLL_INTERVAL);
  }
}

function startQrApprovalPolling(code) {
  if (qrApprovalPollTimer) window.clearTimeout(qrApprovalPollTimer);
  qrApprovalPollCode = code;
  void checkQrApproval(code);
}

function restoreDynamicQrOrder() {
  let code;
  try {
    code = localStorage.getItem(DYNAMIC_QR_ORDER_STORAGE_KEY);
  } catch (error) {
    console.error('Could not restore dynamic QR order code:', error);
    return;
  }
  if (!code || !/^IMG-[A-Z0-9]{6}$/.test(code)) return;
  showQrOrder(code);
  startQrApprovalPolling(code);
}

async function createDynamicQr(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const file = selectedQrImage();
  const phone = form.elements.phone.value.trim();
  const cleanPhone = qrPhoneForWhatsApp(phone);
  const mpesaCode = form.elements.mpesaCode.value.trim().toUpperCase();
  if (!file) {
    if (!form.elements.image.files.length) setQrStatus('Choose an image to continue.', 'error');
    return;
  }
  if (!/^\+?[0-9][0-9 ()-]{6,18}[0-9]$/.test(phone) || cleanPhone.length < 9 || cleanPhone.length > 15) {
    setQrStatus('Enter a valid customer phone number.', 'error');
    form.elements.phone.focus();
    return;
  }
  if (!/^[A-Z0-9]{8,20}$/.test(mpesaCode)) {
    setQrStatus('Enter a valid M-Pesa confirmation code (8–20 letters or numbers).', 'error');
    form.elements.mpesaCode.focus();
    return;
  }
  if (typeof window.QRCode !== 'function') {
    setQrStatus('QR code generator did not load. Refresh the page and try again.', 'error');
    return;
  }

  const submit = document.getElementById('qr-generate-button');
  submit.disabled = true;
  let uploadedPath;
  let recordCreated = false;
  try {
    setQrStatus('Uploading your image…', '');
    const client = await getStoreClient();
    uploadedPath = qrImagePath(file);
    const { error: uploadError } = await client.storage.from(QR_IMAGE_BUCKET).upload(uploadedPath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

    const { data: publicUrlData } = client.storage.from(QR_IMAGE_BUCKET).getPublicUrl(uploadedPath);
    if (!publicUrlData?.publicUrl) throw new Error('Could not create a public URL for the uploaded image.');

    setQrStatus('Creating your dynamic image QR…', '');
    let code;
    let insertError;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      code = `IMG-${createQrShortCode()}`;
      const { error } = await client.from('dynamic_image_qrs').insert({
        code,
        phone: cleanPhone,
        image_url: publicUrlData.publicUrl,
        mpesa_code: mpesaCode,
      });
      insertError = error;
      if (!error) break;
      if (error.code !== '23505') {
        throw new Error(`Could not create your dynamic image QR record: ${error.message}`);
      }
      if (/mpesa_code/i.test(error.message || '')) {
        throw new Error('That M-Pesa confirmation code has already been submitted. Check the code or contact B-STAR for help.');
      }
    }
    if (insertError) throw new Error('Could not generate a unique QR code. Please try again.');

    recordCreated = true;
    try {
      localStorage.setItem(DYNAMIC_QR_ORDER_STORAGE_KEY, code);
    } catch (error) {
      console.error('Could not persist dynamic QR order code:', error);
    }
    showQrOrder(code);
    startQrApprovalPolling(code);
    form.reset();
    showQrImagePreview(null);
    setQrStatus('Your image QR was submitted and is pending payment approval.', 'success');
  } catch (error) {
    console.error('Dynamic QR creation failed:', error);
    const orphanNotice = uploadedPath && !recordCreated
      ? ' The image upload completed but was not linked; contact B-STAR to remove the unlinked upload.'
      : '';
    setQrStatus(`${error.message}${orphanNotice}`, 'error');
  } finally {
    submit.disabled = false;
  }
}

async function showDynamicQrViewer() {
  const match = window.location.hash.match(/^#q=(.*)$/i);
  if (!match) {
    const viewer = document.getElementById('qr-viewer');
    viewer.hidden = true;
    document.body.classList.remove('qr-viewer-open');
    return;
  }

  const code = match[1].toUpperCase();
  const viewer = document.getElementById('qr-viewer');
  const message = document.getElementById('qr-viewer-message');
  const image = document.getElementById('qr-viewer-image');
  const contact = document.getElementById('qr-viewer-contact');
  viewer.hidden = false;
  document.body.classList.add('qr-viewer-open');
  message.textContent = 'Loading your image…';
  image.hidden = true;
  contact.hidden = true;
  document.getElementById('qr-viewer-close').focus();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    message.textContent = 'This dynamic QR link is invalid. Contact B-STAR for help.';
    contact.href = `https://wa.me/${QR_WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi B-STAR, I need help with a dynamic QR link.')}`;
    contact.hidden = false;
    return;
  }

  try {
    const client = await getStoreClient();
    const { data, error } = await client.rpc('get_dynamic_qr_code', { p_short_code: code });
    if (error) throw new Error(`Could not load this dynamic QR link: ${error.message}`);
    if (window.location.hash.toUpperCase() !== `#Q=${code}`) return;
    const record = Array.isArray(data) ? data[0] : data;
    if (!record) {
      message.textContent = 'This dynamic QR link could not be found. Contact B-STAR for help.';
      contact.href = `https://wa.me/${QR_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi B-STAR, I need help with dynamic QR code ${code}.`)}`;
      contact.hidden = false;
      return;
    }

    const expiry = record.expires_at ? Date.parse(record.expires_at) : NaN;
    if (record.status !== 'active' || !Number.isFinite(expiry) || expiry <= Date.now()) {
      message.textContent = 'This dynamic QR link is pending activation or has expired. Pay KES 99 via WhatsApp to activate.';
      contact.href = `https://wa.me/${QR_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi B-STAR, please activate dynamic QR code ${code}.`)}`;
      contact.hidden = false;
      return;
    }
    if (!/^https:\/\//i.test(record.image_url || '')) throw new Error('This dynamic QR link has an invalid image URL.');

    image.src = record.image_url;
    image.hidden = false;
    image.onerror = () => {
      image.hidden = true;
      message.textContent = 'The image for this dynamic QR link could not be loaded. Contact B-STAR for help.';
      contact.href = `https://wa.me/${QR_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi B-STAR, the image for dynamic QR code ${code} is unavailable.`)}`;
      contact.hidden = false;
    };
    image.onload = () => {
      message.textContent = '';
    };
  } catch (error) {
    console.error('Dynamic QR viewer failed:', error);
    message.textContent = error.message;
    contact.href = `https://wa.me/${QR_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi B-STAR, I need help with dynamic QR code ${code}.`)}`;
    contact.hidden = false;
  }
}

function closeDynamicQrViewer() {
  document.getElementById('qr-viewer').hidden = true;
  document.body.classList.remove('qr-viewer-open');
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', cleanUrl);
}

function downloadDynamicQr() {
  const output = document.getElementById('qr-code-output');
  const canvas = output.querySelector('canvas');
  const image = output.querySelector('img');
  const dataUrl = canvas?.toDataURL('image/png') || image?.src;
  if (!dataUrl) {
    setQrStatus('The QR image is not ready to download yet.', 'error');
    return;
  }
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${generatedQrCode || 'bstar-dynamic-qr'}-qr.png`;
  link.click();
}

function bindDynamicQrActions() {
  const form = document.getElementById('dynamic-qr-form');
  const fileInput = document.getElementById('qr-image-file');
  const dropzone = document.getElementById('qr-dropzone');
  fileInput.addEventListener('change', () => showQrImagePreview(fileInput.files[0] || null));
  dropzone.addEventListener('keydown', (event) => {
    if (event.target === dropzone && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      fileInput.click();
    }
  });
  for (const eventName of ['dragenter', 'dragover']) {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragging');
    });
  }
  for (const eventName of ['dragleave', 'drop']) {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove('is-dragging');
    });
  }
  dropzone.addEventListener('drop', (event) => {
    const [file] = event.dataTransfer.files;
    if (file) setQrFile(file);
  });
  form.addEventListener('submit', createDynamicQr);
  document.getElementById('qr-download-button').addEventListener('click', downloadDynamicQr);
  const successDialog = document.getElementById('qr-success-dialog');
  document.getElementById('qr-success-close').addEventListener('click', () => successDialog.close());
  successDialog.addEventListener('click', (event) => {
    if (event.target === successDialog) successDialog.close();
  });
  document.getElementById('qr-viewer-close').addEventListener('click', closeDynamicQrViewer);
  document.getElementById('qr-viewer').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeDynamicQrViewer();
  });
  document.addEventListener('keydown', (event) => {
    const viewer = document.getElementById('qr-viewer');
    if (viewer.hidden) return;
    if (event.key === 'Escape') {
      closeDynamicQrViewer();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [...viewer.querySelectorAll('button:not(:disabled):not([hidden]), a[href]:not([hidden])')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  window.addEventListener('hashchange', showDynamicQrViewer);
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  const query = document.getElementById('product-search').value.trim().toLocaleLowerCase();
  const filtered = products.filter((product) => {
    if (!product.is_active || product.categories?.is_active === false) return false;
    const matchesCategory = activeCategory === 'all' || product.category_id === activeCategory;
    const matchesQuery = !query || `${product.name} ${product.description || ''} ${product.categories?.name || ''}`.toLocaleLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  document.getElementById('results-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'item' : 'items'}`;
  grid.replaceChildren();
  if (!filtered.length) {
    const empty = makeElement('div', 'empty-state');
    empty.append(makeElement('h3', '', products.length ? 'No matches just yet' : 'The collection is getting ready'));
    empty.append(makeElement('p', '', products.length ? 'Try another search or category.' : 'Check back soon or contact us for help finding what you need.'));
    grid.append(empty);
    return;
  }

  filtered.forEach((product) => {
    const card = makeElement('article', 'product-card');
    const visual = makeElement('div', 'product-visual');
    const imageUrl = publicImageUrl(product.image_path);
    if (imageUrl) {
      const image = makeElement('img');
      image.src = imageUrl;
      image.alt = product.name;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.onerror = () => {
        image.remove();
        visual.prepend(makeElement('span', 'product-placeholder', '✳'));
      };
      visual.append(image);
    } else {
      visual.append(makeElement('span', 'product-placeholder', '✳'));
    }
    if (product.is_featured) visual.append(makeElement('span', 'product-tag', 'Featured'));

    const details = makeElement('div', 'product-details');
    details.append(makeElement('p', 'product-category', product.categories?.name || 'Technology'));
    details.append(makeElement('h3', 'product-name', product.name));
    details.append(makeElement('p', 'product-description', product.description || 'Thoughtfully selected for everyday use.'));
    const bottom = makeElement('div', 'product-bottom');
    const priceArea = makeElement('div');
    priceArea.append(makeElement('strong', 'product-price', money.format(Number(product.price))));
    priceArea.append(makeElement('div', 'stock-note', product.stock > 0 ? `${product.stock} in stock` : 'Currently unavailable'));
    const addButton = makeElement('button', 'add-to-cart', '+');
    addButton.type = 'button';
    addButton.setAttribute('aria-label', `Add ${product.name} to cart`);
    addButton.disabled = product.stock < 1;
    addButton.addEventListener('click', () => addToCart(product.id));
    bottom.append(priceArea, addButton);
    details.append(bottom);
    card.append(visual, details);
    grid.append(card);
  });
}

function renderCategories() {
  const container = document.getElementById('category-list');
  container.replaceChildren();
  if (activeCategory !== 'all' && !categories.some((category) => category.id === activeCategory && category.is_active)) {
    activeCategory = 'all';
  }
  const allButton = makeElement('button', `category-pill${activeCategory === 'all' ? ' is-active' : ''}`, 'All products');
  allButton.type = 'button';
  allButton.dataset.category = 'all';
  container.append(allButton);
  categories.filter((category) => category.is_active).forEach((category) => {
    const button = makeElement('button', `category-pill${activeCategory === category.id ? ' is-active' : ''}`, category.name);
    button.type = 'button';
    button.dataset.category = category.id;
    container.append(button);
  });
  container.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.category;
      renderCategories();
      renderProducts();
    });
  });
}

async function refreshCatalog() {
  const message = document.getElementById('store-message');
  message.hidden = true;
  try {
    const client = await getStoreClient();
    const [categoryResult, productResult] = await Promise.all([
      client.from('categories').select('id,name,slug,is_active').eq('is_active', true).order('sort_order').order('name'),
      client.from('products').select('id,name,description,price,currency,stock,image_path,category_id,is_featured,is_active,categories(name,is_active)').eq('is_active', true).order('created_at', { ascending: false }),
    ]);
    if (categoryResult.error) throw new Error(`Unable to load categories: ${categoryResult.error.message}`);
    if (productResult.error) throw new Error(`Unable to load products: ${productResult.error.message}`);
    categories = categoryResult.data;
    products = productResult.data;
    renderCategories();
    renderProducts();
    renderCart();
  } catch (error) {
    console.error('Store catalog failed to load:', error);
    document.getElementById('product-grid').replaceChildren();
    document.getElementById('results-count').textContent = 'Collection unavailable';
    message.textContent = error.message;
    message.hidden = false;
  }
}

function openCart() {
  document.getElementById('cart-drawer').hidden = false;
  document.getElementById('drawer-backdrop').hidden = false;
  document.body.classList.add('panel-open');
  document.getElementById('close-cart').focus();
}

function closeCart() {
  document.getElementById('cart-drawer').hidden = true;
  document.getElementById('drawer-backdrop').hidden = true;
  if (!document.getElementById('admin-dialog').open) document.body.classList.remove('panel-open');
  document.getElementById('open-cart').focus();
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product || product.stock < 1) return;
  const currentQuantity = Number(cart[productId]) || 0;
  cart[productId] = Math.min(currentQuantity + 1, product.stock);
  saveCart();
  renderCart();
  openCart();
}

function updateCartQuantity(productId, nextQuantity) {
  const product = products.find((item) => item.id === productId);
  if (!product || nextQuantity < 1) {
    delete cart[productId];
  } else {
    cart[productId] = Math.min(nextQuantity, product.stock);
  }
  saveCart();
  renderCart();
}

function renderCart() {
  const itemsContainer = document.getElementById('cart-items');
  const entries = Object.entries(cart)
    .map(([id, quantity]) => ({ product: products.find((item) => item.id === id), quantity: Number(quantity) }))
    .filter(({ product, quantity }) => product && product.is_active && product.categories?.is_active !== false && Number.isInteger(quantity) && quantity > 0 && product.stock > 0)
    .map(({ product, quantity }) => ({ product, quantity: Math.min(quantity, product.stock) }));
  cart = Object.fromEntries(entries.map(({ product, quantity }) => [product.id, quantity]));
  saveCart();

  const itemCount = entries.reduce((total, item) => total + item.quantity, 0);
  document.getElementById('cart-count').textContent = String(itemCount);
  document.getElementById('open-cart').setAttribute('aria-label', `Open cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`);
  document.getElementById('cart-item-label').textContent = `(${itemCount})`;
  document.getElementById('cart-empty').hidden = entries.length > 0;
  document.getElementById('cart-summary').hidden = entries.length === 0;
  itemsContainer.replaceChildren();

  entries.forEach(({ product, quantity }) => {
    const row = makeElement('article', 'cart-row');
    const thumb = makeElement('div', 'cart-thumb');
    const imageUrl = publicImageUrl(product.image_path);
    if (imageUrl) {
      const image = makeElement('img');
      image.src = imageUrl;
      image.alt = '';
      thumb.append(image);
    } else {
      thumb.textContent = '✳';
    }
    const details = makeElement('div');
    details.append(makeElement('h3', 'cart-product-name', product.name));
    details.append(makeElement('p', 'cart-line-price', money.format(Number(product.price))));
    const controls = makeElement('div', 'quantity-control');
    const decrement = makeElement('button', '', '−');
    decrement.type = 'button';
    decrement.setAttribute('aria-label', `Remove one ${product.name}`);
    decrement.addEventListener('click', () => updateCartQuantity(product.id, quantity - 1));
    const count = makeElement('span', '', String(quantity));
    const increment = makeElement('button', '', '+');
    increment.type = 'button';
    increment.disabled = quantity >= product.stock;
    increment.setAttribute('aria-label', `Add one ${product.name}`);
    increment.addEventListener('click', () => updateCartQuantity(product.id, quantity + 1));
    controls.append(decrement, count, increment);
    details.append(controls);
    const remove = makeElement('button', 'remove-item', '×');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove ${product.name} from cart`);
    remove.addEventListener('click', () => updateCartQuantity(product.id, 0));
    row.append(thumb, details, remove);
    itemsContainer.append(row);
  });
  const subtotal = entries.reduce((total, { product, quantity }) => total + Number(product.price) * quantity, 0);
  document.getElementById('cart-subtotal').textContent = money.format(subtotal);
}

function showAdminStatus(message, state = 'info') {
  const status = document.getElementById('admin-status');
  status.textContent = message;
  status.dataset.state = state;
}

function openAdmin() {
  document.getElementById('admin-dialog').showModal();
  document.body.classList.add('panel-open');
  initializeAdmin();
}

async function initializeAdmin() {
  const loginForm = document.getElementById('admin-login-form');
  const content = document.getElementById('admin-content');
  try {
    const client = await getStoreClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw new Error(error.message);
    const user = data.session?.user;
    if (user?.app_metadata?.role === 'admin') {
      await showAdminDashboard(user);
    } else {
      loginForm.hidden = false;
      content.hidden = true;
      if (user) showAdminStatus('This account is signed in but does not have the store admin role.', 'error');
    }
  } catch (error) {
    console.error('Could not initialize admin dashboard:', error);
    showAdminStatus(error.message, 'error');
  }
}

async function showAdminDashboard(user) {
  setAdminTab('catalog');
  document.getElementById('admin-login-form').hidden = true;
  document.getElementById('admin-content').hidden = false;
  document.getElementById('admin-account').textContent = user.email || 'Administrator';
  showAdminStatus('Signed in. Product changes are protected by Supabase admin policies.', 'success');
  try {
    await refreshAdminData();
  } catch (error) {
    console.error('Admin data refresh failed:', error);
    showAdminStatus(error.message, 'error');
  }
}

async function refreshAdminData() {
  const client = await getStoreClient();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw new Error(`Unable to verify admin session: ${sessionError.message}`);
  if (sessionData.session?.user?.app_metadata?.role !== 'admin') {
    throw new Error('Sign in with an authorized store admin account to load dashboard data.');
  }
  const [categoryResult, productResult, qrResult] = await Promise.all([
    client.from('categories').select('id,name,slug,is_active').order('sort_order').order('name'),
    client.from('products').select('id,name,description,sku,price,stock,is_active,image_path,category_id,categories(name,is_active)').order('created_at', { ascending: false }),
    client.from('dynamic_image_qrs').select('code,phone,image_url,mpesa_code,status,expires_at,created_at').order('created_at', { ascending: false }),
  ]);
  if (categoryResult.error) throw new Error(`Unable to load admin categories: ${categoryResult.error.message}`);
  if (productResult.error) throw new Error(`Unable to load admin products: ${productResult.error.message}`);
  if (qrResult.error) throw new Error(`Unable to load admin dynamic QR codes: ${qrResult.error.message}`);
  categories = categoryResult.data;
  products = productResult.data;
  adminQrCodes = qrResult.data;
  renderCategories();
  renderProducts();
  renderCart();
  renderAdminProducts(productResult.data);
  renderAdminQrCodes(adminQrCodes);
  renderAdminCategories();
  updateCategorySelect();
}

function qrExpiryLabel(expiresAt) {
  if (!expiresAt) return 'Not activated';
  const date = new Date(expiresAt);
  return Number.isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleString();
}

function makeAdminQrAction(label, action, shortCode, style = '') {
  const button = makeElement('button', `admin-action${style ? ` ${style}` : ''}`, label);
  button.type = 'button';
  button.dataset.qrAction = action;
  button.dataset.shortCode = shortCode;
  return button;
}

function renderAdminQrCodes(qrCodes) {
  const list = document.getElementById('admin-qr-list');
  list.replaceChildren();
  document.getElementById('admin-qr-count').textContent = `(${qrCodes.length})`;
  if (!qrCodes.length) {
    list.append(makeElement('p', 'empty-state', 'No dynamic QR codes have been created yet.'));
    return;
  }

  qrCodes.forEach((qrCode) => {
    const row = makeElement('article', 'admin-qr-row');
    const image = makeElement('img', 'admin-qr-thumb');
    image.src = qrCode.image_url;
    image.alt = `Image for QR code ${qrCode.code}`;
    image.loading = 'lazy';
    image.onerror = () => {
      image.removeAttribute('src');
      image.alt = 'QR image unavailable';
      image.classList.add('is-unavailable');
    };

    const code = makeElement('strong', 'admin-qr-code', qrCode.code);
    const phone = makeElement('span', 'admin-qr-phone', qrCode.phone);
    const mpesa = makeElement('span', 'admin-qr-phone', `M-Pesa: ${qrCode.mpesa_code || 'Legacy record'}`);
    const status = makeElement('span', `admin-qr-status status-${qrCode.status}`, qrCode.status);
    const createdAt = new Date(qrCode.created_at);
    const date = makeElement('time', 'admin-qr-expiry', Number.isNaN(createdAt.getTime()) ? 'Date unavailable' : createdAt.toLocaleString());
    if (!Number.isNaN(createdAt.getTime())) {
      date.dateTime = createdAt.toISOString();
    }
    const expiry = makeElement('span', 'admin-qr-expiry', `Expires: ${qrExpiryLabel(qrCode.expires_at)}`);

    const actions = makeElement('div', 'admin-qr-actions');
    if (qrCode.status !== 'active') {
      actions.append(makeAdminQrAction('Activate (+30 Days)', 'activate', qrCode.code, 'activate'));
    } else if (qrCode.status === 'active') {
      actions.append(makeAdminQrAction('Renew (+30 Days)', 'renew', qrCode.code, 'activate'));
      const notify = makeElement('a', 'admin-action', 'Notify via WhatsApp');
      notify.href = dynamicQrWhatsAppLink(qrCode);
      notify.target = '_blank';
      notify.rel = 'noopener noreferrer';
      actions.append(notify);
    }
    if (qrCode.status !== 'expired') {
      actions.append(makeAdminQrAction('Deactivate / Expire', 'expire', qrCode.code, 'delete'));
    }

    row.append(image, code, phone, mpesa, status, date, expiry, actions);
    list.append(row);
  });
}

async function updateDynamicQrCode(code, action, notificationWindow) {
  const qrCode = adminQrCodes.find((item) => item.code === code);
  if (!qrCode) throw new Error(`Dynamic image QR ${code} is no longer in the current list.`);

  const updates = {};
  if (action === 'activate') {
    updates.status = 'active';
    updates.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (action === 'renew') {
    const existingExpiry = Date.parse(qrCode.expires_at || '');
    const renewalStart = Number.isFinite(existingExpiry) ? Math.max(existingExpiry, Date.now()) : Date.now();
    updates.status = 'active';
    updates.expires_at = new Date(renewalStart + 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (action === 'expire') {
    updates.status = 'expired';
  } else {
    throw new Error(`Unsupported QR action: ${action}`);
  }

  const client = await getStoreClient();
  const { error } = await client
    .from('dynamic_image_qrs')
    .update(updates)
    .eq('code', code);
  if (error) throw new Error(`Could not ${action} image QR ${code}: ${error.message}`);

  await refreshAdminData();
  if (action === 'activate') {
    const whatsappUrl = dynamicQrWhatsAppLink(qrCode);
    if (notificationWindow && !notificationWindow.closed) {
      notificationWindow.location.href = whatsappUrl;
    } else {
      showAdminStatus(`Image QR ${code} activated. Use the WhatsApp notification link in the refreshed row.`, 'success');
      return;
    }
  }
  showAdminStatus(`Image QR ${code} ${action === 'expire' ? 'expired' : action === 'renew' ? 'renewed' : 'activated'}.`, 'success');
}

function dynamicQrWhatsAppLink(qrCode) {
  const cleanPhone = qrPhoneForWhatsApp(qrCode.phone);
  const message = `Hello! Your B-STAR Dynamic Image QR (${qrCode.code}) is now ACTIVE for 30 days. View link: ${dynamicQrLink(qrCode.code)}`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

async function handleAdminQrAction(event) {
  const button = event.target.closest('[data-qr-action]');
  if (!button || !event.currentTarget.contains(button)) return;
  const notificationWindow = button.dataset.qrAction === 'activate' ? window.open('about:blank', '_blank') : null;
  if (notificationWindow) notificationWindow.opener = null;
  button.disabled = true;
  try {
    await updateDynamicQrCode(button.dataset.shortCode, button.dataset.qrAction, notificationWindow);
  } catch (error) {
    if (notificationWindow && !notificationWindow.closed) notificationWindow.close();
    console.error('Admin dynamic QR action failed:', error);
    showAdminStatus(error.message, 'error');
  } finally {
    if (button.isConnected) button.disabled = false;
  }
}

function setAdminTab(tabName) {
  document.querySelectorAll('[data-admin-tab]').forEach((tab) => {
    const isActive = tab.dataset.adminTab === tabName;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });
  document.querySelectorAll('[data-admin-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.adminPanel !== tabName;
  });
}

function renderAdminCategories() {
  const list = document.getElementById('admin-category-list');
  list.replaceChildren();
  categories.filter((category) => category.is_active).forEach((category) => {
    const chip = makeElement('span', 'admin-category-chip', category.name);
    const remove = makeElement('button', '', '×');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Delete ${category.name} category`);
    remove.addEventListener('click', () => deleteCategory(category));
    chip.append(remove);
    list.append(chip);
  });
}

async function deleteCategory(category) {
  if (!window.confirm(`Delete the "${category.name}" category? Categories containing products cannot be deleted.`)) return;
  try {
    const client = await getStoreClient();
    const { error } = await client.from('categories').delete().eq('id', category.id);
    if (error) throw new Error(error.message);
    await refreshAdminData();
    showAdminStatus('Category deleted.', 'success');
  } catch (error) {
    console.error('Category deletion failed:', error);
    showAdminStatus(`Could not delete category: ${error.message}`, 'error');
  }
}

function renderAdminProducts(adminProducts) {
  const list = document.getElementById('admin-product-list');
  list.replaceChildren();
  document.getElementById('admin-product-count').textContent = `(${adminProducts.length})`;
  if (!adminProducts.length) {
    list.append(makeElement('p', 'empty-state', 'No products yet. Add your first product below.'));
    return;
  }
  adminProducts.forEach((product) => {
    const row = makeElement('div', 'admin-product-row');
    const thumb = makeElement('span', 'admin-thumb');
    const imageUrl = publicImageUrl(product.image_path);
    if (imageUrl) {
      const image = makeElement('img');
      image.src = imageUrl;
      image.alt = '';
      thumb.append(image);
    } else {
      thumb.textContent = '✳';
    }
    const info = makeElement('div');
    info.append(makeElement('strong', '', product.name));
    info.append(makeElement('small', '', `${money.format(Number(product.price))} · ${product.stock} in stock · ${product.is_active ? 'Visible' : 'Hidden'}`));
    const edit = makeElement('button', 'admin-action', 'Edit');
    edit.type = 'button';
    edit.addEventListener('click', () => beginProductEdit(product));
    const remove = makeElement('button', 'admin-action delete', 'Delete');
    remove.type = 'button';
    remove.addEventListener('click', () => deleteProduct(product));
    row.append(thumb, info, edit, remove);
    list.append(row);
  });
}

function updateCategorySelect() {
  const select = document.querySelector('#product-form select[name="category_id"]');
  const previous = select.value;
  const activeCategories = categories.filter((category) => category.is_active);
  select.replaceChildren();
  activeCategories.forEach((category) => {
    const option = makeElement('option', '', category.name);
    option.value = category.id;
    select.append(option);
  });
  if (activeCategories.some((category) => category.id === previous)) select.value = previous;
  select.disabled = activeCategories.length === 0;
}

function beginProductEdit(product) {
  const form = document.getElementById('product-form');
  form.reset();
  form.hidden = false;
  form.elements.id.value = product.id;
  form.elements.name.value = product.name;
  form.elements.category_id.value = product.category_id;
  form.elements.description.value = product.description || '';
  form.elements.price.value = product.price;
  form.elements.stock.value = product.stock;
  form.elements.sku.value = product.sku || '';
  form.elements.is_active.checked = product.is_active;
  form.elements.image.required = false;
  document.getElementById('product-form-title').textContent = 'Edit product';
  form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function deleteProduct(product) {
  if (!window.confirm(`Delete "${product.name}" from your catalog?`)) return;
  try {
    const client = await getStoreClient();
    const { error } = await client.from('products').delete().eq('id', product.id);
    if (error) throw new Error(error.message);
    if (product.image_path) {
      const { error: storageError } = await client.storage.from(IMAGE_BUCKET).remove([product.image_path]);
      if (storageError) console.error('Product was deleted, but its image could not be removed:', storageError.message);
    }
    await refreshAdminData();
    showAdminStatus('Product deleted.', 'success');
  } catch (error) {
    console.error('Product deletion failed:', error);
    showAdminStatus(`Could not delete product: ${error.message}`, 'error');
  }
}

function slugify(value) {
  return value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function imageExtension(file) {
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  return extensions[file.type];
}

async function saveProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('[type="submit"]');
  const file = form.elements.image.files[0];
  const name = form.elements.name.value.trim();
  const categoryId = form.elements.category_id.value;
  if (!name || !categoryId) {
    showAdminStatus('Enter a product name and select a category.', 'error');
    return;
  }
  if (!form.elements.id.value && !file) {
    showAdminStatus('Choose a product image.', 'error');
    return;
  }
  if (file && (!imageExtension(file) || file.size > 5 * 1024 * 1024)) {
    showAdminStatus('Choose a JPEG, PNG or WebP image no larger than 5 MB.', 'error');
    return;
  }

  submit.disabled = true;
  showAdminStatus('Saving product…');
  let uploadedImagePath;
  let productSaved = false;
  try {
    const client = await getStoreClient();
    const id = form.elements.id.value;
    const existing = products.find((product) => product.id === id);
    let imagePath = existing?.image_path || null;
    if (file) {
      const path = `${crypto.randomUUID()}.${imageExtension(file)}`;
      const { error: uploadError } = await client.storage.from(IMAGE_BUCKET).upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
      imagePath = path;
      uploadedImagePath = path;
    }
    const values = {
      name,
      slug: slugify(name),
      description: form.elements.description.value.trim(),
      category_id: categoryId,
      price: Number(form.elements.price.value),
      currency,
      stock: Number(form.elements.stock.value),
      sku: form.elements.sku.value.trim() || null,
      image_path: imagePath,
      is_active: form.elements.is_active.checked,
    };
    const result = id
      ? await client.from('products').update(values).eq('id', id)
      : await client.from('products').insert(values);
    if (result.error) throw new Error(result.error.message);
    productSaved = true;
    if (file && existing?.image_path) {
      const { error: oldImageError } = await client.storage.from(IMAGE_BUCKET).remove([existing.image_path]);
      if (oldImageError) console.error('Product saved, but the previous image could not be removed:', oldImageError.message);
    }
    form.reset();
    form.hidden = true;
    form.elements.image.required = true;
    await refreshAdminData();
    showAdminStatus('Product saved successfully.', 'success');
  } catch (error) {
    console.error('Product save failed:', error);
    if (uploadedImagePath && !productSaved) {
      const { error: cleanupError } = await storeClient.storage.from(IMAGE_BUCKET).remove([uploadedImagePath]);
      if (cleanupError) console.error('Could not remove the unused uploaded product image:', cleanupError.message);
    }
    showAdminStatus(`Could not save product: ${error.message}`, 'error');
  } finally {
    submit.disabled = false;
  }
}

async function checkout() {
  const whatsappNumber = String(window.BSTAR_CONFIG?.whatsappNumber || '').replace(/\D/g, '');
  const note = document.querySelector('.checkout-note');
  if (!whatsappNumber) {
    note.textContent = 'Set whatsappNumber in supabase-config.js to enable order handoff.';
    note.dataset.state = 'error';
    return;
  }
  const lines = Object.entries(cart).map(([id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return product ? `• ${product.name} × ${quantity} — ${money.format(Number(product.price) * quantity)}` : null;
  }).filter(Boolean);
  const total = Object.entries(cart).reduce((sum, [id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return sum + (product ? Number(product.price) * quantity : 0);
  }, 0);
  const text = `Hello B-STAR TECHNOLOGIES! I'd like to order:\n\n${lines.join('\n')}\n\nSubtotal: ${money.format(total)}\nPlease confirm availability, delivery and payment details.`;
  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function bindAdminActions() {
  const dialog = document.getElementById('admin-dialog');
  document.getElementById('open-admin').addEventListener('click', openAdmin);
  document.getElementById('close-admin').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (document.getElementById('cart-drawer').hidden) document.body.classList.remove('panel-open');
  });
  document.getElementById('admin-login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    showAdminStatus('Signing in…');
    try {
      const client = await getStoreClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: form.elements.email.value.trim(),
        password: form.elements.password.value,
      });
      if (error) throw new Error(error.message);
      if (data.user?.app_metadata?.role !== 'admin') {
        showAdminStatus('This account is not authorized to manage the store.', 'error');
        return;
      }
      await showAdminDashboard(data.user);
    } catch (error) {
      console.error('Admin sign-in failed:', error);
      showAdminStatus(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });
  document.getElementById('admin-sign-out').addEventListener('click', async () => {
    try {
      const client = await getStoreClient();
      const { error } = await client.auth.signOut();
      if (error) throw new Error(error.message);
      adminQrCodes = [];
      renderAdminQrCodes(adminQrCodes);
      document.getElementById('admin-content').hidden = true;
      document.getElementById('admin-login-form').hidden = false;
      showAdminStatus('Signed out.');
    } catch (error) {
      console.error('Admin sign-out failed:', error);
      showAdminStatus(error.message, 'error');
    }
  });
  document.querySelectorAll('[data-admin-tab]').forEach((tab) => {
    tab.addEventListener('click', () => setAdminTab(tab.dataset.adminTab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const tabs = [...document.querySelectorAll('[data-admin-tab]')];
      const currentIndex = tabs.indexOf(tab);
      const offset = event.key === 'ArrowRight' ? 1 : -1;
      const nextTab = tabs[(currentIndex + offset + tabs.length) % tabs.length];
      setAdminTab(nextTab.dataset.adminTab);
      nextTab.focus();
    });
  });
  document.getElementById('admin-qr-list').addEventListener('click', handleAdminQrAction);
  document.getElementById('refresh-qr-codes').addEventListener('click', async () => {
    const button = document.getElementById('refresh-qr-codes');
    button.disabled = true;
    try {
      await refreshAdminData();
      showAdminStatus('Dynamic QR codes refreshed.', 'success');
    } catch (error) {
      console.error('Dynamic QR refresh failed:', error);
      showAdminStatus(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });
  document.getElementById('new-product').addEventListener('click', () => {
    const form = document.getElementById('product-form');
    form.reset();
    form.elements.id.value = '';
    form.elements.image.required = true;
    form.hidden = false;
    document.getElementById('product-form-title').textContent = 'Add a product';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  document.getElementById('cancel-product-edit').addEventListener('click', () => {
    const form = document.getElementById('product-form');
    form.reset();
    form.hidden = true;
    form.elements.image.required = true;
  });
  document.getElementById('product-form').addEventListener('submit', saveProduct);
  document.getElementById('category-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.name.value.trim();
    const slug = slugify(name);
    if (!name || !slug) {
      showAdminStatus('Enter a category name using letters or numbers.', 'error');
      return;
    }
    try {
      const client = await getStoreClient();
      const { error } = await client.from('categories').insert({ name, slug });
      if (error) throw new Error(error.message);
      form.reset();
      await refreshAdminData();
      showAdminStatus('Category added.', 'success');
    } catch (error) {
      console.error('Category creation failed:', error);
      showAdminStatus(`Could not add category: ${error.message}`, 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  redirectLegacyQrHash();
  document.getElementById('current-year').textContent = String(new Date().getFullYear());
  document.getElementById('product-search').addEventListener('input', renderProducts);
  document.getElementById('open-cart').addEventListener('click', openCart);
  document.getElementById('close-cart').addEventListener('click', closeCart);
  document.getElementById('continue-shopping').addEventListener('click', closeCart);
  document.getElementById('drawer-backdrop').addEventListener('click', closeCart);
  document.getElementById('checkout-button').addEventListener('click', checkout);
  bindDynamicQrActions();
  document.addEventListener('keydown', (event) => {
    const drawer = document.getElementById('cart-drawer');
    if (drawer.hidden) return;
    if (event.key === 'Escape') {
      closeCart();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [...drawer.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  bindAdminActions();
  restoreDynamicQrOrder();
  showDynamicQrViewer();
  refreshCatalog();
});
