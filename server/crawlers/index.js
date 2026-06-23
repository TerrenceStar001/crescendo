import { crawlSCMP } from './scmp.js';
import { crawlYouthPost } from './youthPost.js';
import { crawlDSEPapers } from './dsePapers.js';
import { crawlPodcasts } from './podcast.js';

const DEFAULTS = {
  scmp: { topics: ['education', 'hong-kong', 'china', 'tech', 'climate', 'culture', 'economy'], limit: 15 },
  youthPost: { sections: null, limit: 15 },
  dse: {},
  podcasts: { limit: 10 },
};

export async function runAllCrawlers() {
  const results = { scmp: [], youthPost: [], dse: [], podcasts: [], errors: [] };

  const crawlers = [
    { name: 'scmp', fn: () => crawlSCMP(DEFAULTS.scmp.topics, DEFAULTS.scmp.limit) },
    { name: 'youthPost', fn: () => crawlYouthPost(undefined, DEFAULTS.youthPost.limit) },
    { name: 'dse', fn: () => crawlDSEPapers() },
    { name: 'podcasts', fn: () => crawlPodcasts(DEFAULTS.podcasts.limit) },
  ];

  for (const { name, fn } of crawlers) {
    try {
      results[name] = await fn();
    } catch (e) {
      results.errors.push({ source: name, error: e.message });
      console.error(`Crawler ${name} failed:`, e.message);
    }
  }

  return results;
}

export async function runCrawler(source, params = {}) {
  switch (source) {
    case 'scmp':
      return crawlSCMP(params.topics || DEFAULTS.scmp.topics, params.limit || DEFAULTS.scmp.limit);
    case 'youth-post':
      return crawlYouthPost(params.sections || undefined, params.limit || DEFAULTS.youthPost.limit);
    case 'dse':
      return crawlDSEPapers();
    case 'podcasts':
      return crawlPodcasts(params.limit || DEFAULTS.podcasts.limit);
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}
