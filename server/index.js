import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import express from 'express';

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason instanceof Error ? reason.stack : reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.stack);
});
import cors from 'cors';
import { getDB, closeDB } from './db/connection.js';
import { RAGEngine } from './rag/engine.js';
import contentRoutes from './routes/content.js';
import analyzeRoutes from './routes/analyze.js';
import crawlRoutes from './routes/crawl.js';
import coursesRoutes from './routes/courses.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

const db = await getDB();

let ragEngine = null;
try {
  ragEngine = new RAGEngine(db);
} catch (e) {
  console.warn('RAG engine init failed:', e.message);
}

async function seedBundledContent() {
  if (!ragEngine) return;
  try {
    const existingResult = await db.execute({ sql: "SELECT COUNT(*) as c FROM articles WHERE source = 'bundled'" });
    const existing = existingResult.rows[0].c;
    if (existing > 0) {
      console.log(`Bundled articles already exist (${existing}), skipping seed`);
      return;
    }

    const bundled = [
      ['bundled-reading-001', 'bundled', 'The Benefits of Urban Green Spaces', 'easy',
        JSON.stringify(['environment', 'urban planning', 'health']), 215,
        `Urban green spaces, such as parks, community gardens, and green roofs, have become increasingly important in modern city planning. These areas provide numerous benefits for both mental and physical health, the environment, and the community as a whole.

One of the most significant advantages of urban green spaces is their positive impact on mental health. Studies have shown that spending time in nature, even in small amounts, can reduce stress, anxiety, and depression. The calming effect of greenery and fresh air helps people relax and recharge, which is especially important for city dwellers who often face high levels of stress.

In addition to mental health benefits, green spaces encourage physical activity. Parks provide safe areas for walking, running, cycling, and sports, making it easier for residents to stay active. Regular physical activity is essential for preventing chronic diseases such as obesity, heart disease, and diabetes.

From an environmental perspective, urban green spaces help reduce air pollution by absorbing carbon dioxide and releasing oxygen. They also lower temperatures in cities through shade and evapotranspiration, combating the urban heat island effect. Green roofs and walls can also improve building insulation, reducing energy consumption.

Furthermore, green spaces serve as important social hubs where people from diverse backgrounds can interact. They host community events, farmers markets, and outdoor concerts, strengthening social bonds and fostering a sense of belonging.

Despite these benefits, urban green spaces are not always equally distributed. Low-income neighbourhoods often have fewer parks and green areas compared to wealthy districts. City planners must address this inequality to ensure all residents can enjoy the benefits of nature.`],

      ['bundled-reading-002', 'bundled', 'The Rise of Remote Work', 'medium',
        JSON.stringify(['work', 'technology', 'society']), 248,
        `The COVID-19 pandemic dramatically accelerated the shift towards remote work, transforming how millions of people around the world approach their jobs. What was once considered a perk offered by a few forward-thinking companies has now become a standard practice across numerous industries.

Remote work offers several advantages for employees. Perhaps the most significant is the elimination of daily commutes, which saves both time and money. Workers can use these extra hours for sleep, exercise, or spending time with family. Additionally, remote work provides greater flexibility, allowing employees to create work schedules that suit their personal productivity patterns.

For employers, the benefits are also substantial. Companies can reduce overhead costs associated with maintaining office spaces. They can also access a wider talent pool by hiring workers from different cities or even countries, rather than being limited by geographic proximity.

However, remote work is not without its challenges. Many workers report feelings of isolation and difficulty separating work life from personal life when their home also serves as their office. The blurring of boundaries can lead to longer working hours and increased stress.

Communication and collaboration can also suffer in a remote environment. While video conferencing tools help bridge the gap, they cannot fully replicate the spontaneous interactions and creative energy that occur in physical office spaces. Some employees may feel left out of important discussions or career advancement opportunities.

Despite these challenges, most experts agree that remote work is here to stay. The future of work is likely to be hybrid, with employees splitting their time between home and office. This model aims to combine the flexibility of remote work with the social and collaborative benefits of in-person work.`],

      ['bundled-reading-003', 'bundled', 'Should Schools Ban Smartphones?', 'medium',
        JSON.stringify(['education', 'technology', 'society']), 234,
        `The debate over smartphone use in schools has intensified in recent years, with some countries implementing outright bans while others take a more permissive approach. Proponents of bans argue that smartphones are a major distraction that negatively impacts academic performance and social development.

Research supports many of these concerns. Studies have shown that even the presence of a smartphone on a desk can reduce cognitive capacity, as part of the brain's attention is devoted to ignoring the device. Students who frequently use smartphones during class tend to take lower-quality notes and perform worse on exams.

Furthermore, smartphones can contribute to cyberbullying, social media addiction, and sleep deprivation among teenagers. The constant notifications and temptation to check social media platforms can be particularly detrimental during school hours when students should be focusing on their studies.

On the other hand, opponents of blanket bans argue that smartphones can be valuable educational tools when used appropriately. Teachers can incorporate apps, online research, and interactive learning platforms into their lessons. Smartphones also provide access to educational resources that may not be available through school computers.

Additionally, some educators believe that teaching responsible smartphone use is more effective than banning devices altogether. By integrating smartphones into lessons and establishing clear guidelines, schools can help students develop digital literacy skills that are essential for the modern workplace.

The most effective approach may lie somewhere in between. Many schools have adopted policies that restrict smartphone use during instructional time but allow them during breaks and lunch periods. This balanced approach acknowledges both the potential benefits and drawbacks of smartphones in educational settings.`],

      ['bundled-reading-004', 'bundled', 'Artificial Intelligence in Healthcare', 'hard',
        JSON.stringify(['technology', 'health', 'AI']), 345,
        `Artificial intelligence is revolutionizing healthcare, offering unprecedented opportunities for improving diagnosis, treatment, and patient care. From machine learning algorithms that can detect diseases earlier than human doctors to robotic surgical systems that perform procedures with superhuman precision, AI is transforming nearly every aspect of medicine.

One of the most promising applications of AI in healthcare is medical imaging analysis. Deep learning models can now examine X-rays, MRIs, and CT scans with accuracy that matches or exceeds that of experienced radiologists. These systems can identify subtle patterns and anomalies that might escape the human eye, potentially catching diseases like cancer at earlier, more treatable stages.

AI is also making significant strides in drug discovery. Traditional drug development is notoriously slow and expensive, often taking over a decade and costing billions of dollars to bring a single new drug to market. AI-powered platforms can analyze vast databases of molecular structures and predict which compounds are most likely to be effective, dramatically accelerating the early stages of drug development.

In clinical settings, AI-powered diagnostic tools are helping doctors make more accurate decisions. For example, algorithms can analyze patient data, including medical history, genetic information, and lifestyle factors, to recommend personalized treatment plans. This approach, known as precision medicine, moves away from the one-size-fits-all model towards treatments tailored to individual patients.

However, the integration of AI into healthcare also raises important ethical and practical concerns. Data privacy is a major issue, as AI systems require access to large amounts of sensitive patient information. There are also questions about accountability when AI systems make errors, and concerns that over-reliance on technology could erode clinical skills.

Furthermore, the "black box" problem of some AI algorithms can make it difficult for doctors to understand why a particular diagnosis or recommendation was made. This lack of transparency can undermine trust and complicate medical decision-making.

Despite these challenges, the potential benefits of AI in healthcare are too significant to ignore. With careful regulation and ethical guidelines, AI has the potential to make healthcare more accessible, accurate, and personalized than ever before.`],

      ['bundled-reading-005', 'bundled', 'Why Students Should Travel', 'easy',
        JSON.stringify(['education', 'travel', 'personal development']), 216,
        `Travel is often seen as a leisure activity, but it can be one of the most educational experiences for students. Stepping outside one's comfort zone and exploring new places offers lessons that cannot be taught in a classroom.

First and foremost, travel broadens perspectives. When students visit different countries or even different regions of their own country, they encounter new cultures, traditions, and ways of thinking. This exposure helps develop open-mindedness and cultural sensitivity, qualities that are increasingly important in our globalised world.

Travel also builds independence and problem-solving skills. Navigating unfamiliar transportation systems, communicating in foreign languages, and managing budgets all require resourcefulness and adaptability. These real-world challenges help students develop confidence and resilience.

Additionally, travel can enhance academic learning. Visiting historical sites brings textbook lessons to life. Exploring natural wonders deepens understanding of geography and environmental science. Even simple activities like trying local food or reading street signs in another language provide hands-on learning opportunities.

There are social benefits as well. Travel often involves meeting new people, whether fellow travellers or locals. These interactions improve communication skills and can lead to lasting friendships and professional connections.

Of course, travel requires financial resources and careful planning. Students should take advantage of educational travel programmes, exchange opportunities, and budget-friendly options such as hostels and student discounts.

In conclusion, travel is a valuable investment in a student's education and personal growth. The memories and skills gained from travelling will last a lifetime.`],
    ];

    for (const [id, source, title, difficulty, topics, wc, content] of bundled) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO articles (id, source, title, content, date, word_count, difficulty, topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [id, source, title, content, '2024-01-01', wc, difficulty, topics],
      });
      const chunks = content.split(/\n\s*\n/).filter(p => p.trim());
      for (let ci = 0; ci < chunks.length; ci++) {
        await db.execute({
          sql: 'INSERT OR REPLACE INTO embeddings (id, source_type, source_id, chunk_index, chunk_text, embedding) VALUES (?, ?, ?, ?, ?, NULL)',
          args: [`${id}-${ci}`, 'article', id, ci, chunks[ci]],
        });
      }
    }

    console.log('Bundled content seeded successfully');
  } catch (e) {
    console.warn('Seed bundled content failed:', e.message);
  }
}

