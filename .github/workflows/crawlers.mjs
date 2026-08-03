import { load } from 'cheerio';
import Parser from 'rss-parser';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const parser = new Parser();

function supabase(table, body) {
  return fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(body),
  });
}

// ── SCMP Top Stories ──
async function crawlSCMP() {
  console.log('[SCMP] Fetching...');
  try {
    const res = await fetch('https://www.scmp.com/rss/91/feed');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const feed = await parser.parseString(xml);
    const items = feed.items.slice(0, 5).map(item => ({
      id: `scmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: item.title?.trim() || '',
      source: 'scmp',
      url: item.link || '',
      content: item.contentSnippet?.trim() || item.content?.trim() || '',
      summary: item.contentSnippet?.trim().slice(0, 500) || '',
      published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      difficulty: 'intermediate',
      topics: ['{general}'],
    }));
    if (items.length > 0) {
      const sup = await supabase('articles', items);
      console.log(`[SCMP] Inserted ${items.length} items (status ${sup.status})${!sup.ok ? ' ' + (await sup.text()).slice(0, 300) : ''}`);
    } else {
      console.log('[SCMP] No items found');
    }
  } catch (e) {
    console.error(`[SCMP] Failed: ${e.message}`);
  }
}

// ── Podcasts ──
async function fetchFeed(url, retries = 1) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await parser.parseURL(url);
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw lastErr;
}

async function crawlPodcasts() {
  const channels = [
    { id: 'bbc-6min', title: 'BBC 6 Minute English', feed: 'https://podcasts.files.bbci.co.uk/p02pc9tn.rss' },
    { id: 'ted-daily', title: 'TED Talks Daily', feed: 'https://feeds.feedburner.com/tedtalksaudio' },
  ];
  for (const ch of channels) {
    console.log(`[Podcast] ${ch.title}...`);
    try {
      const feed = await fetchFeed(ch.feed);
      const episodes = feed.items.slice(0, 10).map(item => ({
        id: `${ch.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        channel_id: ch.id,
        title: item.title?.trim() || '',
        description: item.contentSnippet?.trim().slice(0, 1000) || '',
        audio_url: item.enclosure?.url || item.link || '',
        duration_seconds: item.itunes?.duration ? parseInt(item.itunes.duration) || null : null,
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        difficulty: 'intermediate',
        topics: ['{language}'],
      }));
      if (episodes.length > 0) {
        await supabase('podcast_channels', [{
          id: ch.id, title: ch.title, feed_url: ch.feed,
          description: feed.description?.trim() || '',
          image_url: feed.image?.url || feed.itunes?.image || '',
        }]);
        const res = await supabase('podcasts', episodes);
        console.log(`[Podcast] Inserted ${episodes.length} episodes (status ${res.status})${!res.ok ? ' ' + (await res.text()).slice(0, 300) : ''}`);
      }
    } catch (e) {
      console.error(`[Podcast] Failed ${ch.title}: ${e.message}`);
    }
  }
}

// ── Main ──
async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
    process.exit(1);
  }
  await Promise.allSettled([crawlSCMP(), crawlPodcasts()]);
  console.log('Crawl complete');
}

main().catch(e => { console.error('Crawl failed:', e); process.exit(1); });
