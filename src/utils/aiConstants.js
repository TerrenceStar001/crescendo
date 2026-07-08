export const AI_TIMEOUT = {
  SHORT: 15000,
  MEDIUM: 60000,
  LONG: 180000,
  XLONG: 300000,
};

export const AI_RETRY = {
  NONE: 0,
  LIGHT: 1,
  MODERATE: 2,
  HEAVY: 3,
};

export function normalizeEndpoint(endpoint, provider) {
  if (!endpoint) {
    return '/api/ai/chat/completions';
  }

  if (endpoint.startsWith('/api/ai')) {
    return endpoint;
  }

  const trimmed = endpoint.replace(/\/+$/, '');

  if (trimmed.endsWith('/chat/completions')) {
    return trimmed;
  }

  if (provider === 'nvidia' || trimmed.includes('nvidia')) {
    const ep = trimmed.replace(/\/v1\/?$/, '').replace(/\/+$/, '') + '/v1';
    return ep + '/chat/completions';
  }

  if (provider === 'openai' && trimmed.endsWith('/v1')) {
    return trimmed + '/chat/completions';
  }

  return trimmed + '/chat/completions';
}

export async function doFetch(url, apiKey, model, messages, opts = {}) {
  const { maxTokens = 2000, temperature = 0.3 } = opts;
  let { signal } = opts;
  const ownController = !signal;
  if (ownController) {
    const controller = new AbortController();
    signal = controller.signal;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey && url.startsWith('/')) headers['Authorization'] = `Bearer ${apiKey}`;

  let res;
  if (url.startsWith('/')) {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      signal,
    });
  } else {
    res = await fetch('/api/ai/external-proxy', {
      method: 'POST',
      headers,
      body: JSON.stringify({ endpoint: url, apiKey, model, messages, maxTokens, temperature }),
      signal,
    });
  }

  const text = await res.text();

  if (!res.ok) {
    const detail = text.length > 300 ? text.slice(0, 300) + '...' : text;
    throw new Error(`HTTP ${res.status} from ${url}: ${detail}`);
  }

  if (text.startsWith('<')) {
    throw new Error(`Expected JSON from ${url}, got HTML (${text.slice(0, 60)}...). Check the endpoint URL.`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 150)}...`);
  }
}
