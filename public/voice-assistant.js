(() => {
  'use strict';

  const script = document.currentScript;
  const configuredEndpoint = script?.dataset.endpoint || window.BSTAR_CONFIG?.voiceAssistantEndpoint || '';
  const RENDER_IMAGE_API_BASE_URL = 'https://bstar-technologies-web-azkl.onrender.com';
  const LOCAL_BACKEND_PORTS = new Set(['5000', '10000']);
  const configuredImageApiBaseUrl = window.DIRA_API_BASE_URL || window.BSTAR_CONFIG?.imageApiBaseUrl;
  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const isSameOriginImageBackend = (isLocalHost && LOCAL_BACKEND_PORTS.has(window.location.port))
    || window.location.hostname === 'bstar-technologies-web-azkl.onrender.com';
  const defaultImageApiBaseUrl = isSameOriginImageBackend ? window.location.origin : RENDER_IMAGE_API_BASE_URL;

  function resolveImageApiBaseUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return defaultImageApiBaseUrl;
    let url;
    try {
      url = new URL(value.trim(), window.location.origin);
    } catch {
      console.warn('[DIRA security diagnostics] Invalid image API base URL; using the configured HTTPS backend.');
      return defaultImageApiBaseUrl;
    }
    const isLoopbackTarget = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    const isAllowedHttp = url.protocol === 'http:'
      && (url.origin === window.location.origin || (isLocalHost && isLoopbackTarget));
    if (url.protocol !== 'https:' && !isAllowedHttp) {
      console.warn('[DIRA security diagnostics] Refusing insecure image API base URL; using the configured HTTPS backend.', `${url.origin}${url.pathname}`);
      return defaultImageApiBaseUrl;
    }
    return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
  }

  const imageApiBaseUrl = resolveImageApiBaseUrl(configuredImageApiBaseUrl);
  const TOOL_PHONE_STORAGE_KEY = 'bstar-tools-phone-v1';
  const IMAGE_PRO_PRICE_KES = 700;
  const IMAGE_PRO_MONTHLY_LIMIT = 60;
  const IMAGE_BASE_DAILY_LIMIT = 5;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  const PANEL_TRANSITION_MS = prefersReducedMotion ? 0 : 320;
  const RECOGNITION_HANDOFF_MS = 150;
  const RECOGNITION_WATCHDOG_MS = 8000;
  let root;
  let recognition;
  let recognitionHandoffTimer;
  let recognitionWatchdogTimer;
  let recognitionAttemptId = 0;
  let panelCloseTimer;
  let panelAnimationFrame;
  let lastFocusedElement;
  let pendingNavigationTimer;
  let navigationHighlightTimer;
  let highlightedNavigationTarget;
  let listening = false;
  let submitVoiceTranscript = false;
  let finalTranscript = '';
  let voiceEnabled = Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
  let selectedImageTier = 'base';
  let imageProApproved = false;
  let imageProAccessRequest = 0;
  let imageGenerationInProgress = false;

  const $ = (selector) => root.querySelector(selector);
  const normalize = (value) => value.toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  const containsPhrase = (text, phrase) => (` ${text} `).includes(` ${phrase} `);

  function createWidget() {
    const existing = document.getElementById('voice-assistant-widget');
    if (existing) {
      root = existing;
      if (root.parentElement !== document.body) document.body.append(root);
      return root;
    }
    root = document.createElement('div');
    root.id = 'voice-assistant-widget';
    root.className = 'voice-assistant-widget';
    root.innerHTML = `
      <div class="voice-assistant-backdrop" data-va-backdrop aria-hidden="true"></div>
      <section class="voice-assistant-panel" id="voice-assistant-panel" role="dialog" aria-modal="true" aria-label="DIRA PULSE voice assistant" hidden>
        <header class="voice-assistant-header">
          <div class="voice-assistant-brand">
            <span class="voice-assistant-mark" aria-hidden="true">
              <span class="voice-assistant-orb">
                <span class="voice-assistant-orb__ribbon voice-assistant-orb__ribbon--pink"></span>
                <span class="voice-assistant-orb__ribbon voice-assistant-orb__ribbon--blue"></span>
                <span class="voice-assistant-orb__ribbon voice-assistant-orb__ribbon--cyan"></span>
                <span class="voice-assistant-orb__core"></span>
              </span>
            </span>
            <div><strong data-va-brand-title>DIRA Assistant</strong><small data-va-brand-subtitle>Voice and text help</small></div>
          </div>
          <button class="voice-assistant-icon-button" type="button" data-va-action="close" aria-label="Close assistant">×</button>
        </header>
        <p class="voice-assistant-device-note">Press <strong>Alt+D</strong> or <strong>/</strong> outside a text field to open or close DIRA.</p>
        <div class="voice-assistant-status" data-va-status role="status" aria-live="polite"></div>
        <div class="voice-assistant-messages" data-va-messages role="log" aria-live="polite" aria-relevant="additions text"></div>
        <form class="voice-assistant-form" data-va-form>
          <label class="voice-assistant-input-label" for="voice-assistant-input">Message</label>
          <textarea id="voice-assistant-input" data-va-input rows="2" maxlength="1600" placeholder="Ask a question or say “open the tools”" autocomplete="off"></textarea>
          <div class="voice-assistant-compose-actions">
            <button class="voice-assistant-button voice-assistant-mic" data-va-action="mic" type="button" aria-pressed="false">
              <span aria-hidden="true">●</span><span data-va-mic-label>Speak</span>
            </button>
            <button class="voice-assistant-button voice-assistant-send" type="submit">Send</button>
          </div>
          <p class="voice-assistant-mic-note" data-va-mic-note>Type a message, or tap Speak to use voice input.</p>
        </form>
        <details class="voice-assistant-image-studio" data-va-image-studio>
          <summary>DIRA AI Image Generator</summary>
          <div class="voice-assistant-image-content">
            <div class="voice-assistant-image-models" role="radiogroup" aria-label="Image model">
              <label class="voice-assistant-image-model">
                <input type="radio" name="dira-image-tier" value="base" data-va-image-tier checked>
                <span><strong>Base</strong><small>5 images per day per IP</small></span>
              </label>
              <label class="voice-assistant-image-model">
                <input type="radio" name="dira-image-tier" value="pro" data-va-image-tier>
                <span><strong>Pro · KES 700/month</strong><small>60 images per 30 days per approved phone</small></span>
              </label>
            </div>
            <p class="voice-assistant-image-plan" data-va-image-plan>Base · up to 5 images per day per IP</p>
            <label class="voice-assistant-image-label" for="voice-assistant-image-prompt">Describe the image</label>
            <textarea id="voice-assistant-image-prompt" class="voice-assistant-image-prompt" data-va-image-prompt rows="3" maxlength="12000" placeholder="Describe the image you want to create"></textarea>
            <p class="voice-assistant-image-hint">Your prompt is sent as written, with only surrounding whitespace trimmed.</p>
            <label class="voice-assistant-image-label" for="voice-assistant-image-aspect">Aspect ratio</label>
            <select id="voice-assistant-image-aspect" class="voice-assistant-image-aspect" data-va-image-aspect>
              <option value="1:1">1:1 · Square</option>
              <option value="4:5">4:5 · Portrait</option>
              <option value="16:9">16:9 · Landscape</option>
            </select>
            <div class="voice-assistant-pro-gate" data-va-pro-gate hidden>
              <strong>Pro access · KES 700/month</strong>
              <p>Pay KES 700 per month via M-Pesa Send Money to 0794940193. Enter the payer phone and M-Pesa confirmation code below. Pro starts for one month after admin approval in tool_subscriptions.</p>
              <label class="voice-assistant-image-label" for="voice-assistant-pro-phone">Payer phone number</label>
              <input id="voice-assistant-pro-phone" class="voice-assistant-image-input" data-va-pro-phone type="tel" inputmode="tel" autocomplete="tel" placeholder="07XX XXX XXX">
              <label class="voice-assistant-image-label" for="voice-assistant-pro-code">M-Pesa transaction code</label>
              <input id="voice-assistant-pro-code" class="voice-assistant-image-input" data-va-pro-code type="text" maxlength="20" autocomplete="off" placeholder="e.g. QWE1234567">
              <div class="voice-assistant-pro-actions">
                <button class="voice-assistant-button" data-va-action="submit-image-pro-payment" type="button">Submit Pro payment</button>
                <button class="voice-assistant-text-button" data-va-action="check-image-pro-access" type="button">Check approval</button>
              </div>
            </div>
            <button class="voice-assistant-button voice-assistant-image-generate" data-va-action="generate-image" type="button">Generate image</button>
            <p class="voice-assistant-image-status" data-va-image-status role="status" aria-live="polite" hidden></p>
            <figure class="voice-assistant-image-result" data-va-image-result hidden>
              <figcaption class="voice-assistant-image-plan" data-va-image-result-plan></figcaption>
              <img data-va-image-output alt="DIRA generated image">
              <a class="voice-assistant-button voice-assistant-image-download" data-va-image-download download="dira-image.png">Download</a>
            </figure>
          </div>
        </details>
        <div class="voice-assistant-audio-controls">
          <button class="voice-assistant-text-button" data-va-action="toggle-voice" type="button" aria-pressed="false">Voice Off</button>
          <button class="voice-assistant-text-button" data-va-action="stop-speaking" type="button" disabled>Stop speaking</button>
        </div>
        <details class="voice-assistant-shortcuts">
          <summary>Siri / Google Assistant quick launch</summary>
          <div class="voice-assistant-shortcut-content">
            <p><strong>Siri:</strong> In Shortcuts, add “Open URLs,” paste this page link, then add the shortcut to Siri.</p>
            <p><strong>Google Assistant:</strong> Create a Routine with a voice starter and a URL-opening action if your device supports it. You can also add this page to your home screen.</p>
            <code data-va-share-url></code>
            <button class="voice-assistant-button voice-assistant-copy" data-va-action="copy-link" type="button">Copy assistant link</button>
          </div>
        </details>
      </section>
      <button class="voice-assistant-launcher" id="voice-assistant-launcher" type="button" title="Open or close DIRA (Alt+D or /)" aria-label="Ask DIRA. Keyboard shortcut: Alt+D or slash." aria-controls="voice-assistant-panel" aria-expanded="false" aria-keyshortcuts="/ Alt+D">
        <span class="voice-assistant-orb voice-assistant-orb--launcher" aria-hidden="true">
          <span class="voice-assistant-orb__ribbon voice-assistant-orb__ribbon--pink"></span>
          <span class="voice-assistant-orb__ribbon voice-assistant-orb__ribbon--blue"></span>
          <span class="voice-assistant-orb__ribbon voice-assistant-orb__ribbon--cyan"></span>
          <span class="voice-assistant-orb__core"></span>
        </span>
        <span class="voice-assistant-launcher-label"><span aria-hidden="true">✦</span> Ask DIRA</span>
      </button>`;
    document.body.append(root);
    return root;
  }

  function setStatus(message, state = '') {
    const status = $('[data-va-status]');
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = !message;
  }

  function addMessage(role, text) {
    const message = document.createElement('div');
    message.className = `voice-assistant-message is-${role}`;
    message.textContent = text;
    $('[data-va-messages]').append(message);
    const messages = $('[data-va-messages]');
    while (messages.children.length > 60) messages.firstElementChild.remove();
    messages.scrollTop = messages.scrollHeight;
  }

  function assistantUrl() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const temporaryInput = document.createElement('textarea');
    temporaryInput.value = text;
    temporaryInput.setAttribute('readonly', '');
    temporaryInput.className = 'voice-assistant-copy-buffer';
    document.body.append(temporaryInput);
    temporaryInput.select();
    const copied = document.execCommand('copy');
    temporaryInput.remove();
    if (!copied) throw new Error('Clipboard access is unavailable. Copy the page address from your browser.');
  }

  function openPanel() {
    showPanel();
    root.classList.remove('is-image-generator-mode');
    $('[data-va-brand-title]').textContent = 'DIRA Assistant';
    $('[data-va-brand-subtitle]').textContent = 'Voice and text help';
    $('[data-va-image-studio]').open = false;
    $('[data-va-input]').focus();
  }

  function openImageGenerator() {
    showPanel();
    root.classList.add('is-image-generator-mode');
    $('[data-va-brand-title]').textContent = 'DIRA AI Image Generator';
    $('[data-va-brand-subtitle]').textContent = 'Base · 5/day | Pro · KES 700/month';
    $('[data-va-image-studio]').open = true;
    $('[data-va-image-prompt]').focus();
  }

  function showPanel() {
    window.clearTimeout(panelCloseTimer);
    if ($('[data-va-status]').dataset.state !== 'unsupported') setStatus('');
    const panel = $('#voice-assistant-panel');
    if (panel.hidden) {
      const activeElement = document.activeElement;
      lastFocusedElement = activeElement instanceof HTMLElement
        && activeElement !== document.body
        && !panel.contains(activeElement)
        ? activeElement
        : null;
    }
    panel.hidden = false;
    $('#voice-assistant-launcher').setAttribute('aria-expanded', 'true');
    root.classList.add('is-open', 'is-energized');
    syncPageScrollLock();
    window.dispatchEvent(new CustomEvent('dira-assistant-open'));
    root.classList.remove('is-visible');
    window.cancelAnimationFrame(panelAnimationFrame);
    panelAnimationFrame = window.requestAnimationFrame(() => {
      panelAnimationFrame = undefined;
      if (!panel.hidden && root.classList.contains('is-open')) root.classList.add('is-visible');
    });
  }

  function closePanel() {
    const panel = $('#voice-assistant-panel');
    if (panel.hidden) return;
    $('#voice-assistant-launcher').setAttribute('aria-expanded', 'false');
    root.classList.remove('is-open', 'is-visible');
    submitVoiceTranscript = false;
    if (recognition) {
      updateListeningState(false);
      retireRecognition(recognition, true);
    } else {
      clearRecognitionTimers();
      if (listening) updateListeningState(false);
    }
    window.cancelAnimationFrame(panelAnimationFrame);
    panelAnimationFrame = undefined;
    window.clearTimeout(panelCloseTimer);
    panelCloseTimer = window.setTimeout(() => {
      panel.hidden = true;
      root.classList.remove('is-energized');
    }, PANEL_TRANSITION_MS);
    root.classList.remove('is-image-generator-mode');
    $('[data-va-brand-title]').textContent = 'DIRA Assistant';
    $('[data-va-brand-subtitle]').textContent = 'Voice and text help';
    $('[data-va-image-studio]').open = false;
    const focusTarget = lastFocusedElement?.isConnected && !panel.contains(lastFocusedElement)
      ? lastFocusedElement
      : $('#voice-assistant-launcher');
    focusTarget.focus();
    window.dispatchEvent(new CustomEvent('dira-assistant-close'));
    syncPageScrollLock();
  }

  function syncPageScrollLock() {
    const cart = document.getElementById('cart-drawer');
    if (root.classList.contains('is-open')
      || document.querySelector('dialog[open]')
      || document.body.classList.contains('qr-viewer-open')
      || (cart && !cart.hidden)) {
      document.body.classList.add('panel-open');
    } else {
      document.body.classList.remove('panel-open');
    }
  }

  function isTypingTarget(target) {
    return target instanceof HTMLElement
      && (target.isContentEditable || target.matches('input, textarea, select, [role="textbox"]'));
  }

  function normalizePhoneForWhatsApp() {
    const phone = window.BSTAR_CONFIG?.whatsappNumber || '';
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 9 ? digits : '';
  }

  function findTool(query) {
    const cards = [...document.querySelectorAll('#tools [data-tool-id]')];
    const titles = cards.map((card) => ({
      card,
      title: normalize(card.querySelector('strong')?.textContent || card.dataset.toolId || ''),
      id: normalize((card.dataset.toolId || '').replace(/[-_]/g, ' ')),
    }));
    return titles.find(({ title, id }) => title === query || id === query)
      || titles.find(({ title, id }) => query.length > 2 && (containsPhrase(title, query) || containsPhrase(id, query)));
  }

  function getNavigationRequest(message) {
    const query = normalize(message);
    const request = query.match(/^(?:please\s+)?(?:can you\s+)?(?:open|show|go to|navigate to|scroll to|take me to|visit|launch|start|use|display|find)\s+(?:me\s+)?(.+)$/);
    if (request) {
      return request[1]
        .replace(/^(?:the|my|tool|section)\s+/, '')
        .replace(/\s+(?:section|page|category|tools|tool|please)$/, '')
        .trim();
    }

    const creationRequest = query.match(/^(?:create|generate|make)\s+(?:me\s+)?(?:(?:an?|the)\s+)?(.+)$/);
    if (creationRequest) return creationRequest[1].trim();

    return new Set([
      'home', 'shop', 'products', 'collection', 'store', 'tools', 'digital tools', 'utilities',
      'dynamic qr', 'cart', 'basket', 'checkout', 'payment', 'contact', 'support',
      'image generator', 'pro plan', 'base plan', 'admin dashboard', '3d studio',
    ]).has(query) ? query : '';
  }

  function isVisibleNavigationTarget(element) {
    if (element.closest('#voice-assistant-widget,[hidden],[aria-hidden="true"]')) return false;
    const dialog = element.closest('dialog');
    if (dialog && !dialog.open) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  }

  function navigationElementLabel(element) {
    const section = element.matches('main,section,[data-section]')
      ? element
      : element.closest('main,section,[data-section]');
    const heading = element.matches('h1,h2,h3')
      ? element
      : element.querySelector('h1,h2,h3') || section?.querySelector('h1,h2,h3');
    return normalize([
      element.dataset.section,
      element.id?.replace(/[-_]/g, ' '),
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      heading?.textContent,
    ].filter(Boolean).join(' '));
  }

  function findPageNavigationTarget(query) {
    const candidates = [...document.querySelectorAll('[id],[data-section],h1,h2,h3')];
    let partialMatch = null;
    for (const candidate of candidates) {
      if (!isVisibleNavigationTarget(candidate)) continue;
      const label = navigationElementLabel(candidate);
      if (!label) continue;
      const section = candidate.matches('h1,h2,h3')
        ? candidate.closest('main,section,[data-section]') || candidate
        : candidate;
      if (label === query) return section;
      if (!partialMatch && query.length > 2 && containsPhrase(label, query)) partialMatch = section;
    }
    return partialMatch;
  }

  function highlightNavigationTarget(element) {
    if (!element) return;
    window.clearTimeout(navigationHighlightTimer);
    if (highlightedNavigationTarget) highlightedNavigationTarget.classList.remove('dira-navigation-highlight');
    highlightedNavigationTarget = element;
    element.classList.remove('dira-navigation-highlight');
    void element.offsetWidth;
    element.classList.add('dira-navigation-highlight');
    navigationHighlightTimer = window.setTimeout(() => {
      element.classList.remove('dira-navigation-highlight');
      if (highlightedNavigationTarget === element) highlightedNavigationTarget = null;
    }, 1500);
  }

  function revealNavigationTarget(element, block = 'start') {
    element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block });
    const category = element.closest('.tools-category[data-tool-category]');
    if (category && category.hidden) window.DIRATools?.showCategory(category.dataset.toolCategory);
    const heading = element.matches('h1,h2,h3') ? element : element.querySelector('h1,h2,h3');
    heading?.focus({ preventScroll: true });
    highlightNavigationTarget(element);
  }

  function resolveAppTarget(query) {
    const aliases = [
      { type: 'section', id: 'top', name: 'home', phrases: ['home', 'top', 'homepage'] },
      { type: 'section', id: 'shop', name: 'Shop', phrases: ['shop', 'products', 'collection', 'store'] },
      { type: 'section', id: 'tools', name: 'Digital Tools', phrases: ['tools', 'digital tools', 'utilities'] },
      { type: 'section', id: 'dynamic-qr', name: 'Dynamic QR', phrases: ['dynamic qr', 'image qr', 'qr codes', 'payment', 'payments', 'mpesa payment', 'm pesa payment'] },
      { type: 'section', id: 'why-dira-pulse', name: 'Why DIRA PULSE', phrases: ['why dira pulse', 'about', 'about dira', 'about us'] },
      { type: 'cart', name: 'your cart', phrases: ['cart', 'basket', 'shopping cart', 'checkout', 'order checkout'] },
      { type: 'tool', name: 'QR Generator', toolId: 'qr-generator', phrases: ['qr code', 'qr generator'] },
      { type: 'contact', name: 'WhatsApp support', phrases: ['contact', 'support', 'whatsapp', 'the team'] },
      { type: 'admin', name: 'admin dashboard', phrases: ['admin', 'admin dashboard', 'store dashboard'] },
      { type: 'modeler', name: '3D Studio', phrases: ['3d studio', '3d modeler', 'modeler'] },
      {
        type: 'generator-card',
        name: 'DIRA AI Image Generator',
        phrases: ['image', 'create image', 'generate image', 'ai image', 'image generator', 'dira ai image generator', 'pro plan', 'base plan', 'pro tier', 'base tier'],
      },
    ];
    const alias = aliases.find(({ phrases }) => phrases.includes(query)
      || phrases.some((phrase) => query.startsWith(`${phrase} `)));
    if (alias) {
      const element = alias.id ? document.getElementById(alias.id) : null;
      if (alias.id && !element) return null;
      if (alias.type === 'contact' && !normalizePhoneForWhatsApp()) return null;
      if (alias.type === 'generator-card') {
        const card = findTool('dira ai image generator')?.card;
        if (!card) return null;
        return {
          ...alias,
          element: card,
          reply: 'Showing DIRA AI Image Generator. Tap its card to choose Base or Pro.',
        };
      }
      if (alias.type === 'tool') {
        const card = findTool(alias.toolId)?.card;
        if (!card) return null;
        return {
          ...alias,
          element: card,
          reply: `Opening ${alias.name}.`,
        };
      }
      return {
        ...alias,
        element,
        reply: alias.type === 'cart'
          ? 'Opening your cart. Checkout is available there.'
          : alias.type === 'contact'
            ? 'Opening WhatsApp support.'
            : alias.type === 'admin'
              ? 'Opening the admin dashboard.'
              : alias.type === 'modeler'
                ? 'Opening 3D Studio.'
                : `Showing ${alias.name}.`,
      };
    }

    const category = [...document.querySelectorAll('.tools-category[data-tool-category]')]
      .find((section) => normalize(section.dataset.toolCategory) === query
        || normalize(section.querySelector('h1,h2,h3')?.textContent || '') === query);
    if (category) {
      return { type: 'category', name: category.dataset.toolCategory, element: category, reply: `Showing ${category.dataset.toolCategory} tools.` };
    }

    const tool = findTool(query);
    if (tool) {
      if (tool.card.dataset.toolId === 'dira-image-generator') {
        return {
          type: 'generator-card',
          name: tool.card.querySelector('strong')?.textContent || 'DIRA AI Image Generator',
          element: tool.card,
          reply: 'Showing DIRA AI Image Generator. Tap its card to choose Base or Pro.',
        };
      }
      return {
        type: 'tool',
        name: tool.card.querySelector('strong')?.textContent || tool.card.dataset.toolId,
        element: tool.card,
        toolId: tool.card.dataset.toolId,
        reply: `Opening ${tool.card.querySelector('strong')?.textContent || 'the tool'}.`,
      };
    }

    const element = findPageNavigationTarget(query);
    if (!element) return null;
    const label = element.dataset.section || element.querySelector('h1,h2,h3')?.textContent || element.id;
    return { type: 'section', name: normalize(label), element, reply: `Showing ${label}.` };
  }

  async function activateAppTarget(target) {
    if (target.type === 'section' || target.type === 'category' || target.type === 'generator-card') {
      if (target.element.id === 'dynamic-qr') window.DIRATools?.showCategory('Design');
      if (target.type === 'category') window.DIRATools?.showCategory(target.name);
      revealNavigationTarget(target.element, target.type === 'generator-card' ? 'center' : 'start');
      return;
    }
    if (target.type === 'cart') {
      const openCart = document.getElementById('open-cart');
      const drawer = document.getElementById('cart-drawer');
      if (!openCart || !drawer) throw new Error('The cart drawer is unavailable on this page.');
      openCart.click();
      highlightNavigationTarget(drawer);
      return;
    }
    if (target.type === 'admin') {
      const openAdmin = document.getElementById('open-admin');
      const dialog = document.getElementById('admin-dialog');
      if (!openAdmin || !dialog) throw new Error('The admin dashboard is unavailable on this page.');
      openAdmin.click();
      highlightNavigationTarget(dialog);
      return;
    }
    if (target.type === 'contact') {
      const url = `https://wa.me/${normalizePhoneForWhatsApp()}`;
      window.DIRASecurityDiagnostics?.reportNavigationAttempt(url, 'DIRA contact navigation');
      window.location.assign(url);
      return;
    }
    if (target.type === 'modeler') {
      window.location.assign('/modeler.html');
      return;
    }
    if (target.type === 'tool') {
      const tools = window.DIRATools;
      if (!tools?.openTool) throw new Error('Digital Tools are still loading. Please try again.');
      await tools.openTool(target.toolId);
      const dialog = document.querySelector('#tools-paywall[open], #tools-workspace[open]');
      highlightNavigationTarget(dialog || target.element);
    }
  }

  function navigateToAppTarget(target) {
    const query = getNavigationRequest(target);
    if (!query) return null;
    const appTarget = resolveAppTarget(query);
    if (!appTarget) return null;
    window.clearTimeout(pendingNavigationTimer);
    pendingNavigationTimer = window.setTimeout(() => {
      pendingNavigationTimer = undefined;
      closePanel();
      window.requestAnimationFrame(() => {
        activateAppTarget(appTarget).catch((error) => {
          console.error('Could not navigate to the requested app target:', error);
          openPanel();
          addMessage('assistant', `I couldn't open ${appTarget.name}: ${error.message}`);
          setStatus(error.message, 'error');
        });
      });
    }, 500);
    return appTarget.reply;
  }

  async function runCommand(message) {
    const query = normalize(message);
    if (/^(?:stop|stop speaking|be quiet)$/.test(query)) {
      window.speechSynthesis?.cancel();
      $('[data-va-action="stop-speaking"]').disabled = true;
      return 'Stopped speaking.';
    }
    if (/^(?:mute|mute voice|turn voice off|voice off)$/.test(query)) {
      setVoiceEnabled(false);
      return 'Voice responses are off. Text responses will continue.';
    }
    if (/^(?:unmute|turn voice on|voice on)$/.test(query)) {
      setVoiceEnabled(true);
      return voiceEnabled ? 'Voice responses are on.' : 'Spoken responses are not supported in this browser.';
    }
    if (/^(?:copy|copy the|copy my)?\s*(?:assistant|page|website)?\s*(?:link|url)$/.test(query)
      || /^(?:copy assistant link|copy this page link)$/.test(query)) {
      await copyText(assistantUrl());
      return 'Assistant link copied to your clipboard.';
    }
    if (/^(?:open|show|use)\s+(?:the\s+)?(?:assistant|voice assistant)$/.test(query)) {
      openPanel();
      return 'The assistant is open. You can type or tap Speak.';
    }
    return navigateToAppTarget(message);
  }

  function builtInAnswer(message) {
    const query = normalize(message);
    if (/dira pulse|about dira|who are you|what do you do/.test(query)) {
      return 'DIRA PULSE TECHNOLOGIES helps people find everyday technology, devices, and accessories, with practical digital tools on this site.';
    }
    if (/image generator|generate image|ai image|image prompt/.test(query)) {
      return 'Open DIRA AI Image Generator from the featured tool card. Base includes 5 images per day per IP; Pro costs KES 700/month for up to 60 images per approved phone after M-Pesa payment to 0794940193 and admin approval. Your prompt is sent after trimming surrounding whitespace only.';
    }
    if (/tool|pdf|image|invoice|calculator|email/.test(query)) {
      return 'Browse Digital Tools to find browser-based PDF, image, business, money, and everyday utilities. Select a tool card to open it; any access price and approval steps are shown in the existing flow.';
    }
    if (/dynamic qr|qr code|qr image/.test(query)) {
      return 'Open Dynamic QR to submit an image, payer phone number, and M-Pesa transaction code. The link becomes available after payment approval.';
    }
    if (/mpesa|m-pesa|pay|payment|price|cost|checkout|order/.test(query)) {
      return 'Tool prices appear on their cards. For product orders, add items to your cart and choose Continue to WhatsApp to confirm payment and delivery details with the team.';
    }
    if (/delivery|shipping|deliver/.test(query)) {
      return 'Delivery and payment details can be confirmed with the team during WhatsApp checkout. Add products to your cart and choose Continue to WhatsApp.';
    }
    if (/contact|support|help/.test(query)) {
      return 'I can help you navigate Shop, Digital Tools, and Dynamic QR. You can also ask to open WhatsApp or use the site navigation.';
    }
    return 'I can help with the DIRA PULSE site, common tool and payment steps, or navigation. Try “open the tools,” “open cart,” or ask about DIRA AI Image Generator.';
  }

  function resolveEndpoint() {
    if (!configuredEndpoint) return '';
    const url = new URL(configuredEndpoint, window.location.href);
    if (url.protocol !== 'https:' && url.origin !== window.location.origin) {
      throw new Error('The assistant endpoint must use HTTPS or this site’s own origin.');
    }
    return url.href;
  }

  async function requestBackendAnswer(message) {
    const endpoint = resolveEndpoint();
    if (!endpoint) return null;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, source: 'dira-voice-assistant' }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Assistant service returned HTTP ${response.status}.`);
      const body = await response.text();
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        payload = { answer: body };
      }
      const answer = payload.answer || payload.response || payload.message || payload.text;
      if (typeof answer !== 'string' || !answer.trim()) throw new Error('Assistant service returned no answer.');
      return answer.trim();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function setVoiceEnabled(enabled) {
    const supported = Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
    voiceEnabled = Boolean(enabled && supported);
    const control = $('[data-va-action="toggle-voice"]');
    control.disabled = !supported;
    control.title = supported ? '' : 'Spoken responses are not supported in this browser.';
    control.textContent = voiceEnabled ? 'Voice On' : 'Voice Off';
    control.setAttribute('aria-pressed', String(voiceEnabled));
    if (!voiceEnabled) window.speechSynthesis?.cancel();
  }

  function speak(text) {
    if (!voiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = document.documentElement.lang || 'en';
    utterance.onstart = () => { $('[data-va-action="stop-speaking"]').disabled = false; };
    utterance.onend = () => { $('[data-va-action="stop-speaking"]').disabled = true; };
    utterance.onerror = (event) => {
      $('[data-va-action="stop-speaking"]').disabled = true;
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      setStatus('Text is available; spoken output could not start.', 'error');
    };
    window.speechSynthesis.speak(utterance);
  }

  async function submitMessage(rawMessage) {
    const message = rawMessage.trim();
    if (!message) return;
    const sendButton = $('[data-va-form] button[type="submit"]');
    sendButton.disabled = true;
    addMessage('user', message);
    setStatus('Thinking…');
    try {
      let answer = await runCommand(message);
      if (answer === null) {
        try {
          answer = await requestBackendAnswer(message);
        } catch (error) {
          console.warn('Voice assistant endpoint unavailable; using built-in guidance:', error);
          setStatus('Assistant service unavailable. Using built-in guidance.', 'error');
        }
        if (!answer) answer = builtInAnswer(message);
      }
      addMessage('assistant', answer);
      speak(answer);
      if (!$('[data-va-status]').dataset.state) setStatus('');
    } catch (error) {
      console.error('Voice assistant request failed:', error);
      const answer = builtInAnswer(message);
      addMessage('assistant', answer);
      setStatus('Using built-in guidance because this action could not be completed.', 'error');
      speak(answer);
    } finally {
      sendButton.disabled = false;
    }
  }

  function updateListeningState(isActive) {
    listening = isActive;
    const mic = $('[data-va-action="mic"]');
    mic.classList.toggle('is-listening', isActive);
    mic.setAttribute('aria-pressed', String(isActive));
    $('[data-va-mic-label]').textContent = isActive ? 'Stop listening' : 'Speak';
    mic.setAttribute('aria-label', mic.disabled ? 'Voice input unavailable' : (isActive ? 'Stop listening' : 'Start voice input'));
    mic.title = mic.disabled ? 'Voice input is not available in this browser.' : (isActive ? 'Stop listening' : 'Start voice input');
  }

  function submitAssistantForm() {
    const form = $('[data-va-form]');
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
      return;
    }
    form.querySelector('button[type="submit"]')?.click();
  }

  function getSpeechRecognitionConstructor() {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      return typeof SpeechRecognition === 'function' ? SpeechRecognition : null;
    } catch (error) {
      console.warn('Speech recognition could not be detected:', error);
      return null;
    }
  }

  function clearRecognitionTimers() {
    window.clearTimeout(recognitionHandoffTimer);
    window.clearTimeout(recognitionWatchdogTimer);
    recognitionHandoffTimer = undefined;
    recognitionWatchdogTimer = undefined;
  }

  function abortRecognitionInstance(instance, warning) {
    if (!instance) return;
    try {
      if (typeof instance.abort === 'function') instance.abort();
      else instance.stop();
    } catch (error) {
      console.warn(warning, error);
      try {
        if (typeof instance.stop === 'function') instance.stop();
      } catch (stopError) {
        console.warn('Speech recognition could not stop after abort failed:', stopError);
      }
    }
  }

  function retireRecognition(instance, abort = false) {
    if (recognition === instance) {
      recognition = null;
      recognitionAttemptId += 1;
      clearRecognitionTimers();
    }
    if (abort) abortRecognitionInstance(instance, 'Speech recognition could not abort:');
  }

  function markRecognitionUnavailable() {
    const mic = $('[data-va-action="mic"]');
    const message = "Live voice input isn't supported in this browser or in-app browser. Type your message below.";
    mic.disabled = true;
    mic.title = 'Live speech recognition is not supported in this browser.';
    mic.setAttribute('aria-label', 'Voice input unavailable');
    $('[data-va-mic-note]').textContent = message;
    setStatus(message, 'unsupported');
  }

  function setupRecognition() {
    const mic = $('[data-va-action="mic"]');
    if (!getSpeechRecognitionConstructor()) {
      markRecognitionUnavailable();
      return;
    }
    mic.disabled = false;
    mic.title = 'Start voice input';
    mic.setAttribute('aria-label', 'Start voice input');
  }

  function releaseAudioOutput() {
    try {
      window.speechSynthesis?.cancel();
    } catch (error) {
      console.warn('Speech output could not be cancelled before microphone input:', error);
    }

    document.querySelectorAll('audio, video').forEach((media) => {
      if (media.paused || media.ended || media.muted || media.volume === 0) return;
      try {
        media.pause();
        if (Number.isFinite(media.duration) && media.duration > 0) media.currentTime = 0;
      } catch (error) {
        console.warn('Media playback could not be reset before microphone input:', error);
      }
    });
  }

  function startRecognition() {
    if (recognition) retireRecognition(recognition, true);
    else clearRecognitionTimers();

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      markRecognitionUnavailable();
      return;
    }

    let session;
    try {
      session = new SpeechRecognition();
      if (!session || typeof session.start !== 'function' || typeof session.stop !== 'function') {
        throw new TypeError('SpeechRecognition is missing required methods.');
      }
      session.lang = navigator.language || 'en-KE';
      session.continuous = false;
      session.interimResults = true;
      recognition = session;
      recognitionAttemptId += 1;
      const attemptId = recognitionAttemptId;
      const isCurrentSession = () => recognition === session && recognitionAttemptId === attemptId;

      session.onstart = () => {
        if (!isCurrentSession()) return;
        updateListeningState(true);
        $('[data-va-mic-note]').textContent = 'Type a message, or tap Speak to use voice input.';
        setStatus('Listening… Speak now.', 'listening');
        armRecognitionWatchdogForCurrentSession();
      };
      session.onresult = (event) => {
        if (!isCurrentSession()) return;
        armRecognitionWatchdogForCurrentSession();
        let interim = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript;
          if (typeof transcript !== 'string') continue;
          if (result.isFinal) finalTranscript += `${transcript} `;
          else interim += transcript;
        }
        $('[data-va-input]').value = `${finalTranscript}${interim}`.trimStart();
        if (interim) setStatus(`Listening… ${interim}`, 'listening');
      };
      session.onerror = (event) => {
        if (!isCurrentSession()) return;
        submitVoiceTranscript = false;
        updateListeningState(false);
        const messages = {
          'not-allowed': {
            message: 'Microphone blocked. Allow access in browser/site settings, then retry or type below.',
            state: 'error',
          },
          'service-not-allowed': {
            message: 'Speech access blocked. Check browser/site permissions, then retry or type below.',
            state: 'error',
          },
          'audio-capture': {
            message: 'No microphone found. Check its connection and site permission, or type below.',
            state: 'error',
          },
          'no-speech': {
            message: "No speech detected. Tap Speak to retry or type below.",
            state: 'notice',
          },
          network: {
            message: 'Speech service unavailable. Check your connection, retry or type below.',
            state: 'notice',
          },
        };
        const feedback = messages[event.error] || {
          message: "Voice input didn't start—tap Speak to retry or type below.",
          state: 'notice',
        };
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          $('[data-va-mic-note]').textContent = 'Mic access blocked. Check browser/site settings or type below.';
        } else if (event.error === 'audio-capture') {
          $('[data-va-mic-note]').textContent = 'No mic available. Check its connection/site settings or type below.';
        }
        retireRecognition(session, true);
        setStatus(feedback.message, feedback.state);
      };
      session.onend = () => {
        if (!isCurrentSession()) return;
        const transcript = finalTranscript.trim();
        const shouldSubmit = submitVoiceTranscript && Boolean(transcript);
        submitVoiceTranscript = false;
        updateListeningState(false);
        retireRecognition(session);
        if (shouldSubmit) {
          $('[data-va-input]').value = transcript;
          submitAssistantForm();
          return;
        }
        if (!root.classList.contains('is-open')) return;
        const state = $('[data-va-status]').dataset.state;
        if (state === 'error' || state === 'unsupported' || state === 'notice') return;
        if ($('[data-va-input]').value.trim()) {
          setStatus('Listening stopped. Review your transcript, then tap Send or type below.', 'notice');
        } else {
          setStatus("Didn't catch that—tap Speak to try again or type below.", 'notice');
        }
      };
    } catch (error) {
      if (session) {
        if (recognition === session) retireRecognition(session, true);
        else abortRecognitionInstance(session, 'Speech recognition could not abort after setup failed:');
      }
      submitVoiceTranscript = false;
      updateListeningState(false);
      console.warn('Speech recognition could not be initialized:', error);
      setStatus("Live voice input couldn't be prepared. Tap Speak to retry or type below.", 'error');
      return;
    }

    finalTranscript = '';
    submitVoiceTranscript = true;
    $('[data-va-input]').value = '';
    $('[data-va-mic-note]').textContent = 'Type a message, or tap Speak to use voice input.';
    setStatus('Preparing microphone…', 'listening');
    updateListeningState(true);
    releaseAudioOutput();
    armRecognitionWatchdogForCurrentSession();

    const activeSession = recognition;
    const attemptId = recognitionAttemptId;
    const handoffTimer = window.setTimeout(() => {
      if (recognition !== activeSession || recognitionAttemptId !== attemptId) return;
      if (recognitionHandoffTimer === handoffTimer) recognitionHandoffTimer = undefined;
      try {
        activeSession.start();
      } catch (error) {
        if (recognition !== activeSession || recognitionAttemptId !== attemptId) return;
        submitVoiceTranscript = false;
        updateListeningState(false);
        retireRecognition(activeSession, true);
        console.warn('Speech recognition could not start:', error);
        setStatus('Voice input could not start—check microphone permission or type below.', 'error');
      }
    }, RECOGNITION_HANDOFF_MS);
    recognitionHandoffTimer = handoffTimer;
  }

  function armRecognitionWatchdogForCurrentSession() {
    if (!recognition) return;
    const session = recognition;
    const attemptId = recognitionAttemptId;
    window.clearTimeout(recognitionWatchdogTimer);
    recognitionWatchdogTimer = window.setTimeout(() => {
      if (recognition !== session || recognitionAttemptId !== attemptId) return;
      submitVoiceTranscript = false;
      updateListeningState(false);
      retireRecognition(session, true);
      if (root.classList.contains('is-open')) {
        setStatus('Voice input timed out. Tap Speak to retry or type below.', 'notice');
      }
    }, RECOGNITION_WATCHDOG_MS);
  }

  function handleMic() {
    if (listening) {
      const activeSession = recognition;
      submitVoiceTranscript = false;
      updateListeningState(false);
      setStatus($('[data-va-input]').value.trim()
        ? 'Listening stopped. Review your transcript, then tap Send or type below.'
        : "Didn't catch that—tap Speak to try again or type below.", 'notice');
      if (!activeSession) {
        clearRecognitionTimers();
        return;
      }
      if (recognitionHandoffTimer !== undefined) {
        retireRecognition(activeSession, true);
        return;
      }
      try {
        activeSession.stop();
      } catch (error) {
        console.warn('Speech recognition could not stop:', error);
        retireRecognition(activeSession, true);
        setStatus("Voice input couldn't stop cleanly—tap Speak to retry or type below.", 'notice');
      }
      return;
    }
    startRecognition();
  }

  function setImageStatus(message, state = '') {
    const status = $('[data-va-image-status]');
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = !message;
  }

  function normalizePayerPhone(value) {
    const digits = value.replace(/\D/g, '');
    if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
    if (/^254[17]\d{8}$/.test(digits)) return digits;
    return '';
  }

  async function postImageApi(path, payload) {
    const endpoint = `${imageApiBaseUrl}/api/image/${path}`;
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      const requestError = new Error(
        `Cannot reach the DIRA image backend at ${imageApiBaseUrl}. Start the backend or set window.DIRA_API_BASE_URL to its URL, then check that it allows this page's origin.`,
      );
      requestError.code = 'backend_unreachable';
      throw requestError;
    }
    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      const responseError = new Error(
        `The configured image backend returned HTTP ${response.status} with a non-JSON response. Check that the URL points to the DIRA API server, not a static-only server.`,
      );
      responseError.status = response.status;
      responseError.code = 'invalid_backend_response';
      throw responseError;
    }
    if (!response.ok) {
      const message = typeof data.error === 'string' && data.error
        ? data.error
        : `The DIRA image backend returned HTTP ${response.status} without an error message.`;
      const details = typeof data.details === 'string' && data.details ? `\nDetails: ${data.details}` : '';
      const requestError = new Error(`${message}${details}`);
      requestError.status = response.status;
      requestError.code = data.code || 'image_backend_error';
      throw requestError;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      const responseError = new Error('The DIRA image backend returned an unexpected response. Check its server logs and API deployment.');
      responseError.code = 'invalid_backend_response';
      throw responseError;
    }
    return data;
  }

  function imagePlanText(tier = selectedImageTier) {
    return tier === 'pro'
      ? `Pro · KES ${IMAGE_PRO_PRICE_KES}/month · up to ${IMAGE_PRO_MONTHLY_LIMIT} images per 30 days per approved phone`
      : `Base · up to ${IMAGE_BASE_DAILY_LIMIT} images per day per IP`;
  }

  function setImageTierUi() {
    const isPro = selectedImageTier === 'pro';
    $('[data-va-image-plan]').textContent = imagePlanText();
    root.querySelectorAll('.voice-assistant-image-model').forEach((label) => {
      label.classList.toggle('is-selected', label.querySelector('[data-va-image-tier]').checked);
    });
    $('[data-va-pro-gate]').hidden = !isPro || imageProApproved;
    $('[data-va-action="generate-image"]').disabled = imageGenerationInProgress || (isPro && !imageProApproved);
  }

  async function checkImageProAccess() {
    const requestId = ++imageProAccessRequest;
    const enteredPhone = $('[data-va-pro-phone]').value.trim();
    const phone = enteredPhone
      ? normalizePayerPhone(enteredPhone)
      : normalizePayerPhone(localStorage.getItem(TOOL_PHONE_STORAGE_KEY) || '');
    if (!phone) {
      imageProApproved = false;
      setImageTierUi();
      setImageStatus('Enter your payer phone number to check Pro approval or submit payment.', 'notice');
      return false;
    }
    setImageStatus('Checking Pro approval…');
    try {
      const data = await postImageApi('pro/access', { phone });
      if (requestId !== imageProAccessRequest) return false;
      imageProApproved = data.approved === true;
      if (imageProApproved) {
        $('[data-va-pro-phone]').value = phone;
        localStorage.setItem(TOOL_PHONE_STORAGE_KEY, phone);
        setImageTierUi();
        setImageStatus(`Pro access is active. ${IMAGE_PRO_MONTHLY_LIMIT} image generations are available per 30-day period for this approved phone.`, 'success');
        return true;
      }
      setImageTierUi();
      setImageStatus('Pro is not approved yet. Submit your KES 700/month payment, then check again after admin approval.', 'notice');
      return false;
    } catch (error) {
      if (requestId === imageProAccessRequest) {
        setImageTierUi();
        setImageStatus(error.message, 'error');
      }
      return false;
    }
  }

  async function submitImageProPayment() {
    const phone = normalizePayerPhone($('[data-va-pro-phone]').value);
    const code = $('[data-va-pro-code]').value.trim().toUpperCase();
    if (!phone) {
      setImageStatus('Enter a valid Kenyan payer number: +254…, 254…, 07… or 01….', 'error');
      return;
    }
    if (phone === '254794940193') {
      setImageStatus('Use the payer’s number, not DIRA PULSE recipient number 0794940193.', 'error');
      return;
    }
    if (!/^[A-Z0-9]{8,20}$/.test(code)) {
      setImageStatus('Enter the M-Pesa confirmation code for your KES 700 Pro payment.', 'error');
      return;
    }

    const submitButton = $('[data-va-action="submit-image-pro-payment"]');
    submitButton.disabled = true;
    setImageStatus('Submitting the KES 700/month Pro payment for review…');
    try {
      const data = await postImageApi('pro/payment', { phone, mpesaCode: code });
      localStorage.setItem(TOOL_PHONE_STORAGE_KEY, phone);
      $('[data-va-pro-phone]').value = phone;
      if (data.approved === true) {
        imageProApproved = true;
        setImageTierUi();
        setImageStatus(`Pro is active at KES ${IMAGE_PRO_PRICE_KES}/month. You can generate up to ${IMAGE_PRO_MONTHLY_LIMIT} images per 30-day period for this approved phone.`, 'success');
      } else {
        setImageStatus(data.message || 'Payment submitted. Pro access starts for one month after admin approval.', 'notice');
      }
    } catch (error) {
      setImageStatus(error.message, 'error');
    } finally {
      submitButton.disabled = false;
    }
  }

  async function generateImage() {
    const prompt = $('[data-va-image-prompt]').value.trim();
    const aspectRatio = $('[data-va-image-aspect]').value;
    if (!prompt) {
      setImageStatus('Describe the image you want to generate.', 'error');
      $('[data-va-image-prompt]').focus();
      return;
    }
    if (selectedImageTier === 'pro' && !imageProApproved && !(await checkImageProAccess())) return;

    const phone = selectedImageTier === 'pro'
      ? normalizePayerPhone($('[data-va-pro-phone]').value) || normalizePayerPhone(localStorage.getItem(TOOL_PHONE_STORAGE_KEY) || '')
      : '';
    const payload = { prompt, modelTier: selectedImageTier, aspectRatio };
    if (selectedImageTier === 'pro') payload.phone = phone;

    imageGenerationInProgress = true;
    const promptField = $('[data-va-image-prompt]');
    const aspectField = $('[data-va-image-aspect]');
    const tierFields = [...root.querySelectorAll('[data-va-image-tier]')];
    const generateButton = $('[data-va-action="generate-image"]');
    const result = $('[data-va-image-result]');
    promptField.disabled = true;
    aspectField.disabled = true;
    tierFields.forEach((field) => { field.disabled = true; });
    generateButton.disabled = true;
    generateButton.textContent = 'Generating…';
    result.hidden = true;
    setImageStatus(`Generating with ${selectedImageTier === 'pro' ? 'Pro' : 'Base'}…`);

    try {
      const data = await postImageApi('generate', payload);
      if (typeof data.image !== 'string' || !data.image) {
        throw new Error('The DIRA image backend returned success without image data. Check the backend logs and OpenAI model configuration.');
      }
      const mimeType = data.mimeType || 'image/png';
      const imageSource = `data:${mimeType};base64,${data.image}`;
      const image = $('[data-va-image-output]');
      image.src = imageSource;
      $('[data-va-image-download]').href = imageSource;
      $('[data-va-image-download]').download = `dira-${selectedImageTier}-${aspectRatio.replace(':', 'x')}.png`;
      $('[data-va-image-result-plan]').textContent = imagePlanText(payload.modelTier);
      result.hidden = false;
      setImageStatus('Image ready. Use Download to save it.', 'success');
    } catch (error) {
      if (error.status === 402 && selectedImageTier === 'pro') {
        imageProApproved = false;
        setImageTierUi();
      }
      setImageStatus(error.message, 'error');
    } finally {
      imageGenerationInProgress = false;
      promptField.disabled = false;
      aspectField.disabled = false;
      tierFields.forEach((field) => { field.disabled = false; });
      generateButton.textContent = 'Generate image';
      setImageTierUi();
    }
  }

  function setupImageGenerator() {
    const rememberedPhone = localStorage.getItem(TOOL_PHONE_STORAGE_KEY) || '';
    $('[data-va-pro-phone]').value = rememberedPhone;
    root.querySelectorAll('[data-va-image-tier]').forEach((field) => {
      field.addEventListener('change', () => {
        selectedImageTier = root.querySelector('[data-va-image-tier]:checked').value;
        imageProApproved = false;
        if (selectedImageTier === 'base') imageProAccessRequest += 1;
        setImageTierUi();
        if (selectedImageTier === 'pro') void checkImageProAccess();
        else setImageStatus('');
      });
    });
    setImageTierUi();
  }

  function init() {
    if (!createWidget() || root.dataset.vaInitialized === 'true') return;
    root.dataset.vaInitialized = 'true';
    $('#voice-assistant-panel').hidden = true;
    $('[data-va-share-url]').textContent = assistantUrl();
    addMessage('assistant', 'Hi! I can answer common questions and help you navigate the DIRA PULSE website. Try “open the tools” or type a question.');
    setupRecognition();
    setupImageGenerator();
    setVoiceEnabled(voiceEnabled);

    const launcher = $('#voice-assistant-launcher');
    launcher.addEventListener('click', openPanel);
    launcher.addEventListener('pointerenter', () => root.classList.add('is-energized'));
    launcher.addEventListener('pointerleave', () => {
      if (!root.classList.contains('is-open')) root.classList.remove('is-energized');
    });
    launcher.addEventListener('focus', () => root.classList.add('is-energized'));
    launcher.addEventListener('blur', () => {
      if (!root.classList.contains('is-open')) root.classList.remove('is-energized');
    });
    root.addEventListener('click', (event) => {
      if (event.target.matches('[data-va-backdrop]')) {
        closePanel();
        return;
      }
      const action = event.target.closest('[data-va-action]')?.dataset.vaAction;
      if (action === 'close') closePanel();
      else if (action === 'mic') handleMic();
      else if (action === 'toggle-voice') setVoiceEnabled(!voiceEnabled);
      else if (action === 'generate-image') void generateImage();
      else if (action === 'submit-image-pro-payment') void submitImageProPayment();
      else if (action === 'check-image-pro-access') void checkImageProAccess();
      else if (action === 'stop-speaking') {
        window.speechSynthesis?.cancel();
        $('[data-va-action="stop-speaking"]').disabled = true;
        setStatus('Stopped speaking.');
      } else if (action === 'copy-link') {
        copyText(assistantUrl()).then(() => setStatus('Assistant link copied.')).catch((error) => {
          console.error('Could not copy assistant link:', error);
          setStatus(error.message, 'error');
        });
      }
    });
    $('[data-va-form]').addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('[data-va-input]');
      const message = input.value;
      input.value = '';
      submitMessage(message);
    });
    $('[data-va-input]').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        submitAssistantForm();
      }
    });
    document.addEventListener('keydown', (event) => {
      const panelOpen = !$('#voice-assistant-panel').hidden && root.classList.contains('is-open');
      if (event.key === 'Escape' && panelOpen) {
        closePanel();
      } else if (((event.key === '/' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey)
        || (event.key.toLowerCase() === 'd' && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey))
        && !event.repeat && !isTypingTarget(event.target)) {
        event.preventDefault();
        if (panelOpen) closePanel();
        else openPanel();
      }
    });
    window.DIRAVoiceAssistant = Object.freeze({ open: openPanel, close: closePanel, openImageGenerator });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else init();
})();
