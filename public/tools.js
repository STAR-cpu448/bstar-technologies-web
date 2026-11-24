(() => {
  'use strict';

  const FEE = 10;
  const STORAGE_PHONE = 'bstar-tools-phone-v1';
  const CHECKLIST_KEY = 'bstar-tools-checklists-v1';
  const STUDIO_CANVAS_PRESETS = [
    ['1200x900', 'Landscape · 1200 × 900'],
    ['1080x1080', 'Square post · 1080 × 1080'],
    ['1080x1920', 'Story · 1080 × 1920'],
    ['1920x1080', 'Widescreen · 1920 × 1080'],
  ];
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
    { name: 'Business', tools: [
      ['business-email-transformer', 'Business Email Transformer', 'Turn rough notes into a polished corporate email.', '✉'],
    ] },
    { name: 'Design', tools: [
      ['dira-image-generator', 'DIRA AI IMAGE GENERATOR', 'Generate images from your exact prompt. Base includes 5 images per day per IP; Pro is KES 700/month for up to 60 images per approved phone.', '✦'],
    ] },
  ];

  const TITLES = new Map(TOOL_GROUPS.flatMap((group) => group.tools.map(([id, title]) => [id, title])));
  const DESCRIPTIONS = new Map(TOOL_GROUPS.flatMap((group) => group.tools.map(([id, title, description]) => [id, description])));
  const GROUPS = new Map(TOOL_GROUPS.flatMap((group) => group.tools.map(([id]) => [id, group.name])));
  const TOOL_ART = new Map([
    ['compress-pdf', 'pdf-compress'],
    ['pdf-to-jpg', 'pdf-to-image'],
    ['image-to-pdf', 'image-to-pdf'],
    ['pdf-merge', 'pdf-merge'],
    ['pdf-split', 'pdf-split'],
    ['passport-photo', 'passport-photo'],
    ['image-compress', 'image-compress'],
    ['image-resize', 'image-resize'],
    ['format-converter', 'format-converter'],
    ['image-crop', 'image-crop'],
    ['whatsapp-link', 'whatsapp-link'],
    ['qr-generator', 'qr-generator'],
    ['age-calculator', 'age-calculator'],
    ['file-size', 'file-size'],
    ['letter-maker', 'letter-maker'],
    ['vat-calculator', 'vat-calculator'],
    ['percentage-calculator', 'percentage-calculator'],
    ['invoice-maker', 'invoice-maker'],
    ['mpesa-sheet', 'mpesa-sheet'],
    ['cv-checklist', 'cv-checklist'],
    ['business-checklist', 'business-checklist'],
    ['business-email-transformer', 'business-email'],
    ['dira-image-generator', 'dira-image-generator'],
  ]);
  const TOOL_ARTWORK = {
    'dira-image-generator': '<g class="dira-image-generator-art"><rect x="37" y="20" width="146" height="108" rx="12" fill="#0b1422" stroke="#70d7f0" stroke-opacity=".8" stroke-width="2"/><rect x="47" y="30" width="126" height="88" rx="6" fill="#14253a"/><circle cx="146" cy="50" r="10" fill="#c9f36a"/><path d="m53 104 28-31 19 20 17-17 47 39H53z" fill="#1e6680"/><path d="m53 112 31-23 23 18 18-14 39 25H53z" fill="#42c6d9"/><path d="m84 47 5 11 12 1-9 8 3 12-11-6-10 6 2-12-9-8 12-1z" fill="#ffd46a"/><path d="M66 38h39" stroke="#f4f7fc" stroke-opacity=".72" stroke-width="3" stroke-linecap="round"/><circle cx="31" cy="43" r="4" fill="#c9f36a"/><circle cx="194" cy="94" r="5" fill="#ff8c74"/><path d="M21 75h14m-7-7v14M187 36h14m-7-7v14" stroke="#70d7f0" stroke-width="2" stroke-linecap="round"/></g>',
    'pdf-compress': '<g transform="translate(57 24)"><path class="paper-back" d="M22 8h55l24 23v75H22z"/><path class="paper-fold" d="M77 8v24h24"/><path class="paper-front" d="M9 17h55l24 23v75H9z"/><path class="paper-fold" d="M64 17v24h24"/><path class="accent-stroke" d="M25 57h47M25 68h36M25 79h27"/><path class="accent-fill" d="m52 91 8 8 17-19-5-5-12 13-4-4z"/></g><path class="accent-stroke" d="M54 132h132"/>',
    'pdf-to-image': '<g transform="translate(50 20)"><path class="paper-front" d="M22 7h58l23 23v72H22z"/><path class="paper-fold" d="M80 7v24h23"/><rect class="screen" x="34" y="46" width="56" height="41" rx="4"/><circle class="accent-fill" cx="73" cy="58" r="6"/><path class="accent-fill" d="m38 80 17-17 11 11 8-7 12 13z"/></g><path class="accent-stroke" d="M143 66h28m-8-8 8 8-8 8"/>',
    'image-to-pdf': '<g transform="translate(46 20)"><rect class="paper-back" x="23" y="13" width="60" height="78" rx="5" transform="rotate(-9 23 13)"/><rect class="screen" x="21" y="25" width="55" height="43" rx="4"/><circle class="accent-fill" cx="60" cy="37" r="6"/><path class="accent-fill" d="m24 61 17-18 10 10 8-7 14 15z"/><path class="paper-front" d="M90 37h43l18 19v55H90z"/><path class="paper-fold" d="M133 37v20h18"/><path class="accent-stroke" d="M101 76h37m-37 10h29"/>',
    'pdf-merge': '<g transform="translate(42 20)"><path class="paper-back" d="M18 12h43l18 18v59H18z"/><path class="paper-front" d="M86 12h43l18 18v59H86z"/><path class="paper-fold" d="M61 12v18h18m50-18v18h18"/><path class="accent-stroke" d="M32 46h24m-24 10h20m48-10h24m-24 10h20"/><path class="accent-fill" d="m70 83 11 12 11-12h-7V68h-8v15z"/></g>',
    'pdf-split': '<g transform="translate(63 16)"><path class="paper-front" d="M22 8h56l23 23v80H22z"/><path class="paper-fold" d="M78 8v24h23"/><path class="accent-stroke" d="M36 49h47M36 60h38M36 71h47M36 82h31"/><path class="accent-stroke" d="M50 95v20m0 0-7-7m7 7 7-7m23-13v13m0 0-7-7m7 7 7-7"/></g>',
    'passport-photo': '<g transform="translate(50 17)"><rect class="paper-back" x="16" y="12" width="108" height="100" rx="8"/><rect class="screen" x="25" y="21" width="90" height="82" rx="4"/><circle class="accent-fill" cx="70" cy="48" r="17"/><path class="accent-fill" d="M40 95c3-20 14-30 30-30s27 10 30 30z"/><path class="accent-stroke" d="M19 38v-9h9m87 0h9v9M19 84v9h9m87 0h9v-9"/></g>',
    'image-compress': '<g transform="translate(40 25)"><rect class="paper-back" x="20" y="20" width="80" height="64" rx="8" transform="rotate(-8 20 20)"/><rect class="screen" x="35" y="24" width="80" height="64" rx="8"/><circle class="accent-fill" cx="92" cy="41" r="8"/><path class="accent-fill" d="m42 78 22-24 16 15 11-10 18 19z"/><path class="accent-stroke" d="M130 42h28m-8-8 8 8-8 8M158 72h-28m8 8-8-8 8-8"/></g>',
    'image-resize': '<g transform="translate(47 18)"><rect class="screen" x="28" y="24" width="94" height="76" rx="7"/><circle class="accent-fill" cx="94" cy="41" r="8"/><path class="accent-fill" d="m37 88 25-29 17 18 13-13 22 24z"/><path class="accent-stroke" d="M18 42V20h22m87 0h22v22M18 83v22h22m87 0h22V83"/></g>',
    'format-converter': '<g transform="translate(43 20)"><path class="paper-back" d="M20 14h49l18 19v72H20z"/><path class="paper-front" d="M77 14h49l18 19v72H77z"/><path class="paper-fold" d="M69 14v20h18m50-20v20h18"/><text class="svg-label" x="35" y="76">JPG</text><text class="svg-label svg-label-alt" x="91" y="76">WEBP</text><path class="accent-stroke" d="M65 53h20m-6-6 6 6-6 6"/></g>',
    'image-crop': '<g transform="translate(47 19)"><rect class="screen" x="22" y="20" width="105" height="84" rx="7"/><circle class="accent-fill" cx="99" cy="38" r="8"/><path class="accent-fill" d="m30 94 27-32 19 18 16-14 27 28z"/><path class="accent-stroke" d="M40 20H22v18m87-18h18v18M22 86v18h18m87-18v18h-18"/></g>',
    'whatsapp-link': '<g transform="translate(68 9)"><rect class="device" x="20" y="6" width="72" height="120" rx="14"/><rect class="screen" x="26" y="19" width="60" height="94" rx="8"/><path class="accent-fill" d="M36 43h38a9 9 0 0 1 0 18H52l-10 8v-8h-6a9 9 0 0 1 0-18z"/><path class="paper-front" d="M42 70h31a8 8 0 0 1 0 16H59l-9 7v-7h-8a8 8 0 0 1 0-16z"/><circle class="accent-fill" cx="51" cy="97" r="2"/><circle class="accent-fill" cx="58" cy="97" r="2"/></g>',
    'qr-generator': '<g transform="translate(60 16)"><rect class="paper-front" x="15" y="10" width="100" height="100" rx="10"/><g class="ink-fill"><path d="M27 22h28v28H27zm7 7v14h14V29zm48-7h28v28H82zm7 7v14h14V29zM27 70h28v28H27zm7 7v14h14V77zM66 22h8v8h-8zm0 16h8v8h-8zm0 16h8v8h-8zm16 8h8v8h-8zm16 0h8v8h-8zm-32 8h8v8h-8zm16 8h8v8h-8zm16 8h8v8h-8zm16 0h8v8h-8zm-32 8h8v8h-8zm16 8h8v8h-8z"/></g></g>',
    'age-calculator': '<g transform="translate(47 20)"><rect class="paper-front" x="20" y="18" width="108" height="88" rx="10"/><path class="accent-fill" d="M20 29a11 11 0 0 1 11-11h86a11 11 0 0 1 11 11v12H20z"/><path class="ink-stroke" d="M44 13v15m60-15v15"/><circle class="accent-stroke" cx="74" cy="75" r="22"/><path class="accent-stroke" d="M74 61v15l12 7"/><circle class="accent-fill" cx="112" cy="89" r="4"/></g>',
    'file-size': '<g transform="translate(42 21)"><rect class="paper-back" x="18" y="16" width="68" height="88" rx="8"/><path class="paper-front" d="M72 16h37l19 19v69H72z"/><path class="paper-fold" d="M109 16v20h19"/><path class="accent-stroke" d="M85 57h29M85 68h29M85 79h29"/><rect class="accent-fill" x="84" y="88" width="7" height="8" rx="2"/><rect class="accent-fill" x="95" y="82" width="7" height="14" rx="2"/><rect class="accent-fill" x="106" y="73" width="7" height="23" rx="2"/></g>',
    'letter-maker': '<g transform="translate(40 23)"><path class="paper-back" d="M33 8h61l20 20v91H33z"/><path class="paper-fold" d="M94 8v21h20"/><path class="accent-stroke" d="M48 47h51M48 59h51M48 71h43M48 83h47"/><rect class="paper-front" x="18" y="76" width="76" height="49" rx="8"/><path class="accent-stroke" d="m22 82 34 25 34-25"/></g>',
    'vat-calculator': '<g transform="translate(43 14)"><rect class="device" x="33" y="7" width="82" height="112" rx="11"/><rect class="screen" x="42" y="18" width="64" height="29" rx="5"/><text class="svg-label" x="53" y="39">16%</text><g class="key-fill"><rect x="43" y="56" width="15" height="13" rx="3"/><rect x="65" y="56" width="15" height="13" rx="3"/><rect x="87" y="56" width="15" height="13" rx="3"/><rect x="43" y="76" width="15" height="13" rx="3"/><rect x="65" y="76" width="15" height="13" rx="3"/><rect x="87" y="76" width="15" height="13" rx="3"/><rect x="43" y="96" width="15" height="13" rx="3"/><rect x="65" y="96" width="37" height="13" rx="3"/></g></g>',
    'percentage-calculator': '<g transform="translate(42 23)"><circle class="paper-back" cx="67" cy="59" r="45"/><path class="accent-fill" d="M67 14a45 45 0 0 1 41 63L67 59z"/><circle class="paper-front" cx="67" cy="59" r="26"/><circle class="accent-fill" cx="49" cy="48" r="6"/><circle class="accent-fill" cx="85" cy="70" r="6"/><path class="accent-stroke" d="m45 82 45-46"/><rect class="paper-front" x="113" y="63" width="47" height="39" rx="8"/><text class="svg-label" x="121" y="89">%</text></g>',
    'invoice-maker': '<g transform="translate(47 13)"><path class="paper-front" d="M24 7h87l18 19v100H24z"/><path class="paper-fold" d="M111 7v20h18"/><text class="svg-label svg-label-alt" x="40" y="39">INVOICE</text><path class="accent-stroke" d="M40 50h70M40 63h48M40 75h70M40 87h53"/><path class="paper-back" d="M87 95h42v22H87z"/><path class="accent-stroke" d="M96 106h22"/></g>',
    'mpesa-sheet': '<g transform="translate(50 16)"><path class="paper-front" d="M28 7h81l17 18v108H28z"/><path class="paper-fold" d="M109 7v19h17"/><text class="svg-label svg-label-alt" x="43" y="39">PAYMENT</text><path class="accent-stroke" d="M44 51h60M44 61h47M44 76h58M44 87h38"/><circle class="accent-fill" cx="103" cy="104" r="14"/><path class="ink-stroke" d="m96 104 5 5 10-12"/></g>',
    'cv-checklist': '<g transform="translate(43 15)"><rect class="device" x="34" y="16" width="90" height="104" rx="10"/><rect class="paper-front" x="43" y="25" width="72" height="87" rx="5"/><circle class="accent-fill" cx="60" cy="47" r="10"/><path class="ink-stroke" d="M50 64h21M53 72h15"/><path class="accent-stroke" d="m83 50 4 4 7-9m-11 26 4 4 7-9m-11 26 4 4 7-9"/><path class="ink-stroke" d="M99 52h8M99 78h8M99 104h8"/></g>',
    'business-checklist': '<g transform="translate(42 16)"><rect class="device" x="31" y="17" width="96" height="103" rx="10"/><rect class="paper-front" x="41" y="26" width="76" height="85" rx="5"/><path class="accent-fill" d="M59 44h40v25H59z"/><path class="ink-stroke" d="M66 61v-8l13-8 13 8v8m-17 0v-8h8v8"/><path class="accent-stroke" d="m55 82 4 4 7-9m9 5h24m-44 12 4 4 7-9m9 5h24"/></g>',
    'business-email': '<g transform="translate(37 23)"><path class="paper-back" d="M54 8h61l18 19v90H54z"/><path class="paper-fold" d="M115 8v20h18"/><path class="accent-stroke" d="M69 47h49M69 58h43M69 69h48M69 80h37"/><rect class="paper-front" x="17" y="78" width="83" height="52" rx="9"/><path class="accent-stroke" d="m21 84 37 26 38-26"/><path class="accent-fill" d="m106 44 5 5 10-12"/></g>',
    'graphic-design-studio': '<g class="studio-artwork"><g transform="rotate(-8 41 79)"><rect x="14" y="43" width="55" height="74" rx="7" fill="#13243a" stroke="#00c6ff" stroke-opacity=".65"/><rect x="21" y="51" width="41" height="57" rx="3" fill="#1b3048"/><circle cx="41" cy="70" r="11" fill="#c7f24d"/><path d="M25 99 39 82l9 10 7-7 7 11v12H25z" fill="#ff795c"/></g><g transform="rotate(8 184 76)"><rect x="162" y="43" width="49" height="68" rx="7" fill="#15263b" stroke="#ff795c" stroke-opacity=".7"/><rect x="170" y="52" width="33" height="28" rx="4" fill="#102f43"/><circle cx="186" cy="66" r="8" fill="#00c6ff"/><path d="M170 91h28M170 98h20" stroke="#c7f24d" stroke-width="3" stroke-linecap="round"/></g><rect x="44" y="15" width="133" height="119" rx="10" fill="#0b1422" stroke="#8ba1bd" stroke-opacity=".78" stroke-width="2"/><rect x="51" y="22" width="119" height="105" rx="5" fill="#fff1d2"/><path d="M51 83 81 53l20 18 18-21 51 42v35H51z" fill="#183c50"/><path d="m51 101 28-23 23 19 18-17 50 31v16H51z" fill="#00aeca"/><path d="m112 45 14-14 14 14-14 14z" fill="#ff795c"/><circle cx="152" cy="43" r="9" fill="#c7f24d"/><path d="M68 41h17v18H68z" fill="#c7f24d"/><path d="M72 45h9v10h-9z" fill="#10243a"/><text x="92" y="52" fill="#10243a" font-family="Arial,sans-serif" font-size="12" font-weight="800" letter-spacing="1">DIRA</text><text x="92" y="62" fill="#35516a" font-family="Arial,sans-serif" font-size="4.5" font-weight="700" letter-spacing="1">DESIGN STUDIO</text><path d="M68 72h34" stroke="#10243a" stroke-width="2" stroke-linecap="round"/><path d="M68 78h22" stroke="#00aeca" stroke-width="2" stroke-linecap="round"/><rect x="67" y="112" width="7" height="7" rx="2" fill="#c7f24d"/><rect x="77" y="112" width="7" height="7" rx="2" fill="#00c6ff"/><rect x="87" y="112" width="7" height="7" rx="2" fill="#ff795c"/><path d="M156 112h7" stroke="#10243a" stroke-width="2" stroke-linecap="round"/><circle cx="26" cy="28" r="3" fill="#c7f24d"/><circle cx="197" cy="27" r="3" fill="#00c6ff"/></g>',
  };
  TITLES.set('3d-modeler-maker', '3D Modeler — Maker License');
  TITLES.set('3d-modeler-pro', '3D Modeler — Pro License');
  TITLES.set('graphic-design-studio', 'Legacy Design Studio Access');
  TITLES.set('dira-image-pro', 'DIRA AI Image Generator Pro');
  const PRICES = new Map([
    ['business-email-transformer', 50],
    ['graphic-design-studio', 900],
    ['dira-image-pro', 700],
    ['3d-modeler-maker', 50],
    ['3d-modeler-pro', 300],
  ]);
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
  let currentPaymentCode = '';
  let cropState = null;
  let studioState = null;
  let studioProEnabled = false;
  let studioUndo = [];
  let studioRedo = [];
  let studioDrag = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function makeToolVisual(toolId) {
    const art = TOOL_ART.get(toolId);
    if (!art || !TOOL_ARTWORK[art]) return null;

    const stage = el('span', 'tools-visual-stage');
    stage.dataset.toolArt = art;
    stage.dataset.visualCategory = (GROUPS.get(toolId) || 'Everyday').toLowerCase();
    stage.setAttribute('aria-hidden', 'true');

    const artwork = el('span', 'tools-visual-art');
    artwork.innerHTML = `<svg class="tools-visual-svg" viewBox="0 0 220 150" focusable="false" aria-hidden="true"><defs>
      <linearGradient id="__ID__-paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#dce8f7"/></linearGradient>
      <linearGradient id="__ID__-back" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9c9de"/><stop offset="1" stop-color="#7187a6"/></linearGradient>
      <linearGradient id="__ID__-screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#193657"/><stop offset="1" stop-color="#111a2b"/></linearGradient>
      <linearGradient id="__ID__-device" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#62718a"/><stop offset=".45" stop-color="#222d40"/><stop offset="1" stop-color="#111722"/></linearGradient>
      </defs><ellipse cx="110" cy="133" rx="69" ry="9" fill="rgba(0,0,0,.38)"/>${TOOL_ARTWORK[art]}</svg>`;
    const svg = artwork.querySelector('svg');
    const artworkId = `tools-${toolId}`;
    svg.innerHTML = svg.innerHTML.replaceAll('__ID__', artworkId);
    svg.querySelectorAll('.paper-front').forEach((shape) => shape.setAttribute('fill', `url(#${artworkId}-paper)`));
    svg.querySelectorAll('.paper-back').forEach((shape) => shape.setAttribute('fill', `url(#${artworkId}-back)`));
    svg.querySelectorAll('.screen').forEach((shape) => shape.setAttribute('fill', `url(#${artworkId}-screen)`));
    svg.querySelectorAll('.device').forEach((shape) => shape.setAttribute('fill', `url(#${artworkId}-device)`));

    const icon = el('span', 'tools-visual-icon', TOOL_GROUPS.flatMap((group) => group.tools).find(([id]) => id === toolId)?.[3] || '');
    icon.setAttribute('aria-hidden', 'true');
    artwork.append(icon);
    stage.append(artwork);

    if (toolId === 'dira-image-generator') return stage;

    const image = el('img', 'tools-visual-image');
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.setAttribute('aria-hidden', 'true');
    image.dataset.fallbackTried = 'false';
    image.addEventListener('load', () => stage.classList.add('has-render'));
    image.addEventListener('error', () => {
      if (image.dataset.fallbackTried === 'false') {
        image.dataset.fallbackTried = 'true';
        image.src = `/assets/tools/${toolId}.png`;
        return;
      }
      image.hidden = true;
    });
    image.src = `/assets/tools/${toolId}.webp`;
    stage.append(image);
    return stage;
  }

  function enhanceToolVisuals() {
    document.querySelectorAll('.tools-spotlight-card[data-tool-id], .tools-card[data-tool-id]').forEach((card) => {
      if (card.querySelector('.tools-visual-stage')) return;
      const visual = makeToolVisual(card.dataset.toolId);
      if (!visual) return;
      if (card.matches('.tools-spotlight-card')) {
        const icon = card.querySelector('.tools-spotlight-icon');
        if (icon) {
          icon.replaceChildren(visual);
          icon.classList.add('has-tool-visual');
          return;
        }
      }
      card.prepend(visual);
    });
  }

  function addDiraImageFlagshipCard() {
    const spotlight = $('.tools-spotlight');
    if (!spotlight || spotlight.parentElement.querySelector('.graphic-studio-flagship')) return;
    const card = el('button', 'graphic-studio-flagship');
    card.type = 'button';
    card.dataset.toolId = 'dira-image-generator';
    card.setAttribute('aria-label', 'Open DIRA AI Image Generator. Base 5 images per day, Pro KES 700 per month');
    card.setAttribute('aria-haspopup', 'dialog');
    card.title = 'Open DIRA AI Image Generator (press / to toggle DIRA)';

    const visualWrap = el('span', 'graphic-studio-flagship-visual');
    const visual = makeToolVisual('dira-image-generator');
    if (visual) {
      visual.classList.add('graphic-studio-flagship-art');
      visualWrap.append(visual);
    }
    const copy = el('span', 'graphic-studio-flagship-copy');
    copy.append(
      el('span', 'graphic-studio-flagship-eyebrow', 'AI IMAGE GENERATION · BASE & PRO'),
      el('strong', 'graphic-studio-flagship-title', TITLES.get('dira-image-generator')),
      el('small', '', DESCRIPTIONS.get('dira-image-generator')),
    );
    const action = el('span', 'graphic-studio-flagship-action');
    action.append(
      el('span', 'graphic-studio-flagship-price', 'Base · 5/day | Pro · KES 700/month'),
      el('span', 'graphic-studio-flagship-cta', 'Generate an image ↗'),
    );
    card.append(copy, action, visualWrap);
    spotlight.parentElement.insertBefore(card, spotlight);
  }

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
    const filterNav = $('#tools-filter-nav');
    root.replaceChildren();
    filterNav.querySelectorAll('[data-tool-category]:not([data-tool-category="all"])').forEach((filter) => filter.remove());
    TOOL_GROUPS.forEach(({ name, tools }) => {
      const section = el('section', 'tools-category');
      section.dataset.toolCategory = name;
      section.append(el('h3', 'tools-category-heading', name));
      const filter = el('button', 'tools-filter', name);
      filter.type = 'button';
      filter.dataset.toolCategory = name;
      filter.setAttribute('aria-pressed', 'false');
      filterNav.append(filter);
      const grid = el('div', 'tools-card-grid');
      tools.forEach(([id, title, description, icon]) => {
        const button = el('button', 'tools-card');
        button.type = 'button';
        button.dataset.toolId = id;
        if (id === 'dira-image-generator') {
          button.setAttribute('aria-haspopup', 'dialog');
          button.title = 'Open DIRA AI Image Generator (press / to toggle DIRA)';
        }
        const visual = makeToolVisual(id);
        const symbol = el('span', 'tools-card-icon', icon);
        symbol.setAttribute('aria-hidden', 'true');
        const price = el('span', `tools-price-badge${id === 'dira-image-generator' ? ' graphic-studio-price' : ''}`,
          id === 'dira-image-generator' ? 'Base · 5/day · Pro · KES 700/month' : `KES ${PRICES.get(id) || FEE}`);
        const summary = el('span', 'tools-card-description', description);
        if (visual) button.append(visual);
        button.append(symbol, el('strong', '', title), summary, price);
        grid.append(button);
      });
      section.append(grid);
      root.append(section);
    });
    const designCategory = root.querySelector('.tools-category[data-tool-category="Design"]');
    const dynamicQrSection = $('#dynamic-qr');
    if (!designCategory) throw new Error('The Design category is missing from the Digital Tools list.');
    if (!dynamicQrSection) throw new Error('The Dynamic Image QR section is missing from the page.');
    designCategory.append(dynamicQrSection);
  }

  function filterToolCategories(category) {
    $('#tools-categories').querySelectorAll('.tools-category').forEach((section) => {
      section.hidden = category !== 'all' && section.dataset.toolCategory !== category;
    });
    $('#tools-filter-nav').querySelectorAll('[data-tool-category]').forEach((filter) => {
      const active = filter.dataset.toolCategory === category;
      filter.classList.toggle('is-active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
  }

  function normalizePhone(value) {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
    if (digits.startsWith('254') && digits.length === 12) return digits;
    if (digits.length >= 9 && digits.length <= 15) return digits;
    return '';
  }

  function normalizeKenyanPayerPhone(value) {
    const digits = value.replace(/\D/g, '');
    const normalized = digits.startsWith('0') && digits.length === 10
      ? `254${digits.slice(1)}`
      : digits.startsWith('254') && digits.length === 12
        ? digits
        : '';
    if (/^254[17]\d{8}$/.test(normalized)) return normalized;
    return '';
  }

  function isMissingColumn(error, column) {
    return ['42703', 'PGRST204'].includes(error?.code)
      && new RegExp(column, 'i').test(`${error.message || ''} ${error.details || ''}`);
  }

  async function insertToolSubscription(client, subscription) {
    let { error } = await client.from('tool_subscriptions').insert(subscription);
    if (isMissingColumn(error, 'amount_kes')) {
      const compatibleSubscription = { ...subscription };
      delete compatibleSubscription.amount_kes;
      ({ error } = await client.from('tool_subscriptions').insert(compatibleSubscription));
    }
    return error;
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

  async function activePayment(phone, toolId, code) {
    const client = await getClient();
    const { data, error } = await client.rpc('has_active_tool_payment', {
      p_phone: phone,
      p_tool_id: toolId,
      p_mpesa_code: code,
    });
    if (error) throw new Error(`Unable to verify payment approval: ${error.message}`);
    return data === true;
  }

  async function requestTool(toolId) {
    if (toolId === 'graphic-design-studio' || toolId === 'dira-image-generator') {
      const assistant = window.DIRAVoiceAssistant;
      if (!assistant?.openImageGenerator) throw new Error('DIRA AI Image Generator is still loading. Please try again.');
      assistant.openImageGenerator();
      return;
    }
    pendingToolId = toolId;
    const rememberedPhone = localStorage.getItem(STORAGE_PHONE) || '';
    if (rememberedPhone && toolId !== 'business-email-transformer') {
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
    const price = PRICES.get(toolId) || FEE;
    $('.tools-paywall-shell .eyebrow').textContent = 'ONE-TIME TOOL ACCESS';
    $('#tools-paywall-instructions').innerHTML = `Pay KES ${price} to <strong>0794940193</strong> via M-Pesa Send Money. Enter the payer’s M-Pesa mobile number (not the recipient number) and transaction code below. Access is enabled after an administrator verifies your payment.`;
    $('#tools-paywall-form').elements.phone.value = rememberedPhone;
    $('#tools-paywall-form').querySelector('[type="submit"]').textContent = toolId === 'business-email-transformer'
      ? 'Verify / Unlock'
      : 'Submit payment for approval';
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

  function studioSnapshot() {
    return JSON.stringify({
      elements: studioState.elements,
      background: studioState.background,
      width: studioState.width,
      height: studioState.height,
    });
  }

  function studioCommit() {
    studioUndo.push(studioSnapshot());
    if (studioUndo.length > 50) studioUndo.shift();
    studioRedo = [];
  }

  function studioApplySnapshot(snapshot) {
    const restored = JSON.parse(snapshot);
    studioState.elements = restored.elements;
    studioState.background = restored.background;
    studioState.width = restored.width;
    studioState.height = restored.height;
    if (!studioState.elements.some((item) => item.id === studioState.selectedId)) studioState.selectedId = null;
    studioRenderScene();
    studioSyncControls();
  }

  function studioNewElement(type, values = {}) {
    return {
      id: `studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      x: 25,
      y: 25,
      width: type === 'text' ? 45 : 28,
      height: type === 'text' ? 13 : 25,
      text: type === 'text' ? 'Your text' : type === 'sticker' ? '✦' : '',
      color: type === 'circle' ? '#00c6ff' : type === 'sticker' ? '#ffd700' : '#c7f24d',
      fontSize: 42,
      align: 'center',
      ...values,
    };
  }

  function studioItemStyle(item, node) {
    node.style.left = `${item.x}%`;
    node.style.top = `${item.y}%`;
    node.style.width = `${item.width}%`;
    node.style.height = `${item.height}%`;
    if (item.type === 'text') {
      node.style.color = item.color;
      node.style.fontSize = `clamp(12px, ${item.fontSize / 9.6}cqw, 88px)`;
      node.style.textAlign = item.align;
      node.style.background = 'transparent';
      node.style.borderRadius = '0';
    } else if (item.type === 'image') {
      node.style.background = 'transparent';
    } else {
      node.style.background = item.color;
      node.style.borderRadius = item.type === 'circle' || item.type === 'sticker' ? '50%' : item.type === 'badge' ? '999px' : '8px';
      node.style.color = item.type === 'sticker' ? '#111827' : '#07101b';
      node.style.fontSize = 'clamp(12px, 3cqw, 34px)';
    }
  }

  function studioRenderScene() {
    const stage = $('#graphic-studio-canvas');
    if (!stage || !studioState) return;
    stage.style.setProperty('--studio-background', studioState.background);
    stage.style.aspectRatio = `${studioState.width} / ${studioState.height}`;
    stage.replaceChildren();
    studioState.elements.forEach((item, index) => {
      const node = el('div', `graphic-studio-item${item.id === studioState.selectedId ? ' is-selected' : ''}`);
      node.dataset.studioItem = item.id;
      node.dataset.layerIndex = String(index);
      studioItemStyle(item, node);
      if (item.type === 'image') {
        const image = el('img');
        image.src = item.src;
        image.alt = item.text || 'Uploaded design image';
        image.draggable = false;
        node.append(image);
      } else if (item.text) node.append(document.createTextNode(item.text));
      if (item.id === studioState.selectedId) node.append(el('span', 'graphic-studio-resize', '↘'));
      stage.append(node);
    });
    if (!studioProEnabled) stage.append(el('span', 'graphic-studio-watermark', 'DIRA PULSE'));
    studioSyncLayerList();
  }

  function studioSyncLayerList() {
    const list = $('[data-studio-layers]');
    if (!list || !studioState) return;
    list.replaceChildren();
    [...studioState.elements].reverse().forEach((item, reverseIndex) => {
      const index = studioState.elements.length - reverseIndex - 1;
      const layer = el('button', `graphic-studio-layer${item.id === studioState.selectedId ? ' is-selected' : ''}`,
        item.type === 'text' ? item.text.slice(0, 22) || 'Text' : item.type === 'image' ? 'Image' : item.type === 'sticker' ? 'Pro sticker' : item.type);
      layer.type = 'button';
      layer.dataset.studioAction = 'select-layer';
      layer.dataset.layerId = item.id;
      layer.title = `Select layer ${index + 1}`;
      list.append(layer);
    });
  }

  function studioSyncControls() {
    const item = studioState?.elements.find((entry) => entry.id === studioState.selectedId);
    const text = $('[data-studio-prop="text"]');
    const color = $('[data-studio-prop="color"]');
    const size = $('[data-studio-prop="fontSize"]');
    const align = $('[data-studio-prop="align"]');
    if (text) text.value = item?.text || '';
    if (color) color.value = item?.color || '#c7f24d';
    if (size) size.value = String(item?.fontSize || 42);
    if (align) align.value = item?.align || 'center';
    const disabled = !item;
    [text, color, size, align].forEach((control) => { if (control) control.disabled = disabled; });
  }

  function studioButton(label, action, secondary = false) {
    const control = el('button', `graphic-studio-button${secondary ? ' is-secondary' : ''}`, label);
    control.type = 'button';
    control.dataset.studioAction = action;
    return control;
  }

  function studioControl(labelText, control) {
    const label = el('label', 'graphic-studio-control');
    label.append(el('span', '', labelText), control);
    return label;
  }

  function studioPropertyControl(type, property, value, options = {}) {
    const control = el(type === 'select' ? 'select' : 'input');
    if (type !== 'select') control.type = type;
    control.dataset.studioProp = property;
    control.value = value;
    if (options.min) control.min = options.min;
    if (options.max) control.max = options.max;
    control.disabled = true;
    return control;
  }

  function studioAdd(type, values = {}) {
    studioCommit();
    const item = studioNewElement(type, values);
    studioState.elements.push(item);
    studioState.selectedId = item.id;
    studioRenderScene();
    studioSyncControls();
  }

  async function studioRequirePro() {
    const assistant = window.DIRAVoiceAssistant;
    if (!assistant?.openImageGenerator) throw new Error('DIRA AI Image Generator is still loading. Please try again.');
    assistant.openImageGenerator();
    return false;
  }

  async function studioExport(pro = false) {
    if (pro && !await studioRequirePro()) return;
    const scale = pro ? 2 : 1;
    const canvas = document.createElement('canvas');
    canvas.width = studioState.width * scale;
    canvas.height = studioState.height * scale;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas export is unavailable in this browser.');
    const transparent = pro && $('[data-studio-transparent]')?.checked;
    if (!transparent) {
      context.fillStyle = studioState.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    for (const item of studioState.elements) {
      const x = item.x / 100 * canvas.width;
      const y = item.y / 100 * canvas.height;
      const width = item.width / 100 * canvas.width;
      const height = item.height / 100 * canvas.height;
      if (item.type === 'image') {
        const image = new Image();
        image.src = item.src;
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () => reject(new Error('An uploaded image could not be exported.'));
        });
        context.drawImage(image, x, y, width, height);
      } else if (item.type === 'text') {
        context.fillStyle = item.color;
        context.font = `600 ${Math.max(12, item.fontSize * canvas.width / 960)}px "DM Sans", sans-serif`;
        context.textAlign = item.align;
        const lines = item.text.split('\n');
        const lineHeight = Math.max(12, item.fontSize * canvas.width / 960 * 1.2);
        const anchorX = item.align === 'left' ? x : item.align === 'right' ? x + width : x + width / 2;
        lines.forEach((line, index) => context.fillText(line, anchorX, y + lineHeight * (index + 1), width));
      } else {
        context.fillStyle = item.color;
        if (item.type === 'circle' || item.type === 'sticker') {
          context.beginPath();
          context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillRect(x, y, width, height);
        }
        if (item.text) {
          context.fillStyle = item.type === 'sticker' ? '#111827' : '#07101b';
          context.font = `700 ${Math.max(12, height * 0.48)}px sans-serif`;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(item.text, x + width / 2, y + height / 2, width * 0.9);
          context.textBaseline = 'alphabetic';
        }
      }
    }
    if (!studioProEnabled) {
      context.fillStyle = 'rgba(25,34,48,.48)';
      context.font = `${Math.max(12, canvas.width * 0.015)}px sans-serif`;
      context.textAlign = 'right';
      context.fillText('DIRA PULSE', canvas.width - canvas.width * 0.025, canvas.height - canvas.width * 0.025);
    }
    const blob = await canvasBlob(canvas, 'image/png');
    downloadBlob(blob, 'dira-pulse-design.png');
    setStatus(`${pro ? 'High-resolution Pro' : 'Standard-size'} PNG exported.`, 'success');
  }

  function handleStudioPointerDown(event) {
    if (!studioState || event.button !== 0) return;
    const stage = event.currentTarget;
    const node = event.target.closest('[data-studio-item]');
    if (!node) {
      studioState.selectedId = null;
      studioRenderScene();
      studioSyncControls();
      return;
    }
    const item = studioState.elements.find((entry) => entry.id === node.dataset.studioItem);
    if (!item) return;
    studioState.selectedId = item.id;
    studioSyncControls();
    node.classList.add('is-selected');
    studioSyncLayerList();
    studioCommit();
    const resize = event.target.closest('.graphic-studio-resize');
    const bounds = stage.getBoundingClientRect();
    studioDrag = {
      id: item.id,
      mode: resize ? 'resize' : 'move',
      startX: event.clientX,
      startY: event.clientY,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      stageWidth: bounds.width,
      stageHeight: bounds.height,
    };
    event.preventDefault();
  }

  function handleStudioPointerMove(event) {
    if (!studioDrag || !studioState) return;
    const item = studioState.elements.find((entry) => entry.id === studioDrag.id);
    const node = $(`[data-studio-item="${studioDrag.id}"]`);
    if (!item || !node) return;
    const dx = (event.clientX - studioDrag.startX) / studioDrag.stageWidth * 100;
    const dy = (event.clientY - studioDrag.startY) / studioDrag.stageHeight * 100;
    if (studioDrag.mode === 'resize') {
      item.width = Math.max(5, Math.min(95 - item.x, studioDrag.width + dx));
      item.height = Math.max(5, Math.min(95 - item.y, studioDrag.height + dy));
    } else {
      item.x = Math.max(0, Math.min(100 - item.width, studioDrag.x + dx));
      item.y = Math.max(0, Math.min(100 - item.height, studioDrag.y + dy));
    }
    studioItemStyle(item, node);
  }

  function handleStudioPointerUp() {
    studioDrag = null;
  }

  async function handleStudioAction(action, event) {
    if (!studioState) return false;
    if (action === 'add-text') studioAdd('text');
    else if (action === 'add-rect') studioAdd('rect');
    else if (action === 'add-circle') studioAdd('circle');
    else if (action === 'select-layer') {
      studioState.selectedId = event.target.closest('[data-layer-id]').dataset.layerId;
      studioRenderScene();
      studioSyncControls();
    } else if (action === 'delete') {
      if (!studioState.selectedId) throw new Error('Select an element to delete.');
      studioCommit();
      studioState.elements = studioState.elements.filter((item) => item.id !== studioState.selectedId);
      studioState.selectedId = null;
      studioRenderScene();
      studioSyncControls();
    } else if (action === 'layer-up' || action === 'layer-down') {
      const index = studioState.elements.findIndex((item) => item.id === studioState.selectedId);
      const next = index + (action === 'layer-up' ? 1 : -1);
      if (index < 0 || next < 0 || next >= studioState.elements.length) return true;
      studioCommit();
      [studioState.elements[index], studioState.elements[next]] = [studioState.elements[next], studioState.elements[index]];
      studioRenderScene();
    } else if (action === 'undo' || action === 'redo') {
      const source = action === 'undo' ? studioUndo : studioRedo;
      const destination = action === 'undo' ? studioRedo : studioUndo;
      if (!source.length) return true;
      destination.push(studioSnapshot());
      studioApplySnapshot(source.pop());
    } else if (action === 'clear') {
      if (!studioState.elements.length) return true;
      studioCommit();
      studioState.elements = [];
      studioState.selectedId = null;
      studioRenderScene();
      studioSyncControls();
    } else if (action === 'check-pro') {
      const assistant = window.DIRAVoiceAssistant;
      if (!assistant?.openImageGenerator) throw new Error('DIRA AI Image Generator is still loading. Please try again.');
      assistant.openImageGenerator();
    } else if (action === 'toggle-transparent') {
      if (!await studioRequirePro()) $('[data-studio-transparent]').checked = false;
    } else if (action === 'pro-preset') {
      if (!await studioRequirePro()) return true;
      studioCommit();
      studioState.background = '#0c1424';
      studioState.elements = [
        studioNewElement('text', { x: 12, y: 18, width: 76, height: 24, text: 'YOUR BIG IDEA', color: '#c7f24d', fontSize: 72, align: 'center' }),
        studioNewElement('text', { x: 18, y: 55, width: 64, height: 15, text: 'Make it impossible to ignore.', color: '#ffffff', fontSize: 36, align: 'center' }),
      ];
      studioState.selectedId = studioState.elements[0].id;
      studioRenderScene();
      studioSyncControls();
    } else if (action === 'pro-sticker') {
      if (!await studioRequirePro()) return true;
      studioAdd('sticker');
    } else if (action === 'export') {
      await studioExport(false);
    } else if (action === 'pro-export') {
      await studioExport(true);
    }
    return true;
  }

  function handleStudioInput(event) {
    if (!studioState) return;
    const inputControl = event.target.closest('[data-studio-prop]');
    if (!inputControl) return;
    const item = studioState.elements.find((entry) => entry.id === studioState.selectedId);
    if (!item) return;
    const property = inputControl.dataset.studioProp;
    if (property === 'fontSize') {
      const size = Number(inputControl.value);
      if (!Number.isFinite(size) || size < 12 || size > 160) return;
      item[property] = size;
    } else item[property] = inputControl.value;
    const node = $(`[data-studio-item="${item.id}"]`);
    if (node) {
      if (property === 'text') {
        const textNode = [...node.childNodes].find((child) => child.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.textContent = item.text;
        else node.insertBefore(document.createTextNode(item.text), node.firstChild);
      }
      studioItemStyle(item, node);
    }
    if (property === 'text') studioSyncLayerList();
  }

  async function handleStudioUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG, or WebP image.');
    if (file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
    const src = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('The selected image could not be read.'));
      reader.readAsDataURL(file);
    });
    studioAdd('image', { src, text: file.name, width: 35, height: 30 });
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
    if (id === 'graphic-design-studio' || id === 'dira-image-generator') {
      const assistant = window.DIRAVoiceAssistant;
      if (!assistant?.openImageGenerator) throw new Error('DIRA AI Image Generator is still loading. Please try again.');
      assistant.openImageGenerator();
      return;
    }
    if (id === 'business-email-transformer') {
      content.append(
        field('Rough notes or key points', (() => {
          const notes = el('textarea');
          notes.name = 'roughText';
          notes.rows = 8;
          notes.maxLength = 6000;
          notes.required = true;
          notes.placeholder = 'Add the key points, request, context, and any important details to include…';
          return notes;
        })()),
        formGrid(
          field('Tone', select('tone', [
            ['formal', 'Formal / Corporate'],
            ['diplomatic', 'Diplomatic / Negotiation'],
            ['urgent', 'Urgent Follow-up'],
            ['decline', 'Polite Decline'],
          ])),
          field('Target audience', select('audience', [
            ['client', 'Client'],
            ['supplier', 'Supplier'],
            ['investor', 'Investor'],
            ['colleague', 'Colleague'],
          ])),
        ),
        button('Transform into a professional email', 'transform-email'),
      );
      return;
    }
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
      const business = input('text', 'business', { required: true, value: 'DIRA PULSE TECHNOLOGIES' });
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
        field('Business / shop name', input('text', 'business', { value: 'DIRA PULSE TECHNOLOGIES', required: true })),
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
    const studioUnlock = event.target.closest('[data-tool-action="unlock-studio"]');
    if (studioUnlock) {
      studioRequirePro().catch((error) => {
        console.error('Tool access check failed:', error);
        setStatus(`Could not check studio access: ${error.message}`, 'error');
      });
      return;
    }
    const studioAction = event.target.closest('[data-studio-action]')?.dataset.studioAction;
    if (studioAction) {
      handleStudioAction(studioAction, event).catch((error) => {
        console.error('Tool action failed:', error);
        setStatus(error.message || 'The design action could not be completed.', 'error');
      });
      return;
    }
    const action = event.target.closest('[data-tool-action]')?.dataset.toolAction;
    if (!action) return;
    try {
      if (action === 'transform-email') {
        if (!formValue('roughText').value.trim()) throw new Error('Add some notes or key points before transforming.');
        const transformButton = event.target.closest('[data-tool-action]');
        transformButton.disabled = true;
        runEmailTransformation().catch((error) => {
          console.error('Business email transformation failed:', error);
          setStatus(error.message || 'The email could not be transformed.', 'error');
        }).finally(() => { transformButton.disabled = false; });
      } else if (action === 'copy-email') {
        copyTransformedEmail().catch((error) => {
          console.error('Could not copy transformed email:', error);
          setStatus(`Could not copy email: ${error.message}`, 'error');
        });
      } else if (action === 'run') {
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

  async function runEmailTransformation() {
    if (!currentPaymentCode) throw new Error('Verify your approved payment before transforming an email.');
    setStatus('Preparing your professional email…');
    const response = await fetch('/api/email/transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roughText: formValue('roughText').value.trim(),
        tone: formValue('tone').value,
        audience: formValue('audience').value,
        phone: localStorage.getItem(STORAGE_PHONE) || '',
        mpesaCode: currentPaymentCode,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `The email service returned HTTP ${response.status}.`);
    $('#tools-workspace-content [data-email-result="true"]')?.remove();
    const box = output();
    box.dataset.emailResult = 'true';
    box.replaceChildren();
    [
      ['Subject Line', result.subject],
      ['Formal Salutation', result.salutation],
      ['Polished Email Body', result.body],
      ['Professional Sign-off', result.signoff],
    ].forEach(([label, value]) => {
      if (typeof value !== 'string' || !value) throw new Error('The email service returned an incomplete response.');
      const block = el('div', 'tools-email-field');
      block.append(el('strong', '', label), el('p', '', value));
      block.dataset.emailField = label;
      block.dataset.emailValue = value;
      box.append(block);
    });
    box.append(button('Copy to Clipboard', 'copy-email', true));
    setStatus('Your professional email is ready.', 'success');
  }

  async function copyTransformedEmail() {
    const fields = [...$('#tools-workspace-content [data-email-field]')];
    if (!fields.length) throw new Error('Transform an email before copying it.');
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable. Select and copy the email manually.');
    const text = fields.map((field) => `${field.dataset.emailField}\n${field.dataset.emailValue}`).join('\n\n');
    await navigator.clipboard.writeText(text);
    setStatus('Email copied to clipboard.', 'success');
  }

  async function submitPaywall(event) {
    event.preventDefault();
    if (!pendingToolId) return;
    const form = event.currentTarget;
    const phone = normalizeKenyanPayerPhone(form.elements.phone.value);
    const code = form.elements.mpesaCode.value.trim().toUpperCase();
    if (phone === '254794940193') {
      setPaywallStatus('0794940193 is the DIRA PULSE recipient number. Enter the payer’s own M-Pesa mobile number instead.', 'error');
      form.elements.phone.focus();
      return;
    }
    if (!phone) { setPaywallStatus('Enter a valid Kenyan mobile number, such as 07XX XXX XXX, 01XX XXX XXX, 2547… or +2541….', 'error'); form.elements.phone.focus(); return; }
    if (!/^[A-Z0-9]{8,20}$/.test(code)) { setPaywallStatus('Enter a valid M-Pesa transaction code (8–20 letters or numbers).', 'error'); return; }
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      if (pendingToolId === 'business-email-transformer') {
        if (await activePayment(phone, pendingToolId, code)) {
          localStorage.setItem(STORAGE_PHONE, phone);
          currentPaymentCode = code;
          setPaywallStatus('Payment verified. Your Business Email Transformer is unlocked.', 'success');
          closeDialog($('#tools-paywall'));
          openTool(pendingToolId);
          return;
        }
        const client = await getClient();
        const error = await insertToolSubscription(client, {
          phone,
          tool_id: pendingToolId,
          mpesa_code: code,
          amount_kes: PRICES.get(pendingToolId),
          status: 'pending_approval',
        });
        if (error && error.code !== '23505') throw new Error(error.message);
        localStorage.setItem(STORAGE_PHONE, phone);
        setPaywallStatus(error
          ? 'This code was already submitted. It will unlock after an administrator verifies the payment; try Verify / Unlock again later.'
          : 'Payment submitted for review. The tool will unlock after an administrator verifies your KES 50 M-Pesa payment. You can return and select Verify / Unlock again.',
        'success');
        return;
      }
      const client = await getClient();
      const error = await insertToolSubscription(client, {
        phone,
        tool_id: pendingToolId,
        mpesa_code: code,
        amount_kes: PRICES.get(pendingToolId) || FEE,
        status: 'pending_approval',
      });
      if (error) throw new Error(error.message);
      localStorage.setItem(STORAGE_PHONE, phone);
      setPaywallStatus('Payment submitted for review. Your tool will unlock after an administrator verifies the M-Pesa transaction.', 'success');
      if (pendingToolId !== 'business-email-transformer') form.elements.mpesaCode.value = '';
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
    let fields = ['id', 'phone', 'tool_id', 'mpesa_code', 'amount_kes', 'exported_at', 'expires_at', 'status', 'created_at'];
    let data;
    let error;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      ({ data, error } = await client.from('tool_subscriptions')
        .select(fields.join(','))
        .order('created_at', { ascending: false }));
      if (!error) break;
      const missingField = ['amount_kes', 'exported_at', 'expires_at'].find((field) => fields.includes(field) && isMissingColumn(error, field));
      if (!missingField) break;
      fields = fields.filter((field) => field !== missingField);
    }
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
      const amount = subscription.amount_kes ?? PRICES.get(subscription.tool_id) ?? FEE;
      const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;
      const isExpired = subscription.tool_id === 'dira-image-pro' && expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt <= new Date();
      const expiryText = expiresAt && !Number.isNaN(expiresAt.getTime()) ? ` · Expires ${expiresAt.toLocaleString()}` : '';
      const paymentState = subscription.exported_at ? 'export used' : (isExpired ? 'expired' : subscription.status);
      const meta = el('small', '', `${subscription.phone} · KES ${amount} · M-Pesa: ${subscription.mpesa_code} · ${paymentState}${expiryText} · ${dateText}`);
      details.append(title, meta);
      const actions = el('div', 'tools-admin-actions');
      if (subscription.exported_at) {
        actions.append(el('span', 'tools-check-progress', 'Export Used'));
      } else if (isExpired) {
        actions.append(el('span', 'tools-check-progress', 'Expired'));
      } else if (subscription.status !== 'active') {
        const enable = button('Enable Service', 'enable-subscription');
        enable.className = 'admin-action activate';
        enable.dataset.subscriptionId = subscription.id;
        actions.append(enable);
      } else {
        actions.append(el('span', 'tools-check-progress', 'Active'));
      }
      const notify = el('a', '', 'Notify via WhatsApp');
      notify.href = `https://wa.me/${subscription.phone}?text=${encodeURIComponent(`Hi, your ${TITLES.get(subscription.tool_id) || 'Digital Utilities'} service is active. Thank you for choosing DIRA PULSE TECHNOLOGIES.`)}`;
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

  function syncToolPanelOpenState() {
    if ($('#tools-workspace').open || $('#tools-paywall').open) {
      document.body.classList.add('panel-open');
    } else if (!$('#admin-dialog').open && $('#cart-drawer').hidden
      && !document.querySelector('.voice-assistant-widget.is-open')) {
      document.body.classList.remove('panel-open');
    }
  }

  function init() {
    renderCards();
    addDiraImageFlagshipCard();
    enhanceToolVisuals();
    $('#tools-filter-nav').addEventListener('click', (event) => {
      const filter = event.target.closest('[data-tool-category]');
      if (filter) filterToolCategories(filter.dataset.toolCategory);
    });
    document.querySelectorAll('a[href="#dynamic-qr"]').forEach((link) => {
      link.addEventListener('click', () => filterToolCategories('Design'));
    });
    $('#tools').addEventListener('click', (event) => {
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
    $('#tools-workspace').addEventListener('close', syncToolPanelOpenState);
    $('#tools-paywall').addEventListener('close', syncToolPanelOpenState);
    $('#tools-workspace').addEventListener('cancel', syncToolPanelOpenState);
    $('#tools-paywall').addEventListener('cancel', syncToolPanelOpenState);
    window.addEventListener('dira-assistant-open', () => {
      document.body.classList.add('panel-open');
      closeDialog($('#tools-workspace'));
      closeDialog($('#tools-paywall'));
    });
    window.addEventListener('dira-assistant-close', syncToolPanelOpenState);
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
      if (!$('#tools-workspace').open && !$('#tools-paywall').open && !$('#admin-dialog').open && $('#cart-drawer').hidden
        && !document.querySelector('.voice-assistant-widget.is-open')) {
        document.body.classList.remove('panel-open');
      }
    }));
    window.DIRATools = Object.freeze({
      openTool(toolId) {
        if (!GROUPS.has(toolId)) throw new Error(`Unknown Digital Utilities tool: ${toolId}`);
        return requestTool(toolId);
      },
      showCategory(category) {
        if (category !== 'all' && !TOOL_GROUPS.some((group) => group.name === category)) {
          throw new Error(`Unknown Digital Utilities category: ${category}`);
        }
        filterToolCategories(category);
      },
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
