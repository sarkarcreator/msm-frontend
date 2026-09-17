const originalFetch = window.fetch.bind(window);
const inflight = new Map();
const responseCache = new Map();
const diagnostics = { requests: 0, deduped: 0, cached: 0, retries429: 0, failures: 0 };
const SESSION_CACHE_TTL = 60000;

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
    const response = await originalFetch(input, init);
    // Do not immediately retry HTTP 429. A retry here can amplify rate limiting
    // when the application refresh loop or several UI actions hit /me together.
    if (response.status === 429) return response;
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
