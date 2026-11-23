(() => {
  'use strict';

  const script = document.currentScript;
  const configuredEndpoint = script?.dataset.endpoint || window.BSTAR_CONFIG?.voiceAssistantEndpoint || '';
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  let root;
  let recognition;
  let listening = false;
  let submitVoiceTranscript = false;
  let finalTranscript = '';
  let voiceEnabled = Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);

  const $ = (selector) => root.querySelector(selector);
  const normalize = (value) => value.toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();

  function createWidget() {
    if (document.getElementById('voice-assistant-widget')) return null;
    root = document.createElement('div');
    root.id = 'voice-assistant-widget';
    root.className = 'voice-assistant-widget';
    root.innerHTML = `
      <section class="voice-assistant-panel" id="voice-assistant-panel" aria-label="DIRA PULSE voice assistant" hidden>
        <header class="voice-assistant-header">
          <div class="voice-assistant-brand">
            <span class="voice-assistant-mark" aria-hidden="true">D</span>
            <div><strong>DIRA Assistant</strong><small>Voice and text help</small></div>
          </div>
          <button class="voice-assistant-icon-button" type="button" data-va-action="close" aria-label="Close assistant">×</button>
        </header>
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
      <button class="voice-assistant-launcher" id="voice-assistant-launcher" type="button" aria-controls="voice-assistant-panel" aria-expanded="false">
        <span class="voice-assistant-launcher-icon" aria-hidden="true">✦</span>
        <span>Ask DIRA</span>
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
    $('#voice-assistant-panel').hidden = false;
    $('#voice-assistant-launcher').setAttribute('aria-expanded', 'true');
    $('[data-va-input]').focus();
  }

  function closePanel() {
    $('#voice-assistant-panel').hidden = true;
    $('#voice-assistant-launcher').setAttribute('aria-expanded', 'false');
    $('#voice-assistant-launcher').focus();
  }

  function navigateToSection(id, label) {
    const section = document.getElementById(id);
    if (!section) return false;
    section.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    const heading = section.querySelector('h1,h2,h3');
    heading?.focus({ preventScroll: true });
    return label;
  }

  function normalizePhoneForWhatsApp() {
    const phone = window.BSTAR_CONFIG?.whatsappNumber || '';
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 9 ? digits : '';
  }

  function findTool(query) {
    const requested = /\b(?:canva|graphic design|design studio)\b/.test(query) ? 'dira design studio' : query;
    const cards = [...document.querySelectorAll('#tools [data-tool-id]')];
    const titles = cards.map((card) => ({
      card,
      title: normalize(card.querySelector('strong')?.textContent || card.dataset.toolId || ''),
      id: normalize(card.dataset.toolId || ''),
    }));
    return titles.find(({ title, id }) => title === requested || id === requested)
      || titles.find(({ title, id }) => requested && (title.includes(requested) || id.includes(requested)));
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
    if (/^(?:open|launch|go to|visit)\s+(?:the\s+)?3d studio$/.test(query)) {
      window.location.assign('/modeler.html');
      return 'Opening 3D Studio.';
    }
    if (/^(?:open|contact|message)\s+(?:whatsapp|support|the team|dira pulse)$/.test(query)) {
      const phone = normalizePhoneForWhatsApp();
      if (!phone) return 'The contact number is not configured on this page. Please use the contact information shown on the site.';
      window.location.assign(`https://wa.me/${phone}`);
      return 'Opening WhatsApp.';
    }
    if (/^(?:open|show|view)\s+(?:the\s+)?(?:cart|basket|checkout)$/.test(query)) {
      document.getElementById('open-cart')?.click();
      return 'Opening your cart. The checkout button will take you to WhatsApp to confirm your order.';
    }

    const sectionAliases = [
      { id: 'top', name: 'home', aliases: ['home', 'top', 'homepage'] },
      { id: 'shop', name: 'shop', aliases: ['shop', 'products', 'collection', 'store'] },
      { id: 'tools', name: 'digital tools', aliases: ['digital tools', 'tools', 'utilities'] },
      { id: 'dynamic-qr', name: 'Dynamic QR', aliases: ['dynamic qr', 'image qr', 'qr codes'] },
      { id: 'why-dira-pulse', name: 'Why DIRA PULSE', aliases: ['why dira pulse', 'about', 'about dira'] },
    ];
    const destination = query.replace(/^(?:please\s+)?(?:open|show|go to|navigate to|scroll to|take me to|visit)\s+/, '')
      .replace(/^(?:the|section)\s+/, '')
      .replace(/\s+(?:section|page)$/, '');
    const section = sectionAliases.find(({ aliases }) => aliases.includes(destination));
    if (section) {
      const label = navigateToSection(section.id, section.name);
      return label ? `Showing ${label}.` : `I couldn't find the ${section.name} section on this page.`;
    }

    const toolRequest = query.match(/^(?:please\s+)?(?:open|launch|start|use)\s+(?:the\s+)?(?:tool\s+)?(.+)$/);
    if (toolRequest) {
      const requestedTool = toolRequest[1].replace(/\s+(?:tool|please)$/, '');
      const match = findTool(requestedTool);
      if (!match) return `I couldn't find a tool named “${requestedTool}”. You can browse the Digital Tools section for available tools.`;
      match.card.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      match.card.click();
      return `Opening ${match.card.querySelector('strong')?.textContent || 'the tool'}. Any required access or payment step will appear in the existing tool flow.`;
    }
    return null;
  }

  function builtInAnswer(message) {
    const query = normalize(message);
    if (/dira pulse|about dira|who are you|what do you do/.test(query)) {
      return 'DIRA PULSE TECHNOLOGIES helps people find everyday technology, devices, and accessories, with practical digital tools on this site.';
    }
    if (/tool|pdf|image|invoice|calculator|email/.test(query)) {
      return 'Browse Digital Tools to find browser-based PDF, image, business, money, and everyday utilities. Select a tool card to open it; any access price and approval steps are shown in the existing flow.';
    }
    if (/dynamic qr|qr code|qr image/.test(query)) {
      return 'Open Dynamic QR to submit an image, payer phone number, and M-Pesa transaction code. The link becomes available after payment approval.';
    }
    if (/dira design|canva|template|poster|design studio/.test(query)) {
      return 'DIRA DESIGN STUDIO is KES 900 for 3 months via M-Pesa to 0794940193. Submit the payer phone and transaction code; the Canva template link unlocks after approval. It opens your own copy to edit independently.';
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
    return 'I can help with the DIRA PULSE site, common tool and payment steps, or navigation. Try “open the tools,” “open cart,” or ask about Dynamic QR or DIRA DESIGN STUDIO.';
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
    utterance.onerror = () => {
      $('[data-va-action="stop-speaking"]').disabled = true;
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
    $('[data-va-mic-label]').textContent = isActive ? 'Listening…' : 'Speak';
  }

  function setupRecognition() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const mic = $('[data-va-action="mic"]');
    if (!Recognition) {
      mic.disabled = true;
      mic.title = 'Voice input is not supported in this browser. You can type instead.';
      $('[data-va-mic-note]').textContent = 'Voice input is unavailable in this browser. Type below to continue.';
      return;
    }
    try {
      recognition = new Recognition();
      recognition.lang = navigator.language || 'en-KE';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onstart = () => {
        updateListeningState(true);
        setStatus('Listening… Speak now.', 'listening');
      };
      recognition.onresult = (event) => {
        let interim = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0].transcript;
          if (event.results[index].isFinal) finalTranscript += `${transcript} `;
          else interim += transcript;
        }
        $('[data-va-input]').value = `${finalTranscript}${interim}`.trimStart();
        if (interim) setStatus(`Listening… ${interim}`, 'listening');
      };
      recognition.onerror = (event) => {
        submitVoiceTranscript = false;
        const messages = {
          'not-allowed': 'Microphone permission was denied. You can type instead.',
          'service-not-allowed': 'Voice recognition is unavailable. You can type instead.',
          'audio-capture': 'No microphone was found. You can type instead.',
          'no-speech': 'No speech was detected. Tap Speak to try again, or type below.',
        };
        setStatus(messages[event.error] || 'Voice input stopped. You can type below instead.', 'error');
      };
      recognition.onend = () => {
        updateListeningState(false);
        const transcript = finalTranscript.trim();
        if (submitVoiceTranscript && transcript) {
          submitVoiceTranscript = false;
          $('[data-va-input]').value = transcript;
          $('[data-va-form]').requestSubmit();
        } else if ($('[data-va-status]').dataset.state === 'listening') {
          setStatus('');
        }
      };
    } catch (error) {
      console.warn('Speech recognition could not be initialized:', error);
      mic.disabled = true;
      $('[data-va-mic-note]').textContent = 'Voice recognition could not start. Type below to continue.';
    }
  }

  function handleMic() {
    if (!recognition) return;
    if (listening) {
      submitVoiceTranscript = false;
      recognition.stop();
      setStatus('Voice input stopped.');
      return;
    }
    finalTranscript = '';
    submitVoiceTranscript = true;
    $('[data-va-input]').value = '';
    try {
      recognition.start();
    } catch (error) {
      submitVoiceTranscript = false;
      console.warn('Speech recognition could not start:', error);
      setStatus('Voice input could not start. Check microphone permission or type below.', 'error');
    }
  }

  function init() {
    if (!createWidget()) return;
    $('#voice-assistant-panel').hidden = true;
    $('[data-va-share-url]').textContent = assistantUrl();
    addMessage('assistant', 'Hi! I can answer common questions and help you navigate the DIRA PULSE website. Try “open the tools” or type a question.');
    setupRecognition();
    setVoiceEnabled(voiceEnabled);

    $('#voice-assistant-launcher').addEventListener('click', openPanel);
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-va-action]')?.dataset.vaAction;
      if (action === 'close') closePanel();
      else if (action === 'mic') handleMic();
      else if (action === 'toggle-voice') setVoiceEnabled(!voiceEnabled);
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
        $('[data-va-form]').requestSubmit();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !$('#voice-assistant-panel').hidden) closePanel();
    });
    window.DIRAVoiceAssistant = Object.freeze({ open: openPanel, close: closePanel });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else init();
})();
