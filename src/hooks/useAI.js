import { useCallback, useRef } from 'react';
import useLocalStorage from './useLocalStorage';
import { normalizeEndpoint, doFetch } from '../utils/aiConstants';

const DEFAULT_CONFIG = {
  provider: '',
  apiKey: '',
  endpoint: '',
  model: 'meta/llama-3.1-8b-instruct',
};

function getModel(config) {
  if (config.model) return config.model;
  return 'opencode/deepseek-v4-flash-free';
}

export default function useAI() {
  const [config, setConfig] = useLocalStorage('crescendo-ai-config', DEFAULT_CONFIG);
  const configRef = useRef(config);
  configRef.current = config;

  const updateConfig = useCallback((partial) => {
    setConfig(prev => ({ ...prev, ...partial }));
  }, [setConfig]);

  const isConfigured = !config.provider || !!config.apiKey;

  const generateTitle = useCallback(async (content, signal) => {
    const cfg = configRef.current;
    try {
      if (signal?.aborted) return null;
      const endpoint = normalizeEndpoint(cfg.endpoint, cfg.provider);
      const model = getModel(cfg);
      const data = await doFetch(endpoint, cfg.apiKey, model, [
        { role: 'system', content: 'Generate a short, descriptive title (max 60 chars) for the following note. Return ONLY the title, no quotes or extra text.' },
        { role: 'user', content: content.slice(0, 2000) },
      ], { maxTokens: 30, temperature: 0.3, signal });
      return data.choices?.[0]?.message?.content?.trim() || null;
    } catch {
      return null;
    }
  }, []);

  const generateTags = useCallback(async (content) => {
    if (!content || typeof content !== 'string') return [];
    try {
      const { default: corpusIndex } = await import('../utils/corpusIndex');
      const analysis = corpusIndex.detectContentType(content, '', null);
      return analysis.map(k => k.label).filter(Boolean).slice(0, 5);
    } catch {
      return [];
    }
  }, []);

  const generateBoth = useCallback(async (content, signal) => {
    const [aiTitle, localTags] = await Promise.all([
      generateTitle(content, signal),
      generateTags(content),
    ]);
    if (signal?.aborted) return {};
    return { title: aiTitle, tags: localTags };
  }, [generateTitle, generateTags]);

  const testConnection = useCallback(async (testConfig) => {
    const cfg = testConfig || configRef.current;
    try {
      const endpoint = normalizeEndpoint(cfg.endpoint, cfg.provider);
      const model = getModel(cfg);
      const data = await doFetch(endpoint, cfg.apiKey, model, [
        { role: 'user', content: 'Reply with just the word "OK".' },
      ], { maxTokens: 5, temperature: 0.3 });
      const reply = data.choices?.[0]?.message?.content?.trim();
      return reply
        ? `Connected via ${endpoint} — Reply: "${reply}"`
        : `Connected via ${endpoint} — Unexpected response: ${JSON.stringify(data).slice(0, 100)}`;
    } catch (err) {
      return `Failed: ${err.message}`;
    }
  }, []);

  return { config, updateConfig, isConfigured, generateBoth, generateTitle, generateTags, testConnection };
}
