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
router.get('/papers', (req, res) => {
  const { type, difficulty, limit = 20 } = req.query;
  const db = getDB();
  let sql = 'SELECT * FROM papers WHERE 1=1';
  const params = [];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (difficulty) { sql += ' AND difficulty = ?'; params.push(difficulty); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  res.json(db.prepare(sql).all(...params).map(parseMetadata));
});

router.get('/papers/:id', (req, res) => {
  const db = getDB();
  const row = db.prepare('SELECT * FROM papers WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Paper not found' });
  res.json(parseMetadata(row));
});

// --- Articles (SCMP, Youth Post, DSE content) ---
router.get('/articles', (req, res) => {
  const { source, difficulty, topic, limit = 20 } = req.query;
  const db = getDB();
  let sql = 'SELECT * FROM articles WHERE 1=1';
  const params = [];
  if (source) { sql += ' AND source = ?'; params.push(source); }
  if (difficulty) { sql += ' AND difficulty = ?'; params.push(difficulty); }
  if (topic) { sql += ' AND topics LIKE ?'; params.push(`%"${topic}"%`); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  res.json(db.prepare(sql).all(...params).map(parseMetadata));
});

router.get('/articles/:id', (req, res) => {
  const db = getDB();
  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Article not found' });
  res.json(parseMetadata(row));
});

// --- Podcasts ---
router.get('/podcasts', (req, res) => {
  const { difficulty, channel_id, limit = 20 } = req.query;
  const db = getDB();
  let sql = 'SELECT * FROM podcasts WHERE 1=1';
  const params = [];
  if (difficulty) { sql += ' AND difficulty = ?'; params.push(difficulty); }
  if (channel_id) { sql += ' AND channel_id = ?'; params.push(channel_id); }
  sql += ' ORDER BY published_date DESC LIMIT ?';
  params.push(parseInt(limit));
  res.json(db.prepare(sql).all(...params).map(parseMetadata));
});

// --- Podcast Channels ---
router.get('/channels', (req, res) => {
  const db = getDB();
  const channels = db.prepare('SELECT * FROM podcast_channels ORDER BY title').all();
  // Attach episode counts
  for (const ch of channels) {
    ch.episode_count = db.prepare('SELECT COUNT(*) as c FROM podcasts WHERE channel_id = ?').get(ch.id).c;
  }
  res.json(channels);
});

router.post('/channels', (req, res) => {
  const { id, title, feed_url, language, default_difficulty } = req.body;
  if (!id || !title || !feed_url) return res.status(400).json({ error: 'id, title, feed_url required' });
  const db = getDB();
  db.prepare('INSERT OR REPLACE INTO podcast_channels (id, title, feed_url, language, default_difficulty) VALUES (?, ?, ?, ?, ?)')
    .run(id, title, feed_url, language || 'en', default_difficulty || 'medium');
  res.json({ success: true });
});

router.delete('/channels/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM podcast_channels WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM podcasts WHERE channel_id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- Backward-compat aliases ---
router.get('/content/scmp', (req, res) => {
  const { topic, limit = 5 } = req.query;
  const db = getDB();
  let sql = "SELECT * FROM articles WHERE source = 'scmp'";
  const params = [];
  if (topic) { sql += ' AND topics LIKE ?'; params.push(`%"${topic}"%`); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  res.json(db.prepare(sql).all(...params).map(parseMetadata));
});
router.get('/content/podcasts', (req, res) => {
  const { difficulty, limit = 5 } = req.query;
  const db = getDB();
  let sql = 'SELECT * FROM podcasts WHERE 1=1';
  const params = [];
  if (difficulty) { sql += ' AND difficulty = ?'; params.push(difficulty); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  res.json(db.prepare(sql).all(...params).map(parseMetadata));
});

export default router;
