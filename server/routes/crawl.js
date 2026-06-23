import { Router } from 'express';
import { getDB } from '../db/connection.js';
import { runAllCrawlers, runCrawler } from '../crawlers/index.js';

const router = Router();

router.post('/trigger', async (req, res) => {
  const { source, ...params } = req.body;
  const db = getDB();
  const rag = req.rag;

  const startTime = new Date().toISOString();
  const logStmt = db.prepare('INSERT INTO crawl_log (source, status, started_at) VALUES (?, ?, ?)');
  const updateLog = db.prepare('UPDATE crawl_log SET status = ?, items_found = ?, error = ?, completed_at = ? WHERE id = ?');

  const logId = logStmt.run(source || 'all', 'running', startTime).lastInsertRowid;

  try {
    let items;
    if (source) {
      items = await runCrawler(source, params);
    } else {
      const all = await runAllCrawlers();
      items = [...all.scmp, ...all.youthPost, ...all.dse, ...all.podcasts];
    }

    const insertArticle = db.prepare(`
      INSERT OR REPLACE INTO articles (id, source, title, content, url, date, word_count, difficulty, topics)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertPaper = db.prepare(`
      INSERT OR REPLACE INTO papers (id, type, year, paper, section, difficulty, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertPodcast = db.prepare(`
      INSERT OR REPLACE INTO podcasts (id, title, audio_url, duration, transcript, source, difficulty, topics, published_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Write to DB first
    const dbCounts = db.transaction(() => {
      let articleCount = 0, paperCount = 0, podcastCount = 0;
      for (const item of items) {
        if (item.audio_url) {
          insertPodcast.run(item.id, item.title, item.audio_url, item.duration, item.transcript, item.source, item.difficulty, item.topics, item.published_date);
          podcastCount++;
        } else if (item.source === 'dse' && !item.id.endsWith('-article')) {
          insertPaper.run(item.id, item.type, item.year, item.paper, item.section, item.difficulty, item.metadata);
          paperCount++;
        } else {
          insertArticle.run(item.id, item.source, item.title, item.content, item.url || '', item.date, item.word_count, item.difficulty, item.topics);
          articleCount++;
        }
      }
      return { articleCount, paperCount, podcastCount };
    })();

    // 2. Index into RAG after DB write
    if (rag) {
      let indexed = 0;
      for (const item of items) {
        let indexText = null;
        if (item.content && item.content.length > 100) {
          indexText = item.content;
        } else if (item.audio_url && item.transcript && item.transcript.length > 100) {
          indexText = `${item.title}\n\n${item.transcript}`;
        }
        if (indexText) {
          try {
            await rag.indexDocument(item.source || 'unknown', item.id, indexText);
            indexed++;
          } catch (e) {
            console.warn(`Indexing error for ${item.id}:`, e.message);
          }
        }
      }
      if (indexed > 0) console.log(`  Indexed ${indexed} items into RAG`);
    }

    const total = dbCounts.articleCount + dbCounts.paperCount + dbCounts.podcastCount;
    updateLog.run('complete', total, null, new Date().toISOString(), logId);

    res.json({
      success: true,
      items_found: total,
      source: source || 'all',
      breakdown: dbCounts,
    });
  } catch (e) {
    try { updateLog.run('error', 0, e.message, new Date().toISOString(), logId); } catch {}
    res.status(500).json({ error: e.message });
  }
});

router.post('/reindex', async (req, res) => {
  const rag = req.rag;
  if (!rag) return res.status(503).json({ error: 'RAG engine not available' });
  try {
    await rag.reindexAll();
    res.json({ success: true, embeddings: rag.vectorStore.size });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sync', async (req, res) => {
  // Quick sync: crawl SCMP RSS + podcasts in background, return immediately
  const rag = req.rag;
  res.json({ success: true, message: 'Sync started in background' });
  // Run SCMP
  try {
    const items = await runCrawler('scmp', { limit: 10 });
    await storeAndIndex(items, rag);
  } catch (e) { console.error('Sync SCMP:', e.message); }
  // Run podcasts
  try {
    const items = await runCrawler('podcasts', { limit: 10 });
    await storeAndIndex(items, rag);
  } catch (e) { console.error('Sync podcasts:', e.message); }
});

async function storeAndIndex(items, rag) {
  if (!items || items.length === 0) return;
  const db = getDB();
  const insertArticle = db.prepare('INSERT OR REPLACE INTO articles (id, source, title, content, url, date, word_count, difficulty, topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertPodcast = db.prepare('INSERT OR REPLACE INTO podcasts (id, title, audio_url, duration, transcript, source, difficulty, topics, published_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  let indexed = 0;
  for (const item of items) {
    if (item.audio_url) {
      insertPodcast.run(item.id, item.title, item.audio_url, item.duration, item.transcript, item.source, item.difficulty, item.topics, item.published_date);
      if (item.transcript?.length > 100) {
        await rag.indexDocument(item.source || 'podcast', item.id, `${item.title}\n\n${item.transcript}`);
        indexed++;
      }
    } else {
      insertArticle.run(item.id, item.source, item.title, item.content, item.url || '', item.date, item.word_count, item.difficulty, item.topics);
      if (item.content?.length > 100) {
        await rag.indexDocument(item.source || 'article', item.id, item.content);
        indexed++;
      }
    }
  }
  console.log(`  Sync stored ${items.length} items, indexed ${indexed} into RAG`);
}

router.post('/ocr', async (req, res) => {
  // Trigger DSE past paper OCR in background
  const rag = req.rag;
  if (!rag) return res.status(503).json({ error: 'RAG engine not available' });
  res.json({ success: true, message: 'DSE OCR started in background' });

  try {
    const db = getDB();
    const logId = db.prepare("INSERT INTO crawl_log (source, status, started_at) VALUES ('dse-ocr', 'running', ?)").run(new Date().toISOString()).lastInsertRowid;
    const { crawlDSEPapersOCR } = await import('../crawlers/dseOcr.js');
    const existing = db.prepare("SELECT id FROM articles WHERE source = 'dse-pastpaper'").all().map(r => r.id);
    const papers = await crawlDSEPapersOCR(existing, (msg) => console.log(msg));
    const insertArticle = db.prepare('INSERT OR REPLACE INTO articles (id, source, title, content, url, date, word_count, difficulty, topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    let indexed = 0;
    for (const p of papers) {
      insertArticle.run(p.id, p.source, p.title, p.content, p.url, p.year ? `${p.year}-01-01` : new Date().toISOString(), p.word_count, p.difficulty, p.topics);
      await rag.indexDocument('dse-pastpaper', p.id, p.content);
      indexed++;
    }
    db.prepare('UPDATE crawl_log SET status = ?, items_found = ?, completed_at = ? WHERE id = ?').run('complete', indexed, new Date().toISOString(), logId);
    console.log(`DSE OCR (manual): ${indexed} new papers indexed`);
  } catch (e) {
    console.error('DSE OCR (manual) failed:', e.message);
  }
});

router.get('/log', (req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM crawl_log ORDER BY id DESC LIMIT 20').all();
  res.json(rows);
});

export default router;
