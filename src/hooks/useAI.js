import { useCallback, useRef } from 'react';
import useLocalStorage from './useLocalStorage';

const DEFAULT_CONFIG = {
  provider: '',
  apiKey: '',
  endpoint: '',
  model: 'opencode/deepseek-v4-flash-free',
};

function normalizeEndpoint(endpoint, provider) {
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

function getModel(config) {
  if (config.model) return config.model;
  return 'opencode/deepseek-v4-flash-free';
}

async function callAI(endpoint, apiKey, model, messages, maxTokens) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let res;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out after 30 seconds');
    }
    throw err;
  }

  clearTimeout(timeoutId);
  const text = await res.text();

  if (!res.ok) {
    const detail = text.length > 300 ? text.slice(0, 300) + '...' : text;
    throw new Error(`HTTP ${res.status} from ${endpoint}: ${detail}`);
  }

  if (text.startsWith('<')) {
    throw new Error(`Expected JSON from ${endpoint}, got HTML (${text.slice(0, 60)}...). Check the endpoint URL.`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${endpoint}: ${text.slice(0, 150)}...`);
  }
}

export default function useAI() {
  const [config, setConfig] = useLocalStorage('crescendo-ai-config', DEFAULT_CONFIG);
  const configRef = useRef(config);
  configRef.current = config;

  const updateConfig = useCallback((partial) => {
    setConfig(prev => ({ ...prev, ...partial }));
  }, [setConfig]);

  const isConfigured = true;

  const generateTitle = useCallback(async (content, signal) => {
    const cfg = configRef.current;
    try {
      if (signal?.aborted) return null;
      const endpoint = normalizeEndpoint(cfg.endpoint, cfg.provider);
      const model = getModel(cfg);
      const data = await callAI(endpoint, cfg.apiKey, model, [
        { role: 'system', content: 'Generate a short, descriptive title (max 60 chars) for the following note. Return ONLY the title, no quotes or extra text.' },
        { role: 'user', content: content.slice(0, 2000) },
      ], 30);
      return data.choices?.[0]?.message?.content?.trim() || null;
    } catch {
      return null;
    }
  }, []);

  const getTagLimit = (textLength) => {
    if (textLength < 50) return 3;
    if (textLength < 200) return 5;
    if (textLength < 500) return 8;
    if (textLength < 1500) return 12;
    if (textLength < 5000) return 20;
    if (textLength < 10000) return 30;
    return 50;
  };

  const generateTags = useCallback(async (content, signal) => {
    const cfg = configRef.current;
    try {
      if (signal?.aborted) return null;
      const endpoint = normalizeEndpoint(cfg.endpoint, cfg.provider);
      const model = getModel(cfg);
      const maxTags = getTagLimit(content.length);
      const data = await callAI(endpoint, cfg.apiKey, model, [
        { role: 'system', content: `Analyze this text and generate 2-${maxTags} thematic tags that capture its core subject matter and ideas at a conceptual level. Tags should be abstract topic labels like "Environmental Conservation", "Personal Growth", "Technology & Society", "Honesty & Integrity" — not single keywords. If the text is about relationships, use tags like "Relationships & Connection". If about a specific domain, use tags like "Science & Discovery" or "Business & Innovation". Return ONLY a JSON array of strings.` },
        { role: 'user', content: content.slice(0, 3000) },
      ], 300);
      const text = data.choices?.[0]?.message?.content?.trim() || '[]';
      return JSON.parse(text);
    } catch {
      return null;
    }
  }, []);

  const generateBoth = useCallback(async (content, signal) => {
    const [aiTitle, aiTags] = await Promise.all([
      generateTitle(content, signal),
      generateTags(content, signal),
    ]);
    if (signal?.aborted) return {};
    return { title: aiTitle, tags: aiTags };
  }, [generateTitle, generateTags]);

  const testConnection = useCallback(async (testConfig) => {
    const cfg = testConfig || configRef.current;
    try {
      const endpoint = normalizeEndpoint(cfg.endpoint, cfg.provider);
      const model = getModel(cfg);
      const data = await callAI(endpoint, cfg.apiKey, model, [
        { role: 'user', content: 'Reply with just the word "OK".' },
      ], 5);
      const reply = data.choices?.[0]?.message?.content?.trim();
      return reply
        ? `Connected via ${endpoint} — Reply: "${reply}"`
        : `Connected via ${endpoint} — Unexpected response: ${JSON.stringify(data).slice(0, 100)}`;
    } catch (err) {
      return `❌ ${err.message}`;
    }
  }, []);

  return { config, updateConfig, isConfigured, generateBoth, generateTitle, generateTags, testConnection };
}