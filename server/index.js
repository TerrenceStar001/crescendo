import 'dotenv/config';
import express from 'express';

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason instanceof Error ? reason.stack : reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.stack);
  // Don't exit — let the process continue
});
import cors from 'cors';
import { getDB, closeDB } from './db/connection.js';
import { createSchema } from './db/schema.js';
import { RAGEngine } from './rag/engine.js';
import contentRoutes from './routes/content.js';
import analyzeRoutes from './routes/analyze.js';
import crawlRoutes from './routes/crawl.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const db = getDB();
createSchema(db);

let ragEngine = null;
try {
  ragEngine = new RAGEngine(db);
} catch (e) {
  console.warn('RAG engine init failed:', e.message);
}

function seedBundledContent() {
  if (!ragEngine) return;
  try {
    const existing = db.prepare("SELECT COUNT(*) as c FROM articles WHERE source = 'bundled'").get().c;
    if (existing > 0) {
      console.log(`Bundled articles already exist (${existing}), skipping seed`);
      return;
    }

    const bundled = [
      'bundled-reading-001', 'bundled', 'The Benefits of Urban Green Spaces', 'easy',
      JSON.stringify(['environment', 'urban planning', 'health']), 215,
      `Urban green spaces, such as parks, community gardens, and green roofs, have become increasingly important in modern city planning. These areas provide numerous benefits for both mental and physical health, the environment, and the community as a whole.

One of the most significant advantages of urban green spaces is their positive impact on mental health. Studies have shown that spending time in nature, even in small amounts, can reduce stress, anxiety, and depression. The calming effect of greenery and fresh air helps people relax and recharge, which is especially important for city dwellers who often face high levels of stress.

In addition to mental health benefits, green spaces encourage physical activity. Parks provide safe areas for walking, running, cycling, and sports, making it easier for residents to stay active. Regular physical activity is essential for preventing chronic diseases such as obesity, heart disease, and diabetes.

From an environmental perspective, urban green spaces help reduce air pollution by absorbing carbon dioxide and releasing oxygen. They also lower temperatures in cities through shade and evapotranspiration, combating the urban heat island effect. Green roofs and walls can also improve building insulation, reducing energy consumption.

Furthermore, green spaces serve as important social hubs where people from diverse backgrounds can interact. They host community events, farmers markets, and outdoor concerts, strengthening social bonds and fostering a sense of belonging.

Despite these benefits, urban green spaces are not always equally distributed. Low-income neighbourhoods often have fewer parks and green areas compared to wealthy districts. City planners must address this inequality to ensure all residents can enjoy the benefits of nature.`,

      'bundled-reading-002', 'bundled', 'The Rise of Remote Work', 'medium',
      JSON.stringify(['work', 'technology', 'society']), 248,
      `The COVID-19 pandemic dramatically accelerated the shift towards remote work, transforming how millions of people around the world approach their jobs. What was once considered a perk offered by a few forward-thinking companies has now become a standard practice across numerous industries.

Remote work offers several advantages for employees. Perhaps the most significant is the elimination of daily commutes, which saves both time and money. Workers can use these extra hours for sleep, exercise, or spending time with family. Additionally, remote work provides greater flexibility, allowing employees to create work schedules that suit their personal productivity patterns.

For employers, the benefits are also substantial. Companies can reduce overhead costs associated with maintaining office spaces. They can also access a wider talent pool by hiring workers from different cities or even countries, rather than being limited by geographic proximity.

However, remote work is not without its challenges. Many workers report feelings of isolation and difficulty separating work life from personal life when their home also serves as their office. The blurring of boundaries can lead to longer working hours and increased stress.

Communication and collaboration can also suffer in a remote environment. While video conferencing tools help bridge the gap, they cannot fully replicate the spontaneous interactions and creative energy that occur in physical office spaces. Some employees may feel left out of important discussions or career advancement opportunities.

Despite these challenges, most experts agree that remote work is here to stay. The future of work is likely to be hybrid, with employees splitting their time between home and office. This model aims to combine the flexibility of remote work with the social and collaborative benefits of in-person work.`,

      'bundled-reading-003', 'bundled', 'Should Schools Ban Smartphones?', 'medium',
      JSON.stringify(['education', 'technology', 'society']), 234,
      `The debate over smartphone use in schools has intensified in recent years, with some countries implementing outright bans while others take a more permissive approach. Proponents of bans argue that smartphones are a major distraction that negatively impacts academic performance and social development.

Research supports many of these concerns. Studies have shown that even the presence of a smartphone on a desk can reduce cognitive capacity, as part of the brain's attention is devoted to ignoring the device. Students who frequently use smartphones during class tend to take lower-quality notes and perform worse on exams.

Furthermore, smartphones can contribute to cyberbullying, social media addiction, and sleep deprivation among teenagers. The constant notifications and temptation to check social media platforms can be particularly detrimental during school hours when students should be focusing on their studies.

On the other hand, opponents of blanket bans argue that smartphones can be valuable educational tools when used appropriately. Teachers can incorporate apps, online research, and interactive learning platforms into their lessons. Smartphones also provide access to educational resources that may not be available through school computers.

Additionally, some educators believe that teaching responsible smartphone use is more effective than banning devices altogether. By integrating smartphones into lessons and establishing clear guidelines, schools can help students develop digital literacy skills that are essential for the modern workplace.

The most effective approach may lie somewhere in between. Many schools have adopted policies that restrict smartphone use during instructional time but allow them during breaks and lunch periods. This balanced approach acknowledges both the potential benefits and drawbacks of smartphones in educational settings.`,

      'bundled-reading-004', 'bundled', 'Artificial Intelligence in Healthcare', 'hard',
      JSON.stringify(['technology', 'health', 'AI']), 345,
      `Artificial intelligence is revolutionizing healthcare, offering unprecedented opportunities for improving diagnosis, treatment, and patient care. From machine learning algorithms that can detect diseases earlier than human doctors to robotic surgical systems that perform procedures with superhuman precision, AI is transforming nearly every aspect of medicine.

One of the most promising applications of AI in healthcare is medical imaging analysis. Deep learning models can now examine X-rays, MRIs, and CT scans with accuracy that matches or exceeds that of experienced radiologists. These systems can identify subtle patterns and anomalies that might escape the human eye, potentially catching diseases like cancer at earlier, more treatable stages.

AI is also making significant strides in drug discovery. Traditional drug development is notoriously slow and expensive, often taking over a decade and costing billions of dollars to bring a single new drug to market. AI-powered platforms can analyze vast databases of molecular structures and predict which compounds are most likely to be effective, dramatically accelerating the early stages of drug development.

In clinical settings, AI-powered diagnostic tools are helping doctors make more accurate decisions. For example, algorithms can analyze patient data, including medical history, genetic information, and lifestyle factors, to recommend personalized treatment plans. This approach, known as precision medicine, moves away from the one-size-fits-all model towards treatments tailored to individual patients.

However, the integration of AI into healthcare also raises important ethical and practical concerns. Data privacy is a major issue, as AI systems require access to large amounts of sensitive patient information. There are also questions about accountability when AI systems make errors, and concerns that over-reliance on technology could erode clinical skills.

Furthermore, the "black box" problem of some AI algorithms can make it difficult for doctors to understand why a particular diagnosis or recommendation was made. This lack of transparency can undermine trust and complicate medical decision-making.

Despite these challenges, the potential benefits of AI in healthcare are too significant to ignore. With careful regulation and ethical guidelines, AI has the potential to make healthcare more accessible, accurate, and personalized than ever before.`,

      'bundled-reading-005', 'bundled', 'Why Students Should Travel', 'easy',
      JSON.stringify(['education', 'travel', 'personal development']), 216,
      `Travel is often seen as a leisure activity, but it can be one of the most educational experiences for students. Stepping outside one's comfort zone and exploring new places offers lessons that cannot be taught in a classroom.

First and foremost, travel broadens perspectives. When students visit different countries or even different regions of their own country, they encounter new cultures, traditions, and ways of thinking. This exposure helps develop open-mindedness and cultural sensitivity, qualities that are increasingly important in our globalised world.

Travel also builds independence and problem-solving skills. Navigating unfamiliar transportation systems, communicating in foreign languages, and managing budgets all require resourcefulness and adaptability. These real-world challenges help students develop confidence and resilience.

Additionally, travel can enhance academic learning. Visiting historical sites brings textbook lessons to life. Exploring natural wonders deepens understanding of geography and environmental science. Even simple activities like trying local food or reading street signs in another language provide hands-on learning opportunities.

There are social benefits as well. Travel often involves meeting new people, whether fellow travellers or locals. These interactions improve communication skills and can lead to lasting friendships and professional connections.

Of course, travel requires financial resources and careful planning. Students should take advantage of educational travel programmes, exchange opportunities, and budget-friendly options such as hostels and student discounts.

In conclusion, travel is a valuable investment in a student's education and personal growth. The memories and skills gained from travelling will last a lifetime.`,
    ];

    const insert = db.prepare('INSERT OR REPLACE INTO articles (id, source, title, content, date, word_count, difficulty, topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const indexInsert = db.prepare('INSERT OR REPLACE INTO embeddings (id, source_type, source_id, chunk_index, chunk_text, embedding) VALUES (?, ?, ?, ?, ?, NULL)');

    const tx = db.transaction(() => {
      for (let i = 0; i < bundled.length; i += 7) {
        const [id, source, title, difficulty, topics, wc, content] = bundled.slice(i, i + 7);
        insert.run(id, source, title, content, '2024-01-01', wc, difficulty, topics);
        const chunks = content.split(/\n\s*\n/).filter(p => p.trim());
        for (let ci = 0; ci < chunks.length; ci++) {
          indexInsert.run(`${id}-${ci}`, 'article', id, ci, chunks[ci]);
        }
      }
    });
    tx();

    console.log('Bundled content seeded successfully');
  } catch (e) {
    console.warn('Seed bundled content failed:', e.message);
  }
}

function initRAG() {
  if (!ragEngine) return;
  seedBundledContent();
  ragEngine.loadFromDB();
  console.log(`RAG ready: ${ragEngine.vectorStore.size} chunks indexed from ${db.prepare('SELECT COUNT(*) as c FROM embeddings').get().c} embeddings`);
}

initRAG();

async function autoCrawl() {
  if (!ragEngine) return;
  // Skip SCMP + podcasts crawl if already done
  const scmpDone = db.prepare("SELECT COUNT(*) as c FROM crawl_log WHERE status = 'complete' AND source = 'scmp'").get().c > 0;
  const podDone = db.prepare("SELECT COUNT(*) as c FROM crawl_log WHERE status = 'complete' AND source = 'podcasts'").get().c > 0;
  const ocrDone = db.prepare("SELECT COUNT(*) as c FROM crawl_log WHERE status = 'complete' AND source = 'dse-ocr'").get().c > 0;

  const logCrawl = db.prepare('INSERT INTO crawl_log (source, status, started_at) VALUES (?, ?, ?)');
  const updCrawl = db.prepare('UPDATE crawl_log SET status = ?, items_found = ?, error = ?, completed_at = ? WHERE id = ?');
  const insertArticle = db.prepare('INSERT OR REPLACE INTO articles (id, source, title, content, url, date, word_count, difficulty, topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

  const results = { scmp: 0, podcasts: 0 };

  if (!scmpDone) {
    console.log('Auto-crawl: fetching SCMP articles via RSS...');

  // --- SCMP RSS ---
  const scmpId = logCrawl.run('scmp', 'running', new Date().toISOString()).lastInsertRowid;
  try {
    const { default: Parser } = await import('rss-parser');
    const parser = new Parser();
    const feeds = [
      { name: 'education', url: 'https://www.scmp.com/rss/91/feed' },
      { name: 'hong-kong', url: 'https://www.scmp.com/rss/4/feed' },
      { name: 'china', url: 'https://www.scmp.com/rss/5/feed' },
      { name: 'tech', url: 'https://www.scmp.com/rss/11/feed' },
      { name: 'city', url: 'https://www.scmp.com/rss/4/feed' },
      { name: 'climate', url: 'https://www.scmp.com/rss/91/feed' },
    ];
    for (const feed of feeds) {
      try {
        const parsed = await parser.parseURL(feed.url);
        const items = (parsed.items || []).slice(0, 5);
        for (const item of items) {
          const content = item.contentSnippet || item.content || item.title || '';
          if (content.length < 50) continue;
          const id = `scmp-init-${Date.now()}-${results.scmp}`;
          const wc = content.split(/\s+/).length;
          const diff = wc > 800 ? 'hard' : wc > 400 ? 'medium' : 'easy';
          insertArticle.run(id, 'scmp', item.title || 'Untitled', content, item.link || '', item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(), wc, diff, JSON.stringify([feed.name]));
          await ragEngine.indexDocument('scmp', id, content);
          results.scmp++;
        }
      } catch (e) {
        console.warn(`  SCMP RSS ${feed.name}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    updCrawl.run('complete', results.scmp, null, new Date().toISOString(), scmpId);
  } catch (e) {
    updCrawl.run('error', 0, e.message, new Date().toISOString(), scmpId);
    console.warn('Auto-crawl SCMP failed:', e.message);
  }

  }

  // --- Podcasts ---
  if (!podDone) {
    console.log('Auto-crawl: fetching podcasts...');
    const podId = logCrawl.run('podcasts', 'running', new Date().toISOString()).lastInsertRowid;
    try {
      const { default: Parser } = await import('rss-parser');
      const parser = new Parser();
      const feeds = db.prepare('SELECT * FROM podcast_channels WHERE enabled = 1').all();
      const insertPodcast = db.prepare('INSERT OR REPLACE INTO podcasts (id, title, audio_url, duration, transcript, source, difficulty, topics, published_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const feed of feeds) {
        try {
          const parsed = await parser.parseURL(feed.feed_url);
          const episodes = (parsed.items || []).slice(0, 5);
          for (const ep of episodes) {
            const audioUrl = ep.enclosure?.url || '';
            if (!audioUrl) continue;
            const id = `${feed.id}-${(ep.guid || ep.link || Date.now()).replace(/[^a-zA-Z0-9-]/g, '_')}`;
            const transcript = ep.contentSnippet || ep.content || '';
            const diff = transcript.length > 1000 ? 'hard' : transcript.length > 500 ? 'medium' : 'easy';
            insertPodcast.run(id, ep.title || 'Untitled', audioUrl, ep.itunes?.duration || 0, transcript, feed.id, diff, JSON.stringify([feed.title]), ep.pubDate ? new Date(ep.pubDate).toISOString() : new Date().toISOString());
            if (transcript.length > 100) {
              await ragEngine.indexDocument(feed.id, id, `${ep.title}\n\n${transcript}`);
            }
            results.podcasts++;
          }
        } catch (e) {
          console.warn(`  Podcast RSS ${feed.id}: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 1500));
      }
      updCrawl.run('complete', results.podcasts, null, new Date().toISOString(), podId);
    } catch (e) {
      updCrawl.run('error', 0, e.message, new Date().toISOString(), podId);
      console.warn('Auto-crawl podcasts failed:', e.message);
    }
    console.log(`Auto-crawl SCMP+podcasts done: ${results.scmp} SCMP + ${results.podcasts} podcasts`);
  }

  // --- DSE Past Paper OCR (always run if not done yet) ---
  if (!ocrDone) {

  // --- DSE Past Paper OCR (in background) ---
    async function runDSEOCR() {
      try {
        const { crawlDSEPapersOCR } = await import('./crawlers/dseOcr.js');
        const existing = db.prepare("SELECT id FROM articles WHERE source = 'dse-pastpaper'").all().map(r => r.id);
        if (existing.length > 0) {
          console.log(`DSE OCR: ${existing.length} already processed, checking for new ones...`);
        }
        const dseId = logCrawl.run('dse-ocr', 'running', new Date().toISOString()).lastInsertRowid;
        const papers = await crawlDSEPapersOCR(existing, (msg) => console.log(`[OCR] ${msg}`));
        let indexed = 0;
        for (const p of papers) {
          insertArticle.run(p.id, p.source, p.title, p.content, p.url, p.year ? `${p.year}-01-01` : new Date().toISOString(), p.word_count, p.difficulty, p.topics);
          await ragEngine.indexDocument('dse-pastpaper', p.id, p.content);
          indexed++;
        }
        updCrawl.run('complete', indexed, null, new Date().toISOString(), dseId);
        console.log(`DSE OCR done: ${indexed} new papers indexed (${existing.length + indexed} total)`);
      } catch (e) {
        console.warn('DSE OCR failed:', e.message);
      }
    }
    runDSEOCR();
  } else {
    console.log('DSE OCR already completed, skipping');
  }
}

// Start background auto-crawl (don't block server)
autoCrawl();

app.use((req, res, next) => {
  req.db = db;
  req.rag = ragEngine;
  next();
});

app.use('/api', contentRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/crawl', crawlRoutes);

app.get('/api/health', (req, res) => {
  const scmpDone = db.prepare("SELECT COUNT(*) as c FROM crawl_log WHERE source = 'scmp' AND status = 'complete'").get().c > 0;
  const podDone = db.prepare("SELECT COUNT(*) as c FROM crawl_log WHERE source = 'podcasts' AND status = 'complete'").get().c > 0;
  const dseOcrDone = db.prepare("SELECT COUNT(*) as c FROM crawl_log WHERE source = 'dse-ocr' AND status = 'complete'").get().c > 0;
  const dsePapers = db.prepare("SELECT COUNT(*) as c FROM articles WHERE source = 'dse-pastpaper'").get().c;
  const totalArticles = db.prepare("SELECT COUNT(*) as c FROM articles").get().c;
  res.json({
    status: 'ok',
    db: !!db,
    embeddings: ragEngine?.vectorStore?.size || 0,
    articles: totalArticles,
    dsePastPapers: dsePapers,
    crawled: { scmp: scmpDone, podcasts: podDone, dseOcr: dseOcrDone },
    uptime: process.uptime(),
  });
});

app.get('/api/rag/content', (req, res) => {
  try {
    const articles = db.prepare("SELECT id, source, title, word_count, difficulty, date, topics FROM articles ORDER BY date DESC LIMIT 50").all();
    const dseArticles = db.prepare("SELECT id, source, title, word_count, difficulty, date, topics FROM articles WHERE source = 'dse-pastpaper' ORDER BY date DESC").all();
    const podcasts = db.prepare("SELECT id, title, duration, difficulty FROM podcasts ORDER BY published_date DESC LIMIT 50").all();
    const parseTopics = (a) => {
      try { return a.topics ? JSON.parse(a.topics) : []; }
      catch { return []; }
    };
    res.json({
      articles: articles.map(a => ({ ...a, topics: parseTopics(a) })),
      dsePastPapers: dseArticles.map(a => ({ ...a, topics: parseTopics(a) })),
      podcasts,
      totalArticles: articles.length,
      totalDSE: dseArticles.length,
      totalPodcasts: podcasts.length,
      embeddings: ragEngine?.vectorStore?.size || 0,
    });
  } catch (e) {
    console.error('[Content] Error:', e);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

app.post('/api/rag/search', async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    if (!ragEngine) return res.status(503).json({ error: 'RAG engine not available' });
    if (!query) return res.status(400).json({ error: 'Query required' });
    const results = await ragEngine.search(query, limit);
    const total = ragEngine.vectorStore.size;
    const relevant = results.filter(r => r.similarity > 0);

    // Find best-matching source: group chunks by source_id, pick source with highest aggregate score
    let fullArticle = null;
    let bestSourceId = null;
    if (relevant.length > 0) {
      const sourceScores = {};
      for (const r of relevant) {
        const srcId = r.id.replace(/-(\d+)$/, '');
        sourceScores[srcId] = (sourceScores[srcId] || 0) + r.similarity;
      }
      bestSourceId = Object.entries(sourceScores).sort((a, b) => b[1] - a[1])[0][0];
      // Try articles table, then podcasts table
      let source = db.prepare('SELECT id, title, content, difficulty, topics, \'article\' as source_type FROM articles WHERE id = ?').get(bestSourceId);
      if (!source) {
        source = db.prepare('SELECT id, title, transcript as content, difficulty, topics, \'podcast\' as source_type FROM podcasts WHERE id = ?').get(bestSourceId);
      }
      if (source) {
        fullArticle = {
          id: source.id,
          title: source.title,
          content: source.content,
          difficulty: source.difficulty,
          topics: source.topics ? JSON.parse(source.topics) : [],
          wordCount: source.content.split(/\s+/).length,
          sourceType: source.source_type,
        };
      }
    }

    console.log(`[RAG] query="${query}" → ${relevant.length}/${results.length} relevant, ${total} total chunks, best source="${bestSourceId}"`);
    res.json({ results, query, total_chunks: total, fullArticle, bestSourceId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/rag/fragments', async (req, res) => {
  try {
    let { topic, difficulty, count = 3, fragmentMaxWords = 300 } = req.body;
    if (!ragEngine) return res.status(503).json({ error: 'RAG engine not available' });

    // Input validation (T-01-01)
    if (topic !== undefined && typeof topic !== 'string') {
      return res.status(400).json({ error: 'topic must be a string' });
    }
    if (count !== undefined && (!Number.isInteger(count) || count < 1)) {
      return res.status(400).json({ error: 'count must be a positive integer' });
    }

    topic = topic || 'feature';

    // Search for relevant chunks
    const results = await ragEngine.search(topic, count * 2);

    // Process results, deduplicate by source article
    const seenSources = new Set();
    const fragments = [];

    for (const r of results) {
      if (fragments.length >= count) break;

      // Extract source article ID from chunk id (strip -\d+$ suffix)
      const sourceId = r.id.replace(/-\d+$/, '');
      if (seenSources.has(sourceId)) continue;
      seenSources.add(sourceId);

      // Fetch full article
      const article = db.prepare('SELECT id, title, content, source, date, word_count FROM articles WHERE id = ?').get(sourceId);
      if (!article || !article.content || article.content.length < 200) continue;

      // Strip HTML tags and split into paragraphs
      const cleanText = article.content.replace(/<[^>]+>/g, '').trim();
      const paragraphs = cleanText.split(/\n\n+/).filter(p => p.trim().length > 50);
      if (paragraphs.length === 0) continue;

      // Score paragraphs by query term density
      const queryTerms = topic.toLowerCase().split(/\s+/);
      const scored = paragraphs.map(p => ({
        text: p.trim(),
        score: queryTerms.reduce((s, t) => s + (p.toLowerCase().includes(t) ? 1 : 0), 0),
      }));
      scored.sort((a, b) => b.score - a.score);

      // Take top 1-2 paragraphs
      let fragmentText = scored.slice(0, 2).map(s => s.text).join('\n\n');

      // Limit fragment text to fragmentMaxWords
      const words = fragmentText.split(/\s+/);
      if (words.length > fragmentMaxWords) {
        fragmentText = words.slice(0, fragmentMaxWords).join(' ');
      }

      // Build source name mapping
      const sourceName = article.source === 'scmp' ? 'South China Morning Post'
        : article.source === 'youth-post' ? 'Young Post'
        : article.source;

      // Format date
      let sourceDate = '';
      if (article.date) {
        try {
          sourceDate = new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        } catch {}
      }

      fragments.push({ text: fragmentText, sourceName, sourceDate, sourceId: article.id });
    }

    res.json({ fragments, topic, difficulty: difficulty || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/rag/article/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Article not found' });
    if (row.topics) try { row.topics = JSON.parse(row.topics); } catch {}
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/external-proxy', async (req, res) => {
  try {
    const { endpoint, apiKey, model, messages, maxTokens } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens || 1024,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(120000),
    });

    const text = await response.text();
    const ct = response.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    res.status(response.status).send(text);
  } catch (e) {
    console.error('External AI proxy error:', e.message);
    res.status(502).json({ error: `External AI proxy failed: ${e.message}` });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`Crescendo backend running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});

process.on('SIGINT', () => { closeDB(); server.close(); process.exit(0); });
process.on('SIGTERM', () => { closeDB(); server.close(); process.exit(0); });
