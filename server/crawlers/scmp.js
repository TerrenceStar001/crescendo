import * as cheerio from 'cheerio';
import Parser from 'rss-parser';

const BASE = 'https://www.scmp.com';

const TOPICS = [
  'education', 'hong-kong', 'china', 'city', 'tech', 'climate',
  'economy', 'culture', 'health', 'sport',
];

const RSS_FEEDS = [
  { name: 'education', url: 'https://www.scmp.com/rss/91/feed' },
  { name: 'hong-kong', url: 'https://www.scmp.com/rss/4/feed' },
  { name: 'china', url: 'https://www.scmp.com/rss/5/feed' },
  { name: 'tech', url: 'https://www.scmp.com/rss/11/feed' },
  { name: 'city', url: 'https://www.scmp.com/rss/4/feed' },
  { name: 'climate', url: 'https://www.scmp.com/rss/91/feed' },
];

const UA = 'Mozilla/5.0 (compatible; Crescendo/1.0)';

function estimateDifficulty(text) {
  const words = text.split(/\s+/).length;
  const avgWordLen = text.replace(/[^a-z ]/gi, '').split(/\s+/).reduce((s, w) => s + w.length, 0) / Math.max(1, words);
  if (avgWordLen > 5.5 || words > 1200) return 'hard';
  if (avgWordLen > 4.5 || words > 600) return 'medium';
  return 'easy';
}

async function fetchFullArticle(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const article = $('article, .article-content, .story-body').first();
    const paragraphs = article.find('p').map((i, el) => $(el).text()).get();
    return paragraphs.length ? paragraphs.join('\n\n') : null;
  } catch {
    return null;
  }
}

async function crawlTopicPage(topic, limit) {
  const results = [];
  let page = 1;
  let collected = 0;

  while (collected < limit) {
    const url = page === 1
      ? `${BASE}/topics/${topic}`
      : `${BASE}/topics/${topic}?page=${page}`;

    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) break;
      const html = await res.text();
      const $ = cheerio.load(html);

      let found = 0;
      let items = $('article, [class*="story"], [class*="card"], .node, [class*="post"]').toArray();
      if (!items.length) {
        items = $('h3 a, h2 a').parent().toArray();
      }
      for (const el of items) {
        if (collected >= limit) break;
        const title = $(el).find('h3, h2, .article-title, .node-title, a').first().text().trim();
        const link = $(el).find('a').first().attr('href');
        if (!title || title.length < 5) continue;

        const articleUrl = link?.startsWith('http') ? link : `${BASE}${link || ''}`;

        const fullContent = await fetchFullArticle(articleUrl);
        const content = fullContent || $(el).find('p').first().text().trim() || title;

        results.push({
          id: `scmp-${Date.now()}-${results.length}`,
          source: 'scmp',
          title,
          content,
          url: articleUrl,
          date: new Date().toISOString(),
          word_count: content.split(/\s+/).length,
          difficulty: estimateDifficulty(content),
          topics: JSON.stringify([topic]),
        });
        collected++;
        found++;
      }

      if (found === 0) break;
      page++;
    } catch {
      break;
    }
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
        id: `scmp-rss-${Date.now()}-${results.length}`,
        source: 'scmp',
        title: item.title || 'Untitled',
        content,
        url: item.link || feed.url,
        date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        word_count: content.split(/\s+/).length,
        difficulty: estimateDifficulty(content),
        topics: JSON.stringify([feed.name, 'rss']),
      });
    }
  } catch (e) {
    console.error(`SCMP RSS error (${feed.name}):`, e.message);
  }
  return results;
}

export async function crawlSCMP(topics = TOPICS, limit = 10) {
  const allResults = [];

  // First try HTML scraping
  for (const topic of topics) {
    try {
      const perTopic = Math.max(1, Math.ceil(limit / topics.length));
      const items = await crawlTopicPage(topic, perTopic);
      allResults.push(...items);
    } catch (e) {
      console.error(`SCMP HTML error (${topic}):`, e.message);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // If HTML scraping returned nothing, fall back to RSS
  if (allResults.length === 0) {
    console.log('SCMP HTML scraping returned 0 — trying RSS feeds');
    for (const feed of RSS_FEEDS) {
      const perFeed = Math.max(1, Math.ceil(limit / RSS_FEEDS.length));
      const items = await crawlRSSFeed(feed, perFeed);
      allResults.push(...items);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return allResults;
}
