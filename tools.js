(() => {
  'use strict';

  const FEE = 10;
  const STORAGE_PHONE = 'bstar-tools-phone-v1';
  const CHECKLIST_KEY = 'bstar-tools-checklists-v1';
  const TOOL_GROUPS = [
    { name: 'PDF', tools: [
      ['compress-pdf', 'Compress PDF', 'Reduce PDF size with browser-side page rendering.', '▤'],
      ['pdf-to-jpg', 'PDF to JPG', 'Render PDF pages and download them as JPEG images.', '▧'],
      ['image-to-pdf', 'Image to PDF', 'Combine images into an A4 PDF document.', '▣'],
      ['pdf-merge', 'Merge PDFs', 'Join multiple PDF files into one document.', '⊕'],
      ['pdf-split', 'Split PDF', 'Extract selected page numbers into a new PDF.', '⊟'],
    ] },
    { name: 'Images', tools: [
      ['passport-photo', 'Passport Photo', 'Create 2×2 inch or 35×45 mm passport photos.', '▣'],
      ['image-compress', 'Image Compressor', 'Compress an image to JPEG and tune its file size.', '◩'],
      ['image-resize', 'Image Resizer', 'Resize an image to exact pixel dimensions.', '⤢'],
      ['format-converter', 'Format Converter', 'Convert images between PNG, JPEG, and WebP.', '⇄'],
      ['image-crop', 'Image Cropper', 'Drag a crop selection over an image and save it.', '⌗'],
    ] },
    { name: 'Everyday', tools: [
      ['whatsapp-link', 'WhatsApp Link', 'Create a wa.me link with a prefilled message.', '↗'],
      ['qr-generator', 'QR Generator', 'Create and download a QR code PNG.', '▦'],
      ['age-calculator', 'Age Calculator', 'Calculate age and time until the next birthday.', '◷'],
      ['file-size', 'File Size Converter', 'Convert between B, KB, MB, GB, and TB.', '⇅'],
      ['letter-maker', 'Letter Maker', 'Compose and print a professional A4 letter.', '✉'],
    ] },
    { name: 'Money', tools: [
      ['vat-calculator', 'VAT Calculator', 'Calculate Kenyan VAT at 16%, inclusive or exclusive.', '％'],
      ['percentage-calculator', 'Percentage Calculator', 'Calculate discount, markup, and margin.', '％'],
      ['invoice-maker', 'Invoice & Receipt Maker', 'Create printable invoices and receipts with VAT.', '▤'],
      ['mpesa-sheet', 'M-Pesa Payment Sheet', 'Print a counter sheet for Paybill or Till payments.', 'K'],
    ] },
    { name: 'Checklists', tools: [
      ['cv-checklist', 'CV Checklist', 'Track the essentials for a strong CV.', '☑'],
      ['business-checklist', 'Business Name Checklist', 'Track the steps for choosing a business name.', '☑'],
    ] },
  ];

  const TITLES = new Map(TOOL_GROUPS.flatMap((group) => group.tools.map(([id, title]) => [id, title])));
  const DESCRIPTIONS = new Map(TOOL_GROUPS.flatMap((group) => group.tools.map(([id, title, description]) => [id, description])));
  const GROUPS = new Map(TOOL_GROUPS.flatMap((group) => group.tools.map(([id]) => [id, group.name])));
  const CHECKLISTS = {
    'cv-checklist': [
      'Add clear contact details and a professional email address.',
      'Write a role-specific profile summary.',
      'List relevant work experience with measurable outcomes.',
      'Include education, certifications, and relevant skills.',
      'Proofread dates, spelling, and formatting.',
      'Save and submit as a clearly named PDF.',
    ],
    'business-checklist': [
      'Brainstorm clear, memorable names that fit the business.',
      'Search the Business Registration Service name database.',
      'Check domain and social media handle availability.',
      'Check the name does not conflict with a registered trademark.',
      'Confirm the name follows current registration guidelines.',
      'Prepare alternative names before submitting the application.',
    ],
  };
  let currentTool = null;
  let pendingToolId = null;
  let cropState = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  async function getClient() {
    if (!window.BSTAR_APP?.getStoreClient) throw new Error('The storefront Supabase client is not available.');
    return window.BSTAR_APP.getStoreClient();
  }

  function setStatus(message, state = '') {
    const status = $('#tools-status');
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = !message;
  }

  function setPaywallStatus(message, state = '') {
    const status = $('#tools-paywall-status');
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = !message;
  }

  function renderCards() {
    const root = $('#tools-categories');
    root.replaceChildren();
    TOOL_GROUPS.forEach(({ name, tools }) => {
      const section = el('section', 'tools-category');
      section.append(el('h3', 'tools-category-heading', name));
      const grid = el('div', 'tools-card-grid');
      tools.forEach(([id, title, description, icon]) => {
        const button = el('button', 'tools-card');
        button.type = 'button';
        button.dataset.toolId = id;
        const symbol = el('span', 'tools-card-icon', icon);
        symbol.setAttribute('aria-hidden', 'true');
        button.append(symbol, el('strong', '', title), el('span', '', `${description} · KES 10`));
        grid.append(button);
      });
      section.append(grid);
      root.append(section);
    });
  }

  function normalizePhone(value) {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
    if (digits.startsWith('254') && digits.length === 12) return digits;
    if (digits.length >= 9 && digits.length <= 15) return digits;
    return '';
  }

  async function activeSubscription(phone, toolId) {
    const client = await getClient();
    const { data, error } = await client.rpc('has_active_tool_subscription', {
      p_phone: phone,
      p_tool_id: toolId,
    });
    if (error) throw new Error(`Unable to check tool access: ${error.message}`);
    return data === true;
  }

  async function requestTool(toolId) {
    pendingToolId = toolId;
    const rememberedPhone = localStorage.getItem(STORAGE_PHONE) || '';
    if (rememberedPhone) {
      try {
        if (await activeSubscription(rememberedPhone, toolId)) {
          openTool(toolId);
          return;
        }
      } catch (error) {
        console.error('Tool subscription check failed:', error);
        setPaywallStatus(error.message, 'error');
      }
    }
    $('#tools-paywall-title').textContent = `Unlock ${TITLES.get(toolId)}`;
    $('#tools-paywall-form').elements.phone.value = rememberedPhone;
    document.body.classList.add('panel-open');
    $('#tools-paywall').showModal();
    $('#tools-paywall-form').elements.phone.focus();
  }

  function openTool(toolId) {
    currentTool = toolId;
    $('#tools-workspace-title').textContent = TITLES.get(toolId);
    $('#tools-workspace-category').textContent = GROUPS.get(toolId).toUpperCase();
    $('#tools-workspace-description').textContent = DESCRIPTIONS.get(toolId);
    $('#tools-workspace-content').replaceChildren();
    setStatus('');
    cropState = null;
    document.body.classList.add('panel-open');
    $('#tools-workspace').showModal();
    renderTool(toolId);
  }

  function setFile(name = 'file') {
    const input = el('input');
    input.type = 'file';
    input.name = name;
    input.required = true;
    input.accept = '*/*';
    return input;
  }

  function field(labelText, input, className = '') {
    const label = el('label', className);
    label.append(el('span', '', labelText), input);
    return label;
  }

  function input(type, name, options = {}) {
    const node = el('input');
    node.type = type;
    node.name = name;
    if (options.value !== undefined) node.value = options.value;
    if (options.min !== undefined) node.min = options.min;
    if (options.max !== undefined) node.max = options.max;
    if (options.step !== undefined) node.step = options.step;
    if (options.required) node.required = true;
    if (options.placeholder) node.placeholder = options.placeholder;
    if (options.checked) node.checked = true;
    if (options.accept) node.accept = options.accept;
    return node;
  }

  function select(name, options) {
    const node = el('select');
    node.name = name;
    options.forEach(([value, label]) => {
      const option = el('option', '', label);
      option.value = value;
      node.append(option);
    });
    return node;
  }

  function button(text, action = 'run', secondary = false) {
    const node = el('button', `button ${secondary ? 'button-secondary' : 'button-primary'}`, text);
    node.type = 'button';
    node.dataset.toolAction = action;
    return node;
  }

  function formGrid(...fields) {
    const grid = el('div', 'tools-form-grid');
    grid.append(...fields);
    return grid;
  }

  function addForm(...children) {
    const content = $('#tools-workspace-content');
    content.append(...children);
    return content;
  }

  function output() {
    const result = el('div', 'tools-output');
    result.dataset.output = 'true';
    $('#tools-workspace-content').append(result);
    return result;
  }

  function renderTool(id) {
    const content = $('#tools-workspace-content');
    const fileAccept = 'image/jpeg,image/png,image/webp';
    if (id === 'compress-pdf' || id === 'pdf-to-jpg' || id === 'pdf-split') {
      const file = setFile('pdf');
      file.accept = 'application/pdf,.pdf';
      const fields = [field('PDF file', file)];
      if (id === 'compress-pdf') {
        const scale = input('number', 'scale', { value: '0.8', min: '0.25', max: '1', step: '0.05' });
        const quality = input('number', 'quality', { value: '0.72', min: '0.2', max: '1', step: '0.05' });
        fields.push(field('Render scale (0.25–1)', scale), field('JPEG quality (0.2–1)', quality));
      }
      if (id === 'pdf-split') fields.push(field('Pages to extract (e.g. 1,3-5)', input('text', 'pages', { required: true, placeholder: '1,3-5' })));
      content.append(formGrid(...fields), button(id === 'pdf-to-jpg' ? 'Convert pages to JPG' : id === 'pdf-split' ? 'Extract pages' : 'Compress PDF'));
      return;
    }
    if (id === 'pdf-merge' || id === 'image-to-pdf') {
      const file = setFile('files');
      file.multiple = true;
      file.accept = id === 'pdf-merge' ? 'application/pdf,.pdf' : fileAccept;
      content.append(field(id === 'pdf-merge' ? 'PDF files (merge in selected order)' : 'Image files', file), button(id === 'pdf-merge' ? 'Merge PDFs' : 'Create A4 PDF'));
      return;
    }
    if (id === 'passport-photo') {
      const file = setFile('image');
      file.accept = fileAccept;
      const size = select('size', [['2x2', '2 × 2 inches'], ['35x45', '35 × 45 mm']]);
      const dpi = input('number', 'dpi', { value: '300', min: '72', max: '600', step: '1' });
      const background = select('background', [['white', 'White background'], ['#d8efff', 'Light blue background']]);
      content.append(formGrid(field('Photo', file), field('Print size', size), field('DPI', dpi), field('Background', background)), button('Create passport photo'));
      return;
    }
    if (id === 'image-compress') {
      const file = setFile('image');
      file.accept = fileAccept;
      const quality = input('range', 'quality', { value: '0.75', min: '0.1', max: '1', step: '0.05' });
      const target = input('number', 'targetKb', { min: '1', step: '1', placeholder: 'Optional target KB' });
      content.append(formGrid(field('Image', file), field('JPEG quality', quality), field('Target size (KB, optional)', target)), el('p', 'tools-output', 'Quality: 75% · Choose an image to estimate output size.'));
      quality.addEventListener('input', () => { content.querySelector('.tools-output').textContent = `JPEG quality: ${Math.round(Number(quality.value) * 100)}%`; });
      file.addEventListener('change', () => {
        if (file.files[0]) content.querySelector('.tools-output').textContent = `Original: ${formatBytes(file.files[0].size)} · Quality: ${Math.round(Number(quality.value) * 100)}%`;
      });
      content.append(button('Compress image'));
      return;
    }
    if (id === 'image-resize') {
      const file = setFile('image');
      file.accept = fileAccept;
      const width = input('number', 'width', { value: '800', min: '1', max: '12000', required: true });
      const height = input('number', 'height', { value: '600', min: '1', max: '12000', required: true });
      const lock = input('checkbox', 'lock', { checked: true });
      content.append(formGrid(field('Image', file), field('Width (px)', width), field('Height (px)', height), field('Lock aspect ratio', lock)), button('Resize image'));
      wireAspectLock(width, height, lock);
      return;
    }
    if (id === 'format-converter') {
      const file = setFile('image');
      file.accept = fileAccept;
      const format = select('format', [['image/png', 'PNG'], ['image/jpeg', 'JPEG'], ['image/webp', 'WebP']]);
      content.append(formGrid(field('Image', file), field('Output format', format)), button('Convert image'));
      return;
    }
    if (id === 'image-crop') {
      const file = setFile('image');
      file.accept = fileAccept;
      const canvas = el('canvas', 'tools-preview');
      canvas.dataset.cropCanvas = 'true';
      canvas.width = 1;
      canvas.height = 1;
      content.append(field('Image', file), canvas, el('p', 'tools-output', 'Drag over the image to select the crop area.'), button('Download crop'));
      file.addEventListener('change', () => loadCropImage(file.files[0], canvas).catch((error) => setStatus(error.message, 'error')));
      return;
    }
    if (id === 'whatsapp-link') {
      const number = input('tel', 'phone', { required: true, placeholder: '2547XXXXXXXX or 07XXXXXXXX' });
      const message = el('textarea');
      message.name = 'message';
      message.rows = 4;
      message.placeholder = 'Optional message';
      content.append(formGrid(field('Phone number', number), field('Message', message)), button('Generate link'));
      return;
    }
    if (id === 'qr-generator') {
      const text = el('textarea');
      text.name = 'text';
      text.required = true;
      text.rows = 3;
      text.placeholder = 'Enter text or a URL';
      content.append(field('Text or URL', text), button('Generate QR'));
      return;
    }
    if (id === 'age-calculator') {
      content.append(field('Date and time of birth', input('datetime-local', 'birthdate', { required: true })), button('Calculate age'));
      return;
    }
    if (id === 'file-size') {
      const amount = input('number', 'amount', { value: '1', min: '0', step: 'any', required: true });
      const from = select('from', [['B', 'Bytes (B)'], ['KB', 'Kilobytes (KB)'], ['MB', 'Megabytes (MB)'], ['GB', 'Gigabytes (GB)'], ['TB', 'Terabytes (TB)']]);
      const to = select('to', [['B', 'Bytes (B)'], ['KB', 'Kilobytes (KB)'], ['MB', 'Megabytes (MB)'], ['GB', 'Gigabytes (GB)'], ['TB', 'Terabytes (TB)']]);
      content.append(formGrid(field('Value', amount), field('From', from), field('To', to)), button('Convert size'));
      return;
    }
    if (id === 'letter-maker') {
      content.append(
        formGrid(field('Sender', input('text', 'sender', { required: true })), field('Receiver', input('text', 'receiver', { required: true })), field('Subject', input('text', 'subject', { required: true }))),
        field('Letter body', Object.assign(el('textarea'), { name: 'body', rows: 9, required: true })),
        button('Preview letter'),
      );
      return;
    }
    if (id === 'vat-calculator') {
      content.append(formGrid(field('Amount (KES)', input('number', 'amount', { min: '0', step: '0.01', required: true })), field('Pricing', select('mode', [['exclusive', 'VAT-exclusive (add VAT)'], ['inclusive', 'VAT-inclusive (extract VAT)']]))), button('Calculate VAT'));
      return;
    }
    if (id === 'percentage-calculator') {
      content.append(formGrid(
        field('Calculation', select('mode', [['discount', 'Discount'], ['markup', 'Markup'], ['margin', 'Profit margin']])),
        field('Cost / original amount (KES)', input('number', 'base', { min: '0', step: '0.01', required: true })),
        field('Discount / markup / margin (%)', input('number', 'rate', { min: '0', max: '10000', step: '0.01', required: true })),
      ), button('Calculate'));
      return;
    }
    if (id === 'invoice-maker') {
      const kind = select('kind', [['invoice', 'Invoice'], ['receipt', 'Receipt']]);
      const business = input('text', 'business', { required: true, value: 'B-STAR TECHNOLOGIES' });
      const clientName = input('text', 'customer', { required: true });
      const vat = input('checkbox', 'vat', { checked: true });
      const lines = el('div', 'tools-line-items');
      lines.dataset.lines = 'true';
      const controls = el('div', 'tools-actions');
      controls.append(button('Add item', 'add-line', true));
      content.append(formGrid(field('Document type', kind), field('Business name', business), field('Customer', clientName), field('Include 16% VAT', vat)), lines, controls, button('Preview and print'));
      addInvoiceLine(lines);
      return;
    }
    if (id === 'mpesa-sheet') {
      content.append(formGrid(
        field('Business / shop name', input('text', 'business', { value: 'B-STAR TECHNOLOGIES', required: true })),
        field('Payment type', select('kind', [['paybill', 'Paybill'], ['till', 'Buy Goods Till']])),
        field('Paybill / Till number', input('text', 'number', { required: true })),
        field('Account name / number', input('text', 'account')),
      ), button('Preview and print sheet'));
      return;
    }
    if (id === 'cv-checklist' || id === 'business-checklist') {
      const list = el('div', 'tools-checklist');
      list.dataset.checklist = id;
      const saved = readChecklists()[id] || [];
      CHECKLISTS[id].forEach((item, index) => {
        const label = el('label', 'tools-check-item');
        const checkbox = input('checkbox', `item-${index}`);
        checkbox.checked = saved.includes(index);
        checkbox.dataset.checkIndex = String(index);
        label.append(checkbox, el('span', '', item));
        list.append(label);
      });
      const progress = el('p', 'tools-check-progress');
      progress.dataset.progress = 'true';
      content.append(list, progress);
      updateChecklistProgress(list);
    }
  }

  function readChecklists() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      console.error('Could not read saved checklists:', error);
      return {};
    }
  }

  function saveChecklist(list) {
    const saved = readChecklists();
    saved[list.dataset.checklist] = [...list.querySelectorAll('[data-check-index]:checked')].map((item) => Number(item.dataset.checkIndex));
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(saved));
    updateChecklistProgress(list);
  }

  function updateChecklistProgress(list) {
    const total = list.querySelectorAll('[data-check-index]').length;
    const completed = list.querySelectorAll('[data-check-index]:checked').length;
    const progress = list.parentElement.querySelector('[data-progress]');
    progress.textContent = `${completed} of ${total} complete`;
  }

  function wireAspectLock(width, height, lock) {
    let ratio = Number(width.value) / Number(height.value);
    width.addEventListener('input', () => {
      if (lock.checked && ratio > 0) height.value = String(Math.max(1, Math.round(Number(width.value) / ratio)));
      ratio = Number(width.value) / Number(height.value);
    });
    height.addEventListener('input', () => {
      if (lock.checked && ratio > 0) width.value = String(Math.max(1, Math.round(Number(height.value) * ratio)));
      ratio = Number(width.value) / Number(height.value);
    });
  }

  function getForm() {
    return $('#tools-workspace-content');
  }

  function formValue(name) {
    return getForm().querySelector(`[name="${name}"]`);
  }

  function setOutput(message) {
    let box = $('#tools-workspace-content [data-result="true"]');
    if (!box) {
      box = output();
      box.dataset.result = 'true';
    }
    box.replaceChildren();
    box.textContent = message;
    setStatus('Completed.', 'success');
    return box;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = el('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function imageFromFile(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image file.')); };
      image.src = url;
    });
  }

  function canvasBlob(canvas, type = 'image/jpeg', quality = 0.9) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The browser could not encode the image.')), type, quality));
  }

  function fileBytes(file) {
    return file.arrayBuffer();
  }

  function requireLibraries(name) {
    if (name === 'pdf' && !window.PDFLib?.PDFDocument) throw new Error('PDF library did not load. Refresh and try again.');
    if (name === 'pdfjs' && !window.pdfjsLib?.getDocument) throw new Error('PDF renderer did not load. Refresh and try again.');
    if (name === 'qr' && typeof window.QRCode !== 'function') throw new Error('QR library did not load. Refresh and try again.');
  }

  async function loadPdf(file) {
    requireLibraries('pdfjs');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return window.pdfjsLib.getDocument({ data: new Uint8Array(await fileBytes(file)) }).promise;
  }

  async function compressPdf(file, scale, quality) {
    requireLibraries('pdf');
    const source = await loadPdf(file);
    const outputPdf = await window.PDFLib.PDFDocument.create();
    for (let index = 1; index <= source.numPages; index += 1) {
      setStatus(`Compressing PDF page ${index} of ${source.numPages}…`);
      const page = await source.getPage(index);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const jpg = await canvasBlob(canvas, 'image/jpeg', quality);
      const embedded = await outputPdf.embedJpg(await jpg.arrayBuffer());
      const size = page.getViewport({ scale: 1 });
      const outputPage = outputPdf.addPage([size.width, size.height]);
      outputPage.drawImage(embedded, { x: 0, y: 0, width: size.width, height: size.height });
      canvas.width = 1;
      canvas.height = 1;
    }
    const bytes = await outputPdf.save();
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${file.name.replace(/\.pdf$/i, '')}-compressed.pdf`);
    setStatus('Compressed PDF downloaded. Page rendering may flatten interactive forms and annotations.', 'success');
  }

  async function pdfToJpg(file) {
    const pdf = await loadPdf(file);
    for (let index = 1; index <= pdf.numPages; index += 1) {
      setStatus(`Rendering page ${index} of ${pdf.numPages}…`);
      const page = await pdf.getPage(index);
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      downloadBlob(await canvasBlob(canvas, 'image/jpeg', 0.92), `${file.name.replace(/\.pdf$/i, '')}-page-${index}.jpg`);
      canvas.width = 1;
      canvas.height = 1;
    }
    setStatus(`${pdf.numPages} JPG page${pdf.numPages === 1 ? '' : 's'} downloaded.`, 'success');
  }

  async function imagesToPdf(files) {
    requireLibraries('pdf');
    const pdf = await window.PDFLib.PDFDocument.create();
    for (const file of files) {
      const image = await imageFromFile(file);
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d').drawImage(image, 0, 0);
      const blob = await canvasBlob(canvas, 'image/jpeg', 0.95);
      const embedded = await pdf.embedJpg(await blob.arrayBuffer());
      const page = pdf.addPage([595.28, 841.89]);
      const margin = 28;
      const factor = Math.min((page.getWidth() - margin * 2) / embedded.width, (page.getHeight() - margin * 2) / embedded.height);
      const width = embedded.width * factor;
      const height = embedded.height * factor;
      page.drawImage(embedded, { x: (page.getWidth() - width) / 2, y: (page.getHeight() - height) / 2, width, height });
    }
    downloadBlob(new Blob([await pdf.save()], { type: 'application/pdf' }), 'images-a4.pdf');
    setStatus(`${files.length} image${files.length === 1 ? '' : 's'} added to the A4 PDF.`, 'success');
  }

  async function mergePdfs(files) {
    requireLibraries('pdf');
    const merged = await window.PDFLib.PDFDocument.create();
    for (const file of files) {
      const pdf = await window.PDFLib.PDFDocument.load(await fileBytes(file));
      const pages = await merged.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    }
    downloadBlob(new Blob([await merged.save()], { type: 'application/pdf' }), 'merged.pdf');
    setStatus(`${files.length} PDF files merged.`, 'success');
  }

  function parsePages(value, total) {
    const indexes = new Set();
    value.split(',').forEach((chunk) => {
      const match = chunk.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!match) throw new Error(`Invalid page range: ${chunk.trim()}`);
      const first = Number(match[1]);
      const last = Number(match[2] || match[1]);
      if (first < 1 || last < first || last > total) throw new Error(`Page numbers must be between 1 and ${total}.`);
      for (let page = first; page <= last; page += 1) indexes.add(page - 1);
    });
    if (!indexes.size) throw new Error('Enter at least one page number.');
    return [...indexes].sort((a, b) => a - b);
  }

  async function splitPdf(file, pagesText) {
    requireLibraries('pdf');
    const source = await window.PDFLib.PDFDocument.load(await fileBytes(file));
    const indexes = parsePages(pagesText, source.getPageCount());
    const split = await window.PDFLib.PDFDocument.create();
    (await split.copyPages(source, indexes)).forEach((page) => split.addPage(page));
    downloadBlob(new Blob([await split.save()], { type: 'application/pdf' }), `${file.name.replace(/\.pdf$/i, '')}-pages.pdf`);
    setStatus(`${indexes.length} page${indexes.length === 1 ? '' : 's'} extracted.`, 'success');
  }

  async function makePassportPhoto(file, size, dpi, background) {
    const image = await imageFromFile(file);
    const ratio = size === '2x2' ? 1 : 35 / 45;
    const outputWidth = size === '2x2' ? dpi * 2 : Math.round(dpi * 35 / 25.4);
    const outputHeight = size === '2x2' ? dpi * 2 : Math.round(dpi * 45 / 25.4);
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    context.fillStyle = background;
    context.fillRect(0, 0, outputWidth, outputHeight);
    const cropWidth = image.naturalWidth / image.naturalHeight > ratio ? image.naturalHeight * ratio : image.naturalWidth;
    const cropHeight = image.naturalWidth / image.naturalHeight > ratio ? image.naturalHeight : image.naturalWidth / ratio;
    const sx = (image.naturalWidth - cropWidth) / 2;
    const sy = (image.naturalHeight - cropHeight) / 2;
    context.drawImage(image, sx, sy, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);
    downloadBlob(await canvasBlob(canvas, 'image/jpeg', 0.95), `passport-${size}-${dpi}dpi.jpg`);
    addPreview(canvas);
    setStatus(`${outputWidth} × ${outputHeight} px at ${dpi} DPI. The photo is center-cropped; adjust the source framing before upload if needed.`, 'success');
  }

  async function compressImage(file, quality) {
    const image = await imageFromFile(file);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    const blob = await canvasBlob(canvas, 'image/jpeg', quality);
    downloadBlob(blob, `${file.name.replace(/\.[^.]+$/, '')}-compressed.jpg`);
    addPreview(canvas);
    const pct = Math.round(100 * blob.size / file.size);
    const targetKb = Number(formValue('targetKb').value);
    const targetMessage = targetKb > 0 ? ` · ${blob.size <= targetKb * 1024 ? 'Within' : 'Above'} the ${targetKb} KB target` : '';
    setStatus(`${formatBytes(file.size)} → ${formatBytes(blob.size)} (${pct}% of original)${targetMessage}.`, 'success');
  }

  async function resizeImage(file, width, height, type = 'image/png') {
    const image = await imageFromFile(file);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (type === 'image/jpeg') {
      context.fillStyle = '#fff';
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image, 0, 0, width, height);
    downloadBlob(await canvasBlob(canvas, type, 0.92), `converted-${width}x${height}.${type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'}`);
    addPreview(canvas);
    setStatus(`Saved ${width} × ${height} ${type.replace('image/', '').toUpperCase()} image.`, 'success');
  }

  function addPreview(canvas) {
    const preview = document.createElement('canvas');
    preview.className = 'tools-preview';
    preview.width = canvas.width;
    preview.height = canvas.height;
    preview.getContext('2d').drawImage(canvas, 0, 0);
    $('#tools-workspace-content').append(preview);
  }

  async function loadCropImage(file, canvas) {
    if (!file) return;
    const image = await imageFromFile(file);
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    cropState = { image, rect: null, start: null };
    canvas.dataset.ready = 'true';
    canvas.onpointerdown = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * canvas.width / rect.width;
      const y = (event.clientY - rect.top) * canvas.height / rect.height;
      cropState.start = { x, y };
      cropState.rect = { x, y, width: 0, height: 0 };
      canvas.setPointerCapture(event.pointerId);
    };
    canvas.onpointermove = (event) => {
      if (!cropState?.start) return;
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * canvas.width / rect.width;
      const y = (event.clientY - rect.top) * canvas.height / rect.height;
      cropState.rect = {
        x: Math.min(cropState.start.x, x),
        y: Math.min(cropState.start.y, y),
        width: Math.abs(x - cropState.start.x),
        height: Math.abs(y - cropState.start.y),
      };
      drawCropSelection(canvas);
    };
    canvas.onpointerup = () => {
      if (cropState) cropState.start = null;
    };
  }

  function drawCropSelection(canvas) {
    if (!cropState) return;
    const context = canvas.getContext('2d');
    context.drawImage(cropState.image, 0, 0, canvas.width, canvas.height);
    const { x, y, width, height } = cropState.rect;
    context.fillStyle = 'rgba(0,0,0,.42)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.clearRect(x, y, width, height);
    context.drawImage(cropState.image, x / canvas.width * cropState.image.naturalWidth, y / canvas.height * cropState.image.naturalHeight, width / canvas.width * cropState.image.naturalWidth, height / canvas.height * cropState.image.naturalHeight, x, y, width, height);
    context.strokeStyle = '#c7f24d';
    context.lineWidth = Math.max(2, canvas.width / 500);
    context.strokeRect(x, y, width, height);
  }

  async function cropImage() {
    const rect = cropState?.rect;
    if (!rect || rect.width < 2 || rect.height < 2) throw new Error('Choose a crop area by dragging over the image.');
    const previewCanvas = $('[data-crop-canvas]');
    const scaleX = cropState.image.naturalWidth / previewCanvas.width;
    const scaleY = cropState.image.naturalHeight / previewCanvas.height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(rect.width * scaleX);
    canvas.height = Math.round(rect.height * scaleY);
    canvas.getContext('2d').drawImage(cropState.image, rect.x * scaleX, rect.y * scaleY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    downloadBlob(await canvasBlob(canvas, 'image/png'), 'cropped-image.png');
    setStatus(`Crop saved: ${canvas.width} × ${canvas.height} px.`, 'success');
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const unit = 1024;
    const names = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(names.length - 1, Math.floor(Math.log(bytes) / Math.log(unit)));
    return `${(bytes / unit ** index).toFixed(index ? 2 : 0)} ${names[index]}`;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 }).format(value);
  }

  function calculateAge(birthText) {
    const birth = new Date(birthText);
    const now = new Date();
    if (Number.isNaN(birth.getTime()) || birth > now) throw new Error('Enter a valid date of birth that is not in the future.');
    const addCalendarMonths = (date, monthsToAdd) => {
      const monthStart = new Date(date.getFullYear(), date.getMonth() + monthsToAdd, 1, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
      const day = Math.min(date.getDate(), new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate());
      monthStart.setDate(day);
      return monthStart;
    };
    let years = now.getFullYear() - birth.getFullYear();
    let anchor = addCalendarMonths(birth, years * 12);
    if (anchor > now) { years -= 1; anchor = addCalendarMonths(birth, years * 12); }
    let months = (now.getFullYear() - anchor.getFullYear()) * 12 + now.getMonth() - anchor.getMonth();
    let monthAnchor = addCalendarMonths(anchor, months);
    if (monthAnchor > now) { months -= 1; monthAnchor = addCalendarMonths(anchor, months); }
    const days = Math.floor((now.getTime() - monthAnchor.getTime()) / 86400000);
    const hours = Math.floor((now.getTime() - birth.getTime()) / 3600000);
    const ageYears = now.getFullYear() - birth.getFullYear();
    let nextBirthday = addCalendarMonths(birth, ageYears * 12);
    if (nextBirthday <= now) nextBirthday = addCalendarMonths(birth, (ageYears + 1) * 12);
    const dayCount = Math.ceil((nextBirthday.getTime() - now.getTime()) / 86400000);
    return { years, months, days, hours, dayCount };
  }

  function printSheet(title, markup) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('Allow pop-ups to print or save this document.');
    const safeTitle = title.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>body{margin:0;color:#15171a;font:14px/1.6 Arial,sans-serif}.sheet{width:210mm;min-height:297mm;margin:auto;padding:22mm;box-sizing:border-box}h1,h2{margin:0 0 20px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:9px;border-bottom:1px solid #ccc;text-align:left}@media print{.sheet{margin:0}}</style></head><body><main class="sheet">${markup}</main><script>window.onload=()=>window.print()<\/script></body></html>`);
    printWindow.document.close();
  }

  function addInvoiceLine(container) {
    const row = el('div', 'tools-line-item');
    const item = input('text', 'item', { required: true, placeholder: 'Item / service' });
    const quantity = input('number', 'quantity', { min: '1', value: '1', step: '1', required: true });
    const price = input('number', 'price', { min: '0', value: '0', step: '0.01', required: true });
    const remove = el('button', '', '×');
    remove.type = 'button';
    remove.dataset.toolAction = 'remove-line';
    remove.setAttribute('aria-label', 'Remove item');
    row.append(field('Description', item), field('Qty', quantity), field('KES each', price), remove);
    container.append(row);
  }

  function invoicePreview() {
    const lines = [...getForm().querySelectorAll('.tools-line-item')].map((row) => {
      const item = row.querySelector('[name="item"]').value.trim();
      const quantity = Number(row.querySelector('[name="quantity"]').value);
      const price = Number(row.querySelector('[name="price"]').value);
      if (!item || quantity < 1 || price < 0) throw new Error('Enter a description, positive quantity, and non-negative price for every item.');
      return { item, quantity, price, total: quantity * price };
    });
    if (!lines.length) throw new Error('Add at least one line item.');
    const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
    const vat = formValue('vat').checked ? subtotal * 0.16 : 0;
    const total = subtotal + vat;
    const kind = formValue('kind').value;
    const business = formValue('business').value.trim();
    const customer = formValue('customer').value.trim();
    const escaped = (text) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const rows = lines.map((line) => `<tr><td>${escaped(line.item)}</td><td>${line.quantity}</td><td>KES ${formatNumber(line.price)}</td><td>KES ${formatNumber(line.total)}</td></tr>`).join('');
    const markup = `<h1>${kind === 'receipt' ? 'Receipt' : 'Invoice'}</h1><h2>${escaped(business)}</h2><p>Customer: ${escaped(customer)}<br>Date: ${new Date().toLocaleDateString('en-KE')}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p>Subtotal: KES ${formatNumber(subtotal)}<br>VAT (16%): KES ${formatNumber(vat)}<br><strong>Total: KES ${formatNumber(total)}</strong></p>`;
    printSheet(`${kind} - ${business}`, markup);
    setStatus(`${kind === 'receipt' ? 'Receipt' : 'Invoice'} opened for printing.`, 'success');
  }

  function runCurrentTool() {
    const id = currentTool;
    const form = getForm();
    if (id === 'compress-pdf') return compressPdf(formValue('pdf').files[0], Number(formValue('scale').value), Number(formValue('quality').value));
    if (id === 'pdf-to-jpg') return pdfToJpg(formValue('pdf').files[0]);
    if (id === 'pdf-merge') return mergePdfs([...formValue('files').files]);
    if (id === 'image-to-pdf') return imagesToPdf([...formValue('files').files]);
    if (id === 'pdf-split') return splitPdf(formValue('pdf').files[0], formValue('pages').value);
    if (id === 'passport-photo') return makePassportPhoto(formValue('image').files[0], formValue('size').value, Number(formValue('dpi').value), formValue('background').value);
    if (id === 'image-compress') return compressImage(formValue('image').files[0], Number(formValue('quality').value));
    if (id === 'image-resize') return resizeImage(formValue('image').files[0], Number(formValue('width').value), Number(formValue('height').value));
    if (id === 'format-converter') {
      const file = formValue('image').files[0];
      return imageFromFile(file).then((image) => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d').drawImage(image, 0, 0);
        const type = formValue('format').value;
        return canvasBlob(canvas, type, 0.92).then((blob) => {
          const ext = type === 'image/jpeg' ? 'jpg' : type.split('/')[1];
          downloadBlob(blob, `${file.name.replace(/\.[^.]+$/, '')}.${ext}`);
          addPreview(canvas);
          setStatus(`Converted to ${ext.toUpperCase()}.`, 'success');
        });
      });
    }
    if (id === 'image-crop') return cropImage();
    if (id === 'whatsapp-link') {
      const phone = normalizePhone(formValue('phone').value);
      if (!phone) throw new Error('Enter a phone number with a valid country code.');
      const url = `https://wa.me/${phone}${formValue('message').value.trim() ? `?text=${encodeURIComponent(formValue('message').value.trim())}` : ''}`;
      const box = setOutput(url);
      const anchor = el('a', '', 'Open WhatsApp link');
      anchor.href = url;
      anchor.dataset.copyUrl = 'true';
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      box.append(anchor, button('Copy link', 'copy-link', true));
      return;
    }
    if (id === 'qr-generator') {
      requireLibraries('qr');
      const text = formValue('text').value.trim();
      if (!text) throw new Error('Enter text or a URL for your QR code.');
      $('[data-output="true"]')?.remove();
      const wrap = el('div', 'tools-output');
      wrap.dataset.output = 'true';
      const target = el('div');
      wrap.append(target, button('Download QR PNG', 'download-qr', true));
      form.append(wrap);
      new window.QRCode(target, { text, width: 260, height: 260, colorDark: '#080b12', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.H });
      setStatus('QR code generated in your browser.', 'success');
      return;
    }
    if (id === 'age-calculator') {
      const age = calculateAge(formValue('birthdate').value);
      setOutput(`${age.years} years, ${age.months} months, ${age.days} days · ${formatNumber(age.hours)} hours lived · Next birthday in ${age.dayCount} days.`);
      return;
    }
    if (id === 'file-size') {
      const powers = { B: 0, KB: 1, MB: 2, GB: 3, TB: 4 };
      const amount = Number(formValue('amount').value);
      const from = formValue('from').value;
      const to = formValue('to').value;
      if (!Number.isFinite(amount) || amount < 0) throw new Error('Enter a valid non-negative size.');
      setOutput(`${formatNumber(amount)} ${from} = ${formatNumber(amount * 1024 ** (powers[from] - powers[to]))} ${to} (1 KB = 1024 B).`);
      return;
    }
    if (id === 'letter-maker') {
      const sender = formValue('sender').value.trim();
      const receiver = formValue('receiver').value.trim();
      const subject = formValue('subject').value.trim();
      const body = formValue('body').value.trim();
      const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
      printSheet(subject, `<p>${escapeHtml(sender)}<br>${new Date().toLocaleDateString('en-KE')}</p><p>${escapeHtml(receiver)}</p><h2>RE: ${escapeHtml(subject)}</h2><p>${escapeHtml(body).replace(/\n/g, '<br>')}</p><p>Yours sincerely,<br>${escapeHtml(sender)}</p>`);
      setStatus('Letter opened in a print-ready A4 window.', 'success');
      return;
    }
    if (id === 'vat-calculator') {
      const amount = Number(formValue('amount').value);
      if (amount < 0) throw new Error('Enter a non-negative amount.');
      const inclusive = formValue('mode').value === 'inclusive';
      const net = inclusive ? amount / 1.16 : amount;
      const vat = inclusive ? amount - net : amount * 0.16;
      const total = inclusive ? amount : amount + vat;
      setOutput(`Net amount: KES ${formatNumber(net)} · VAT (16%): KES ${formatNumber(vat)} · ${inclusive ? 'VAT-inclusive' : 'Total'}: KES ${formatNumber(total)}.`);
      return;
    }
    if (id === 'percentage-calculator') {
      const base = Number(formValue('base').value);
      const rate = Number(formValue('rate').value) / 100;
      const mode = formValue('mode').value;
      if (base < 0 || rate < 0 || !Number.isFinite(base * rate)) throw new Error('Enter valid non-negative values.');
      if (mode === 'discount') setOutput(`Discount: KES ${formatNumber(base * rate)} · Sale price: KES ${formatNumber(base * (1 - rate))}.`);
      else if (mode === 'markup') setOutput(`Markup: KES ${formatNumber(base * rate)} · Selling price: KES ${formatNumber(base * (1 + rate))}.`);
      else if (rate >= 1) throw new Error('Profit margin must be less than 100%.');
      else setOutput(`Selling price for a ${formatNumber(rate * 100)}% margin: KES ${formatNumber(base / (1 - rate))} · Profit: KES ${formatNumber(base / (1 - rate) - base)}.`);
      return;
    }
    if (id === 'invoice-maker') return invoicePreview();
    if (id === 'mpesa-sheet') {
      const business = formValue('business').value.trim();
      const kind = formValue('kind').value;
      const number = formValue('number').value.trim();
      const account = formValue('account').value.trim();
      const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
      printSheet('M-Pesa payment instructions', `<h1>${escapeHtml(business)}</h1><h2>PAY WITH M-PESA</h2><p><strong>${kind === 'paybill' ? 'PAYBILL' : 'BUY GOODS TILL'}</strong><br>${escapeHtml(number)}</p>${account ? `<p>Account: ${escapeHtml(account)}</p>` : ''}<p>1. Open M-Pesa on your phone.<br>2. Choose ${kind === 'paybill' ? 'Lipa na M-Pesa → Paybill' : 'Lipa na M-Pesa → Buy Goods and Services'}.<br>3. Enter the number shown above${account ? ' and the account number' : ''}.<br>4. Enter the amount and confirm the business name.</p><p>Always confirm the displayed business name before entering your PIN.</p>`);
      setStatus('M-Pesa payment sheet opened for printing.', 'success');
      return;
    }
  }

  function handleWorkspaceClick(event) {
    const action = event.target.closest('[data-tool-action]')?.dataset.toolAction;
    if (!action) return;
    try {
      if (action === 'run') {
        const required = getForm().querySelectorAll('[required]');
        for (const control of required) {
          if (control.type === 'file' && control.multiple ? !control.files.length : control.type === 'file' ? !control.files[0] : !control.value.trim()) {
            throw new Error('Complete all required fields before continuing.');
          }
        }
        for (const control of getForm().querySelectorAll('input[type="number"]')) {
          if (!control.required && control.value === '') continue;
          if (!Number.isFinite(Number(control.value)) || Number(control.value) < Number(control.min || -Infinity) || Number(control.value) > Number(control.max || Infinity)) {
            throw new Error(`Enter a valid value for ${control.closest('label')?.querySelector('span')?.textContent || 'the number field'}.`);
          }
        }
        setStatus('Working…');
        Promise.resolve(runCurrentTool()).catch((error) => {
          console.error(`Tool ${currentTool} failed:`, error);
          setStatus(error.message || 'The tool could not complete this operation.', 'error');
        });
      } else if (action === 'add-line') {
        addInvoiceLine($('[data-lines]'));
      } else if (action === 'remove-line') {
        const rows = [...getForm().querySelectorAll('.tools-line-item')];
        if (rows.length <= 1) throw new Error('Keep at least one item row.');
        event.target.closest('.tools-line-item').remove();
      } else if (action === 'copy-link') {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable. Copy the displayed link manually.');
        navigator.clipboard.writeText($('[data-copy-url]').href).then(() => setStatus('Link copied to clipboard.', 'success')).catch(() => setStatus('Clipboard access failed. Copy the displayed link manually.', 'error'));
      } else if (action === 'download-qr') {
        const qr = $('[data-output] canvas, [data-output] img');
        if (qr instanceof HTMLCanvasElement) qr.toBlob((blob) => { if (blob) downloadBlob(blob, 'qr-code.png'); else setStatus('The browser could not export the QR image.', 'error'); });
        else if (qr?.src) fetch(qr.src).then((response) => response.blob()).then((blob) => downloadBlob(blob, 'qr-code.png')).catch((error) => setStatus(`Could not download QR code: ${error.message}`, 'error'));
      }
    } catch (error) {
      setStatus(error.message, 'error');
    }
  }

  async function submitPaywall(event) {
    event.preventDefault();
    if (!pendingToolId) return;
    const form = event.currentTarget;
    const phone = normalizePhone(form.elements.phone.value);
    const code = form.elements.mpesaCode.value.trim().toUpperCase();
    if (!phone) { setPaywallStatus('Enter a valid phone number, for example 07XX XXX XXX.', 'error'); return; }
    if (!/^[A-Z0-9]{8,20}$/.test(code)) { setPaywallStatus('Enter a valid M-Pesa transaction code (8–20 letters or numbers).', 'error'); return; }
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const client = await getClient();
      const { error } = await client.from('tool_subscriptions').insert({
        phone,
        tool_id: pendingToolId,
        mpesa_code: code,
        status: 'pending_approval',
      });
      if (error) throw new Error(error.message);
      localStorage.setItem(STORAGE_PHONE, phone);
      setPaywallStatus('Payment submitted for review. Your tool will unlock after an administrator verifies the M-Pesa transaction.', 'success');
      form.elements.mpesaCode.value = '';
    } catch (error) {
      console.error('Could not submit tool payment:', error);
      setPaywallStatus(`Could not submit payment: ${error.message}`, 'error');
    } finally {
      submit.disabled = false;
    }
  }

  async function renderSubscriptions() {
    const list = $('#tool-subscriptions-list');
    const count = $('#tool-subscriptions-count');
    list.replaceChildren(el('p', 'empty-state', 'Loading payment requests…'));
    const client = await getClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw new Error(sessionError.message);
    if (sessionData.session?.user?.app_metadata?.role !== 'admin') throw new Error('Administrator access required.');
    const { data, error } = await client.from('tool_subscriptions')
      .select('id,phone,tool_id,mpesa_code,status,created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Unable to load tool payments: ${error.message}`);
    list.replaceChildren();
    count.textContent = `(${data.length})`;
    if (!data.length) list.append(el('p', 'empty-state', 'No tool payments have been submitted.'));
    data.forEach((subscription) => {
      const row = el('article', 'tools-admin-row');
      const details = el('div');
      const title = el('strong', '', TITLES.get(subscription.tool_id) || subscription.tool_id);
      const date = new Date(subscription.created_at);
      const dateText = Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
      const meta = el('small', '', `${subscription.phone} · M-Pesa: ${subscription.mpesa_code} · ${subscription.status} · ${dateText}`);
      details.append(title, meta);
      const actions = el('div', 'tools-admin-actions');
      if (subscription.status !== 'active') {
        const enable = button('Enable Service', 'enable-subscription');
        enable.className = 'admin-action activate';
        enable.dataset.subscriptionId = subscription.id;
        actions.append(enable);
      } else {
        actions.append(el('span', 'tools-check-progress', 'Active'));
      }
      const notify = el('a', '', 'Notify via WhatsApp');
      notify.href = `https://wa.me/${subscription.phone}?text=${encodeURIComponent(`Hi, your ${TITLES.get(subscription.tool_id) || 'Digital Utilities'} service is active. Thank you for choosing B-STAR TECHNOLOGIES.`)}`;
      notify.target = '_blank';
      notify.rel = 'noopener noreferrer';
      actions.append(notify);
      row.append(details, actions);
      list.append(row);
    });
  }

  async function handleSubscriptionAction(event) {
    const enable = event.target.closest('[data-tool-action="enable-subscription"]');
    if (!enable) return;
    enable.disabled = true;
    try {
      const client = await getClient();
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw new Error(sessionError.message);
      if (sessionData.session?.user?.app_metadata?.role !== 'admin') throw new Error('Administrator access required.');
      const { error } = await client.from('tool_subscriptions').update({ status: 'active' }).eq('id', enable.dataset.subscriptionId);
      if (error) throw new Error(error.message);
      await renderSubscriptions();
    } catch (error) {
      console.error('Could not activate tool subscription:', error);
      const adminStatus = $('#admin-status');
      adminStatus.textContent = error.message;
      adminStatus.dataset.state = 'error';
    } finally {
      if (enable.isConnected) enable.disabled = false;
    }
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  function init() {
    renderCards();
    $('#tools-categories').addEventListener('click', (event) => {
      const card = event.target.closest('[data-tool-id]');
      if (card) requestTool(card.dataset.toolId).catch((error) => {
        console.error('Could not open tool:', error);
        setPaywallStatus(error.message, 'error');
        if (!$('#tools-paywall').open) $('#tools-paywall').showModal();
      });
    });
    $('#tools-paywall-form').addEventListener('submit', submitPaywall);
    $('#tools-workspace-content').addEventListener('click', handleWorkspaceClick);
    $('#tools-workspace-content').addEventListener('change', (event) => {
      if (event.target.matches('[data-check-index]')) saveChecklist(event.target.closest('[data-checklist]'));
    });
    $('#tools-workspace-close').addEventListener('click', () => closeDialog($('#tools-workspace')));
    $('#tools-paywall-close').addEventListener('click', () => closeDialog($('#tools-paywall')));
    $('#tools-workspace').addEventListener('close', () => document.body.classList.remove('panel-open'));
    $('#tools-paywall').addEventListener('close', () => document.body.classList.remove('panel-open'));
    $('#tools-workspace').addEventListener('cancel', () => document.body.classList.remove('panel-open'));
    $('#tools-paywall').addEventListener('cancel', () => document.body.classList.remove('panel-open'));
    $('#tools-workspace').addEventListener('click', (event) => { if (event.target === event.currentTarget) closeDialog(event.currentTarget); });
    $('#tools-paywall').addEventListener('click', (event) => { if (event.target === event.currentTarget) closeDialog(event.currentTarget); });
    $('#tool-subscriptions-panel').addEventListener('click', async (event) => {
      if (event.target.closest('#refresh-tool-subscriptions')) {
        try { await renderSubscriptions(); } catch (error) { $('#tool-subscriptions-list').replaceChildren(el('p', 'empty-state', error.message)); }
      } else await handleSubscriptionAction(event);
    });
    document.querySelectorAll('[data-admin-tab="tool-subscriptions"]').forEach((tab) => tab.addEventListener('click', () => {
      renderSubscriptions().catch((error) => {
        console.error('Could not load tool subscriptions:', error);
        $('#tool-subscriptions-list').replaceChildren(el('p', 'empty-state', error.message));
      });
    }));
    document.querySelectorAll('.tools-workspace,.tools-paywall').forEach((dialog) => dialog.addEventListener('close', () => {
      if (!$('#admin-dialog').open && $('#cart-drawer').hidden) document.body.classList.remove('panel-open');
    }));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
