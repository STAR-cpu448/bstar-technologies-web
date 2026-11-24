(() => {
  'use strict';

  const expectedExternalHosts = new Set([
    'mwnburzestcooeyyuwow.supabase.co',
    'wa.me',
  ]);
  const prefix = '[DIRA security diagnostics]';

  function safeUrl(value) {
    try {
      const url = new URL(value, document.baseURI);
      url.username = '';
      url.password = '';
      if (url.search) {
        const redacted = new URLSearchParams();
        for (const key of url.searchParams.keys()) redacted.append(key, '[redacted]');
        url.search = redacted.toString();
      }
      return url.href;
    } catch {
      return String(value || 'unknown URL').slice(0, 500);
    }
  }

  function warn(message, details) {
    console.warn(`${prefix} ${message}`, details);
  }

  function reportNavigationAttempt(value, source = 'unknown') {
    let url;
    try {
      url = new URL(value, document.baseURI);
    } catch {
      warn('Invalid navigation URL', { url: safeUrl(value), source });
      return;
    }

    if (url.protocol === 'mailto:' || url.protocol === 'tel:') return;
    if (url.origin === window.location.origin) return;
    const expected = url.protocol === 'https:'
      && [...expectedExternalHosts].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
    if (!expected) {
      warn('Unexpected external navigation attempt', {
        url: safeUrl(url.href),
        source,
        protocol: url.protocol,
      });
    }
  }

  window.DIRASecurityDiagnostics = Object.freeze({ reportNavigationAttempt });

  window.addEventListener('error', (event) => {
    const target = event.target;
    if (target instanceof Element) {
      const resourceUrl = target.currentSrc
        || target.src
        || target.href
        || target.getAttribute('src')
        || target.getAttribute('href')
        || target.getAttribute('poster');
      if (resourceUrl) {
        warn('Resource failed to load', {
          url: safeUrl(resourceUrl),
          element: target.tagName.toLowerCase(),
        });
      }
      return;
    }
    if (event.filename) {
      warn('Script execution error', {
        url: safeUrl(event.filename),
        message: event.message || 'Unknown script error',
        line: event.lineno,
        column: event.colno,
      });
    }
  }, true);

  window.addEventListener('securitypolicyviolation', (event) => {
    const blockedUrl = event.blockedURI || event.sourceFile || 'unknown URL';
    warn('Browser security policy blocked a resource or action', {
      blockedUrl: blockedUrl === 'inline' || blockedUrl === 'eval' ? blockedUrl : safeUrl(blockedUrl),
      sourceUrl: event.sourceFile ? safeUrl(event.sourceFile) : '',
      directive: event.violatedDirective,
      disposition: event.disposition,
    });
  });

  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (link && !link.hasAttribute('download')) {
      reportNavigationAttempt(link.href, 'link click');
    }
  }, true);

  document.addEventListener('submit', (event) => {
    if (event.target instanceof HTMLFormElement) {
      reportNavigationAttempt(event.target.action || window.location.href, 'form submit');
    }
  }, true);
})();
