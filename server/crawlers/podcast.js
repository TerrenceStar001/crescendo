import Parser from 'rss-parser';
import { getDB } from '../db/connection.js';

const parser = new Parser();

function estimateDifficulty(title = '', description = '', defaultDiff = 'medium') {
  const text = `${title} ${description}`.toLowerCase();
  const hard = text.match(/\b(philosophy|economics|quantum|complex|sophisticated|profound|advanced|academic)\b/);
  const easy = text.match(/\b(beginner|simple|basic|easy|introduction|tips|starter)\b/);
  if (hard) return 'hard';
  if (easy) return 'easy';
  return defaultDiff;
}

function parseDuration(dur) {
  if (!dur) return 0;
  if (typeof dur === 'number') return dur;
  const parts = dur.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parseInt(dur, 10) || 0;
}

export async function crawlPodcasts(limit = 10, db) {
  const results = [];

  // Get feeds from database, or use defaults if no DB
  let feeds = [];
  if (!db) db = getDB();

  try {
    feeds = db.prepare('SELECT * FROM podcast_channels WHERE enabled = 1').all();
  } catch {
    // Fallback hardcoded feeds
    feeds = [
      { id: 'bbc-6min', title: 'BBC 6 Minute English', feed_url: 'https://podcasts.files.bbci.co.uk/p02pc9qc.rss', language: 'en-GB', default_difficulty: 'medium' },
      { id: 'ted-daily', title: 'TED Talks Daily', feed_url: 'https://feeds.feedburner.com/tedtalks_audio', language: 'en-US', default_difficulty: 'hard' },
    ];
  }

  for (const feed of feeds) {
    try {
      const parsed = await parser.parseURL(feed.feed_url);
      const episodes = (parsed.items || []).slice(0, limit);

      for (const ep of episodes) {
        const audioUrl = ep.enclosure?.url || '';
        if (!audioUrl) continue;

        results.push({
          id: `${feed.id}-${(ep.guid || ep.link || Date.now()).replace(/[^a-zA-Z0-9-]/g, '_')}`,
          channel_id: feed.id,
          title: ep.title || 'Untitled Episode',
          audio_url: audioUrl,
          duration: parseDuration(ep.itunes?.duration),
          transcript: ep.contentSnippet || ep.content || '',
          source: feed.id,
          difficulty: estimateDifficulty(ep.title, ep.contentSnippet, feed.default_difficulty),
          topics: JSON.stringify(ep.categories || [feed.title]),
          published_date: ep.pubDate ? new Date(ep.pubDate).toISOString() : new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error(`Podcast crawl error (${feed.id}):`, e.message);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  return results;
}