async function initRAG() {
  if (!ragEngine) return;
  await seedBundledContent();
  await ragEngine.loadFromDB();
  const embedCount = await db.execute('SELECT COUNT(*) as c FROM embeddings');
  console.log(`RAG ready: ${ragEngine.vectorStore.size} chunks indexed from ${embedCount.rows[0].c} embeddings`);
}

await initRAG();

async function autoCrawl() {
  if (!ragEngine) return;

  const scmpResult = await db.execute({ sql: "SELECT COUNT(*) as c FROM crawl_log WHERE status = 'complete' AND source = 'scmp'" });
  const scmpDone = scmpResult.rows[0].c > 0;
  const podResult = await db.execute({ sql: "SELECT COUNT(*) as c FROM crawl_log WHERE status = 'complete' AND source = 'podcasts'" });
  const podDone = podResult.rows[0].c > 0;
  const ocrResult = await db.execute({ sql: "SELECT COUNT(*) as c FROM crawl_log WHERE status = 'complete' AND source = 'dse-ocr'" });
  const ocrDone = ocrResult.rows[0].c > 0;

  const results = { scmp: 0, podcasts: 0 };

  if (!scmpDone) {
    console.log('Auto-crawl: fetching SCMP articles via RSS...');

    const scmpLogResult = await db.execute({
      sql: 'INSERT INTO crawl_log (source, status, started_at) VALUES (?, ?, ?)',
      args: ['scmp', 'running', new Date().toISOString()],
    });
    const scmpId = scmpLogResult.lastInsertRowid;
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
            await db.execute({
              sql: 'INSERT OR REPLACE INTO articles (id, source, title, content, url, date, word_count, difficulty, topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              args: [id, 'scmp', item.title || 'Untitled', content, item.link || '', item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(), wc, diff, JSON.stringify([feed.name])],
            });
            await ragEngine.indexDocument('scmp', id, content);
            results.scmp++;
          }
        } catch (e) {
          console.warn(`  SCMP RSS ${feed.name}: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 1000));
      }
      await db.execute({
        sql: 'UPDATE crawl_log SET status = ?, items_found = ?, error = ?, completed_at = ? WHERE id = ?',
        args: ['complete', results.scmp, null, new Date().toISOString(), scmpId],
      });
    } catch (e) {
      await db.execute({
        sql: 'UPDATE crawl_log SET status = ?, items_found = ?, error = ?, completed_at = ? WHERE id = ?',
        args: ['error', 0, e.message, new Date().toISOString(), scmpId],
      });
      console.warn('Auto-crawl SCMP failed:', e.message);
    }
  }

  if (!podDone) {
    console.log('Auto-crawl: fetching podcasts...');
    const podLogResult = await db.execute({
      sql: 'INSERT INTO crawl_log (source, status, started_at) VALUES (?, ?, ?)',
      args: ['podcasts', 'running', new Date().toISOString()],
    });
    const podId = podLogResult.lastInsertRowid;
    try {
      const { default: Parser } = await import('rss-parser');
      const parser = new Parser();
      const feedsResult = await db.execute('SELECT * FROM podcast_channels WHERE enabled = 1');
      const feeds = feedsResult.rows;
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
            await db.execute({
              sql: 'INSERT OR REPLACE INTO podcasts (id, title, audio_url, duration, transcript, source, difficulty, topics, published_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              args: [id, ep.title || 'Untitled', audioUrl, ep.itunes?.duration || 0, transcript, feed.id, diff, JSON.stringify([feed.title]), ep.pubDate ? new Date(ep.pubDate).toISOString() : new Date().toISOString()],
            });
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
      await db.execute({
        sql: 'UPDATE crawl_log SET status = ?, items_found = ?, error = ?, completed_at = ? WHERE id = ?',
        args: ['complete', results.podcasts, null, new Date().toISOString(), podId],
      });
    } catch (e) {
      await db.execute({
        sql: 'UPDATE crawl_log SET status = ?, items_found = ?, error = ?, completed_at = ? WHERE id = ?',
        args: ['error', 0, e.message, new Date().toISOString(), podId],
      });
      console.warn('Auto-crawl podcasts failed:', e.message);
    }
    console.log(`Auto-crawl SCMP+podcasts done: ${results.scmp} SCMP + ${results.podcasts} podcasts`);
  }

  if (!ocrDone) {
    async function runDSEOCR() {
      try {
        const { crawlDSEPapersOCR } = await import('./crawlers/dseOcr.js');
        const existingResult = await db.execute({ sql: "SELECT id FROM articles WHERE source = 'dse-pastpaper'" });
        const existing = existingResult.rows.map(r => r.id);
        if (existing.length > 0) {
          console.log(`DSE OCR: ${existing.length} already processed, checking for new ones...`);
        }
        const dseLogResult = await db.execute({
          sql: 'INSERT INTO crawl_log (source, status, started_at) VALUES (?, ?, ?)',
          args: ['dse-ocr', 'running', new Date().toISOString()],
        });
        const dseId = dseLogResult.lastInsertRowid;
        const papers = await crawlDSEPapersOCR(existing, (msg) => console.log(`[OCR] ${msg}`));
        let indexed = 0;
        for (const p of papers) {
          await db.execute({
            sql: 'INSERT OR REPLACE INTO articles (id, source, title, content, url, date, word_count, difficulty, topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [p.id, p.source, p.title, p.content, p.url, p.year ? `${p.year}-01-01` : new Date().toISOString(), p.word_count, p.difficulty, p.topics],
          });
          await ragEngine.indexDocument('dse-pastpaper', p.id, p.content);
          indexed++;
        }
        await db.execute({
          sql: 'UPDATE crawl_log SET status = ?, items_found = ?, error = ?, completed_at = ? WHERE id = ?',
          args: ['complete', indexed, null, new Date().toISOString(), dseId],
        });
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

if (!process.env.DISABLE_AUTO_CRAWL) {
  autoCrawl();
} else {
  console.log('Auto-crawl disabled (DISABLE_AUTO_CRAWL is set)');
}

app.use((req, res, next) => {
  req.db = db;
  req.rag = ragEngine;
  next();
});

app.use('/api', contentRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/crawl', crawlRoutes);
app.use('/api/courses', coursesRoutes);

app.get('/api/health', async (req, res) => {
  const scmpResult = await db.execute({ sql: "SELECT COUNT(*) as c FROM crawl_log WHERE source = 'scmp' AND status = 'complete'" });
  const podResult = await db.execute({ sql: "SELECT COUNT(*) as c FROM crawl_log WHERE source = 'podcasts' AND status = 'complete'" });
  const dseOcrResult = await db.execute({ sql: "SELECT COUNT(*) as c FROM crawl_log WHERE source = 'dse-ocr' AND status = 'complete'" });
  const dsePapersResult = await db.execute({ sql: "SELECT COUNT(*) as c FROM articles WHERE source = 'dse-pastpaper'" });
  const totalArticlesResult = await db.execute({ sql: 'SELECT COUNT(*) as c FROM articles' });
  res.json({
    status: 'ok',
    db: !!db,
    embeddings: ragEngine?.vectorStore?.size || 0,
    articles: totalArticlesResult.rows[0].c,
    dsePastPapers: dsePapersResult.rows[0].c,
    crawled: { scmp: scmpResult.rows[0].c > 0, podcasts: podResult.rows[0].c > 0, dseOcr: dseOcrResult.rows[0].c > 0 },
    uptime: process.uptime(),
  });
});

app.get('/api/rag/content', async (req, res) => {
  try {
    const articlesResult = await db.execute("SELECT id, source, title, word_count, difficulty, date, topics FROM articles ORDER BY date DESC LIMIT 50");
    const dseArticlesResult = await db.execute("SELECT id, source, title, word_count, difficulty, date, topics FROM articles WHERE source = 'dse-pastpaper' ORDER BY date DESC");
    const podcastsResult = await db.execute("SELECT id, title, duration, difficulty FROM podcasts ORDER BY published_date DESC LIMIT 50");
    const parseTopics = (a) => {
      try { return a.topics ? JSON.parse(a.topics) : []; }
      catch { return []; }
    };
    res.json({
      articles: articlesResult.rows.map(a => ({ ...a, topics: parseTopics(a) })),
      dsePastPapers: dseArticlesResult.rows.map(a => ({ ...a, topics: parseTopics(a) })),
      podcasts: podcastsResult.rows,
      totalArticles: articlesResult.rows.length,
      totalDSE: dseArticlesResult.rows.length,
      totalPodcasts: podcastsResult.rows.length,
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

    let fullArticle = null;
    let bestSourceId = null;
    if (relevant.length > 0) {
      const sourceScores = {};
      for (const r of relevant) {
        const srcId = r.id.replace(/-(\d+)$/, '');
        sourceScores[srcId] = (sourceScores[srcId] || 0) + r.similarity;
      }
      bestSourceId = Object.entries(sourceScores).sort((a, b) => b[1] - a[1])[0][0];
      let sourceResult = await db.execute({
        sql: "SELECT id, title, content, difficulty, topics, 'article' as source_type FROM articles WHERE id = ?",
        args: [bestSourceId],
      });
      let source = sourceResult.rows[0];
      if (!source) {
        sourceResult = await db.execute({
          sql: "SELECT id, title, transcript as content, difficulty, topics, 'podcast' as source_type FROM podcasts WHERE id = ?",
          args: [bestSourceId],
        });
        source = sourceResult.rows[0];
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

    if (topic !== undefined && typeof topic !== 'string') {
      return res.status(400).json({ error: 'topic must be a string' });
    }
    if (count !== undefined && (!Number.isInteger(count) || count < 1)) {
      return res.status(400).json({ error: 'count must be a positive integer' });
    }

    topic = topic || 'feature';
    const results = await ragEngine.search(topic, count * 2);

    const seenSources = new Set();
    const fragments = [];

    for (const r of results) {
      if (fragments.length >= count) break;

      const sourceId = r.id.replace(/-\d+$/, '');
      if (seenSources.has(sourceId)) continue;
      seenSources.add(sourceId);

      const articleResult = await db.execute({
        sql: 'SELECT id, title, content, source, date, word_count FROM articles WHERE id = ?',
        args: [sourceId],
      });
      const article = articleResult.rows[0];
      if (!article || !article.content || article.content.length < 200) continue;

      const cleanText = article.content.replace(/<[^>]+>/g, '').trim();
      const paragraphs = cleanText.split(/\n\n+/).filter(p => p.trim().length > 50);
      if (paragraphs.length === 0) continue;

      const queryTerms = topic.toLowerCase().split(/\s+/);
      const scored = paragraphs.map(p => ({
        text: p.trim(),
        score: queryTerms.reduce((s, t) => s + (p.toLowerCase().includes(t) ? 1 : 0), 0),
      }));
      scored.sort((a, b) => b.score - a.score);

      let fragmentText = scored.slice(0, 2).map(s => s.text).join('\n\n');
      const words = fragmentText.split(/\s+/);
      if (words.length > fragmentMaxWords) {
        fragmentText = words.slice(0, fragmentMaxWords).join(' ');
      }

      const sourceName = article.source === 'scmp' ? 'South China Morning Post'
        : article.source === 'youth-post' ? 'Young Post'
        : article.source;

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

app.get('/api/rag/article/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM articles WHERE id = ?', args: [req.params.id] });
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Article not found' });
    if (row.topics) try { row.topics = JSON.parse(row.topics); } catch {}
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/chat/completions', async (req, res) => {
  try {
    let { model, messages, max_tokens, temperature } = req.body;
    model = model || process.env.AI_MODEL || 'meta/llama-3.1-8b-instruct';

    const nvidiaKey = process.env.NVIDIA_API_KEY;
    const agnesKey = process.env.AGNES_API_KEY;

    let lastError = null;

    if (nvidiaKey) {
      try {
        return await proxyRequest('https://integrate.api.nvidia.com/v1/chat/completions', nvidiaKey, model, messages, max_tokens, temperature, res);
      } catch (err) {
        lastError = err;
        console.warn('NVIDIA AI proxy failed:', err.message);
      }
    }

    if (agnesKey) {
      try {
        return await proxyRequest('https://apihub.agnes-ai.com/v1/chat/completions', agnesKey, model, messages, max_tokens, temperature, res);
      } catch (err) {
        lastError = err;
        console.warn('Agnes AI proxy failed:', err.message);
      }
    }

    try {
      const response = await fetch('http://127.0.0.1:4010/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'opencode/deepseek-v4-flash-free', messages, max_tokens: max_tokens || 32768, temperature: temperature ?? 0.3 }),
        signal: AbortSignal.timeout(300000),
      });
      const text = await response.text();
      const ct = response.headers.get('content-type');
      if (ct) res.setHeader('content-type', ct);
      return res.status(response.status).send(text);
    } catch (err) {
      lastError = err;
      console.warn('OpenCode serve fallback failed:', err.message);
    }

    if (!nvidiaKey && !agnesKey) {
      return res.status(500).json({ error: 'No AI provider configured. Set NVIDIA_API_KEY or AGNES_API_KEY in server/.env or configure an AI provider in Settings, or run opencode serve --port 4010.' });
    }
    throw lastError || new Error('All AI endpoints failed');
  } catch (e) {
    console.error('AI proxy error:', e.message);
    res.status(502).json({ error: `AI proxy failed: ${e.message}` });
  }

  async function proxyRequest(url, key, model, messages, max_tokens, temperature, res) {
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` };
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages, max_tokens: max_tokens || 32768, temperature: temperature ?? 0.3 }),
      signal: AbortSignal.timeout(300000),
    });
    const text = await response.text();
    const ct = response.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    return res.status(response.status).send(text);
  }
});

app.post('/api/ai/external-proxy', async (req, res) => {
  try {
    const { endpoint, apiKey, model, messages, maxTokens, temperature } = req.body;
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
        temperature: temperature ?? 0.3,
      }),
      signal: AbortSignal.timeout(300000),
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '..', 'dist');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`Crescendo backend running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});

process.on('SIGINT', async () => { await closeDB(); server.close(); process.exit(0); });
process.on('SIGTERM', async () => { await closeDB(); server.close(); process.exit(0); });
