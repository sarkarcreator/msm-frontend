const originalFetch = window.fetch.bind(window);
const inflight = new Map();
const responseCache = new Map();
const diagnostics = { requests: 0, deduped: 0, cached: 0, retries429: 0, failures: 0 };
const SESSION_CACHE_TTL = 30000;

function isApiRequest(input) {
  try {
    const url = typeof input === 'string' ? input : input?.url || '';
    return /\/api\//i.test(url) || /api\.c2rstore\.com/i.test(url);
  } catch {
    return false;
  }
}

function requestKey(input, init = {}) {
  const url = typeof input === 'string' ? input : input?.url || '';
  const method = String(init.method || (typeof input !== 'string' ? input?.method : 'GET') || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return null;
  const headers = new Headers(init.headers || (typeof input !== 'string' ? input?.headers : undefined));
  return `${method}|${url}|${headers.get('Authorization') || ''}`;
}

function isSessionRequest(input, init = {}) {
  const key = requestKey(input, init);
  return Boolean(key && /\/me(?:\?|$)/i.test(key.split('|')[1] || ''));
}

async function wait(ms) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function guardedFetch(input, init = {}) {
  diagnostics.requests += 1;
  if (!isApiRequest(input)) return originalFetch(input, init);

  const key = requestKey(input, init);
  if (!key) return originalFetch(input, init);

  const existing = inflight.get(key);
  if (existing) {
    diagnostics.deduped += 1;
    const response = await existing;
    return response.clone();
  }

  if (isSessionRequest(input, init)) {
    const cached = responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < SESSION_CACHE_TTL) {
      diagnostics.cached += 1;
      return cached.response.clone();
    }
    responseCache.delete(key);
  }

  const request = (async () => {
    let response;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await originalFetch(input, init);
      if (response.status !== 429 || attempt > 0) break;
      diagnostics.retries429 += 1;
      const retryAfter = Number(response.headers.get('Retry-After') || 0);
      await wait(Math.min(5000, Math.max(700, retryAfter * 1000 || 1000)));
    }
    if (!response.ok && response.status >= 500) diagnostics.failures += 1;
    return response;
  })();

  inflight.set(key, request);
  try {
    const response = await request;
    if (isSessionRequest(input, init) && response.ok) {
      responseCache.set(key, { timestamp: Date.now(), response: response.clone() });
    }
    return response.clone();
  } catch (error) {
    diagnostics.failures += 1;
    throw error;
  } finally {
    window.setTimeout(() => inflight.delete(key), 50);
  }
}

window.fetch = guardedFetch;
window.__dshRuntimeDiagnostics = diagnostics;
