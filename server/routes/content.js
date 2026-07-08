import { Router } from 'express';
import { getDB } from '../db/connection.js';

const router = Router();

function parseMetadata(row) {
  if (!row) return row;
  try { if (typeof row.metadata === 'string') row.metadata = JSON.parse(row.metadata); } catch {}
  try { if (typeof row.topics === 'string') row.topics = JSON.parse(row.topics); } catch {}
  return row;
}

// --- Papers ---
router.get('/papers', async (req, res) => {
  const { type, difficulty, limit = 20 } = req.query;
  const db = await getDB();
  let sql = 'SELECT * FROM papers WHERE 1=1';
  const params = [];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (difficulty) { sql += ' AND difficulty = ?'; params.push(difficulty); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  const result = await db.execute({ sql, args: params });
  res.json(result.rows.map(parseMetadata));
});

router.get('/papers/:id', async (req, res) => {
  const db = await getDB();
  const result = await db.execute({ sql: 'SELECT * FROM papers WHERE id = ?', args: [req.params.id] });
  const row = result.rows[0];
  if (!row) return res.status(404).json({ error: 'Paper not found' });
  res.json(parseMetadata(row));
});

// --- Articles ---
router.get('/articles', async (req, res) => {
  const { source, difficulty, topic, limit = 20 } = req.query;
  const db = await getDB();
  let sql = 'SELECT * FROM articles WHERE 1=1';
  const params = [];
  if (source) { sql += ' AND source = ?'; params.push(source); }
  if (difficulty) { sql += ' AND difficulty = ?'; params.push(difficulty); }
  if (topic) { sql += ' AND topics LIKE ?'; params.push(`%"${topic}"%`); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  const result = await db.execute({ sql, args: params });
  res.json(result.rows.map(parseMetadata));
});

router.get('/articles/:id', async (req, res) => {
  const db = await getDB();
  const result = await db.execute({ sql: 'SELECT * FROM articles WHERE id = ?', args: [req.params.id] });
  const row = result.rows[0];
  if (!row) return res.status(404).json({ error: 'Article not found' });
  res.json(parseMetadata(row));
});

// --- Podcasts ---
router.get('/podcasts', async (req, res) => {
  const { difficulty, channel_id, limit = 20 } = req.query;
  const db = await getDB();
  let sql = 'SELECT * FROM podcasts WHERE 1=1';
  const params = [];
  if (difficulty) { sql += ' AND difficulty = ?'; params.push(difficulty); }
  if (channel_id) { sql += ' AND channel_id = ?'; params.push(channel_id); }
  sql += ' ORDER BY published_date DESC LIMIT ?';
  params.push(parseInt(limit));
  const result = await db.execute({ sql, args: params });
  res.json(result.rows.map(parseMetadata));
});

// --- Podcast Channels ---
router.get('/channels', async (req, res) => {
  const db = await getDB();
  const channels = (await db.execute('SELECT * FROM podcast_channels ORDER BY title')).rows;
  for (const ch of channels) {
    const cnt = await db.execute({ sql: 'SELECT COUNT(*) as c FROM podcasts WHERE channel_id = ?', args: [ch.id] });
    ch.episode_count = cnt.rows[0].c;
  }
  res.json(channels);
});

router.post('/channels', async (req, res) => {
  const { id, title, feed_url, language, default_difficulty } = req.body;
  if (!id || !title || !feed_url) return res.status(400).json({ error: 'id, title, feed_url required' });
  const db = await getDB();
  await db.execute({
    sql: 'INSERT OR REPLACE INTO podcast_channels (id, title, feed_url, language, default_difficulty) VALUES (?, ?, ?, ?, ?)',
    args: [id, title, feed_url, language || 'en', default_difficulty || 'medium'],
  });
  res.json({ success: true });
});

router.delete('/channels/:id', async (req, res) => {
  const db = await getDB();
  await db.execute({ sql: 'DELETE FROM podcast_channels WHERE id = ?', args: [req.params.id] });
  await db.execute({ sql: 'DELETE FROM podcasts WHERE channel_id = ?', args: [req.params.id] });
  res.json({ success: true });
});

// --- Backward-compat aliases ---
router.get('/content/scmp', async (req, res) => {
  const { topic, limit = 5 } = req.query;
  const db = await getDB();
  let sql = "SELECT * FROM articles WHERE source = 'scmp'";
  const params = [];
  if (topic) { sql += ' AND topics LIKE ?'; params.push(`%"${topic}"%`); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  const result = await db.execute({ sql, args: params });
  res.json(result.rows.map(parseMetadata));
});

router.get('/content/podcasts', async (req, res) => {
  const { difficulty, limit = 5 } = req.query;
  const db = await getDB();
  let sql = 'SELECT * FROM podcasts WHERE 1=1';
  const params = [];
  if (difficulty) { sql += ' AND difficulty = ?'; params.push(difficulty); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  const result = await db.execute({ sql, args: params });
  res.json(result.rows.map(parseMetadata));
});

export default router;
