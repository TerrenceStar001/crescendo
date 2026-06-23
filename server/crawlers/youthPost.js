import * as cheerio from 'cheerio';
import Parser from 'rss-parser';

const BASE = 'https://www.scmp.com/yp';

const SECTIONS = [
  { path: '/learn/english', topics: ['english', 'learning'] },
  { path: '/news', topics: ['news', 'current-affairs'] },
  { path: '/lifestyle', topics: ['lifestyle', 'culture'] },
  { path: '/entertainment', topics: ['entertainment', 'culture'] },
  { path: '/opinion', topics: ['opinion', 'debate'] },
];

const RSS_FEEDS = [
  { url: 'https://www.scmp.com/rss/yp/feed', topics: ['english', 'learning', 'youth-post'] },
];

const UA = 'Mozilla/5.0 (compatible; Crescendo/1.0)';

function estimateDifficulty(text) {
  const words = text.split(/\s+/).length;
  const avgWordLen = text.replace(/[^a-z ]/gi, '').split(/\s+/).reduce((s, w) => s + w.length, 0) / Math.max(1, words);
  if (avgWordLen > 5 || words > 800) return 'medium';
  return 'easy';
}

async function fetchFullArticle(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const article = $('article, .story-body, .article-content, .yp-article').first();
    const paragraphs = article.find('p').map((i, el) => $(el).text()).get();
    return paragraphs.length ? paragraphs.join('\n\n') : null;
  } catch {
    return null;
  }
}

async function crawlSection(path, topics, limit) {
  const results = [];
  const url = `${BASE}${path}`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return results;
    const html = await res.text();
    const $ = cheerio.load(html);

    let collected = 0;
    for (const el of $('article, .card, .story-item, [class*="story"]').toArray()) {
      if (collected >= limit) break;
      const title = $(el).find('h3, h2, .card-title, a').first().text().trim();
      const link = $(el).find('a').first().attr('href');
      const snippet = $(el).find('p, .card-excerpt, .summary').first().text().trim();
      if (!title || title.length < 5) continue;

      const articleUrl = link?.startsWith('http') ? link : `${link?.startsWith('/') ? BASE : BASE}${link || ''}`;

      const fullContent = await fetchFullArticle(articleUrl);
      const content = fullContent || snippet || title;

      results.push({
        id: `yp-${Date.now()}-${results.length}`,
        source: 'youth-post',
        title,
        content,
        url: articleUrl,
        date: new Date().toISOString(),
        word_count: content.split(/\s+/).length,
        difficulty: estimateDifficulty(content),
        topics: JSON.stringify(topics),
      });
      collected++;
    }
  } catch (e) {
    console.error(`Youth Post crawl error (${path}):`, e.message);
  }

  return results;
}

async function crawlRSSFeed(feed, limit) {
  const results = [];
  try {
    const parser = new Parser();
    const parsed = await parser.parseURL(feed.url);
    const items = (parsed.items || []).slice(0, limit);

    for (const item of items) {
      const content = item.contentSnippet || item.content || item.title || '';
      results.push({
        id: `yp-rss-${Date.now()}-${results.length}`,
        source: 'youth-post',
        title: item.title || 'Untitled',
        content,
        url: item.link || feed.url,
        date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        word_count: content.split(/\s+/).length,
        difficulty: estimateDifficulty(content),
        topics: JSON.stringify(feed.topics),
      });
    }
  } catch (e) {
    console.error(`Youth Post RSS error:`, e.message);
  }
  return results;
}

export async function crawlYouthPost(sections = SECTIONS, limit = 12) {
  const allResults = [];

  // First try HTML scraping
  for (const section of sections) {
    try {
      const perSection = Math.max(1, Math.ceil(limit / sections.length));
      const items = await crawlSection(section.path, section.topics, perSection);
      allResults.push(...items);
    } catch (e) {
      console.error(`Youth Post crawl error (${section.path}):`, e.message);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // Fall back to RSS if HTML scraping returned nothing
  if (allResults.length === 0) {
    console.log('Youth Post HTML scraping returned 0 — trying RSS feed');
    for (const feed of RSS_FEEDS) {
      const items = await crawlRSSFeed(feed, limit);
      allResults.push(...items);
    }
  }

  return allResults;
}
