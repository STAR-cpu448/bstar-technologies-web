const net = require('node:net');

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self' https://wa.me",
  "script-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob: https://cdnjs.cloudflare.com",
  "frame-src 'self'",
  "media-src 'self' blob: https:",
].join('; ');

const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
});

function isSafeOrigin(value) {
  if (typeof value !== 'string' || !value) return false;
  try {
    const url = new URL(value);
    if (url.origin !== value || url.username || url.password) return false;
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:'
      && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

function createAllowedOrigins(...originLists) {
  return new Set(originLists
    .flatMap((originList) => Array.isArray(originList) ? originList : [originList])
    .flatMap((origins) => typeof origins === 'string' ? origins.split(',') : [])
    .map((origin) => origin.trim())
    .filter(isSafeOrigin));
}

function getClientIp(request, trustProxy = false) {
  if (typeof request.ip === 'string' && request.ip.trim()) {
    return request.ip.trim();
  }

  const remoteAddress = request.socket?.remoteAddress
    || request.connection?.remoteAddress;
  if (trustProxy) {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    const forwardedAddresses = typeof forwardedFor === 'string'
      ? forwardedFor.split(',').map((address) => address.trim()).filter((address) => net.isIP(address))
      : [];
    if (forwardedAddresses.length) return forwardedAddresses[forwardedAddresses.length - 1];
  }
  return remoteAddress || 'unknown';
}

const RATE_LIMIT_POLICIES = Object.freeze({
  'POST /api/email/transform': { limit: 10, windowMs: 60_000 },
  'POST /api/modeler/payment': { limit: 8, windowMs: 60_000 },
  'POST /api/modeler/export': { limit: 20, windowMs: 60_000 },
  'POST /api/image/generate': { limit: 5, windowMs: 60_000 },
  'POST /api/image/pro/access': { limit: 20, windowMs: 60_000 },
  'POST /api/image/pro/payment': { limit: 5, windowMs: 60_000 },
  'POST /api/qr/create': { limit: 5, windowMs: 10 * 60_000 },
});

function getRateLimitPolicy(method, pathname) {
  if (method === 'GET' && /^\/(?:qr|r|img-qr)\//.test(pathname)) {
    return { limit: 120, windowMs: 60_000 };
  }
  return RATE_LIMIT_POLICIES[`${method} ${pathname}`]
    || (pathname.startsWith('/api/') ? { limit: 60, windowMs: 60_000 } : null);
}

function createRateLimiter({ trustProxy = false, maxEntries = 50_000 } = {}) {
  const buckets = new Map();
  let requestsSinceCleanup = 0;

  function removeExpired(now) {
    for (const [key, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(key);
    }
  }

  function sendLimitedResponse(response, retryAfterSeconds, limit = 0, remaining = 0) {
    response.setHeader('Retry-After', String(retryAfterSeconds));
    response.setHeader('RateLimit-Limit', String(limit));
    response.setHeader('RateLimit-Remaining', String(remaining));
    response.setHeader('RateLimit-Reset', String(retryAfterSeconds));
    const payload = {
      error: 'Too many requests. Please wait before trying again.',
      code: 'rate_limited',
      retryAfterSeconds,
    };
    if (typeof response.status === 'function' && typeof response.json === 'function') {
      response.status(429).json(payload);
      return;
    }
    const body = JSON.stringify(payload);
    response.writeHead(429, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-store',
    });
    response.end(body);
  }

  return function enforceRateLimit(request, response, scope, policy) {
    if (!policy || request.method === 'OPTIONS') return true;

    const now = Date.now();
    requestsSinceCleanup += 1;
    if (requestsSinceCleanup >= 256) {
      removeExpired(now);
      requestsSinceCleanup = 0;
    }

    const clientIp = getClientIp(request, trustProxy);
    const key = `${scope}\u0000${clientIp}`;
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (!bucket && buckets.size >= maxEntries) {
        removeExpired(now);
        if (buckets.size >= maxEntries) {
          sendLimitedResponse(response, Math.ceil(policy.windowMs / 1000));
          return false;
        }
      }
      bucket = { count: 0, resetAt: now + policy.windowMs };
      buckets.set(key, bucket);
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    if (bucket.count >= policy.limit) {
      sendLimitedResponse(response, retryAfterSeconds, policy.limit, 0);
      return false;
    }

    bucket.count += 1;
    response.setHeader('RateLimit-Policy', `${policy.limit};w=${Math.ceil(policy.windowMs / 1000)}`);
    response.setHeader('RateLimit-Limit', String(policy.limit));
    response.setHeader('RateLimit-Remaining', String(policy.limit - bucket.count));
    response.setHeader('RateLimit-Reset', String(retryAfterSeconds));
    return true;
  };
}

module.exports = {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
  createAllowedOrigins,
  createRateLimiter,
  getClientIp,
  getRateLimitPolicy,
};
