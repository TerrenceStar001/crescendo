export function createSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      url TEXT,
      date TEXT,
      word_count INTEGER,
      difficulty TEXT,
      topics TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS papers (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      year INTEGER,
      paper INTEGER,
      section TEXT,
      difficulty TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS podcast_channels (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      feed_url TEXT NOT NULL,
      language TEXT DEFAULT 'en',
      default_difficulty TEXT DEFAULT 'medium',
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS podcasts (
      id TEXT PRIMARY KEY,
      channel_id TEXT REFERENCES podcast_channels(id),
      title TEXT NOT NULL,
      audio_url TEXT NOT NULL,
      duration INTEGER,
      transcript TEXT,
      source TEXT,
      difficulty TEXT,
      topics TEXT,
      published_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS embeddings (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      chunk_index INTEGER,
      chunk_text TEXT NOT NULL,
      embedding BLOB,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      content TEXT,
      tags TEXT DEFAULT '[]',
      difficulty TEXT DEFAULT 'intermediate',
      source TEXT,
      source_task_id TEXT,
      weakness_pattern TEXT,
      draft_content TEXT,
      published INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crawl_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      items_found INTEGER DEFAULT 0,
      error TEXT,
      started_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS course_extractions (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      total_chars INTEGER,
      english_pct INTEGER,
      quality_score TEXT,
      per_page_data TEXT,
      extraction_method TEXT,
      full_text TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Indexes for common queries
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source)',
    'CREATE INDEX IF NOT EXISTS idx_articles_difficulty ON articles(difficulty)',
    'CREATE INDEX IF NOT EXISTS idx_articles_topics ON articles(topics)',
    'CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date)',
    'CREATE INDEX IF NOT EXISTS idx_papers_type ON papers(type)',
    'CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year)',
    'CREATE INDEX IF NOT EXISTS idx_podcasts_difficulty ON podcasts(difficulty)',
    'CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id)',
    'CREATE INDEX IF NOT EXISTS idx_crawl_log_status ON crawl_log(status)',
    'CREATE INDEX IF NOT EXISTS idx_course_extractions_course ON course_extractions(course_id)',
  ];

  for (const idx of indexes) {
    try { db.exec(idx); } catch {}
  }

  // Seed default podcast channels if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM podcast_channels').get().c;
  if (count === 0) {
    const insert = db.prepare('INSERT OR IGNORE INTO podcast_channels (id, title, feed_url, language, default_difficulty) VALUES (?, ?, ?, ?, ?)');
    insert.run('bbc-6min', 'BBC 6 Minute English', 'https://podcasts.files.bbci.co.uk/p02pc9qc.rss', 'en-GB', 'medium');
    insert.run('ted-daily', 'TED Talks Daily', 'https://feeds.feedburner.com/tedtalks_audio', 'en-US', 'hard');
    insert.run('lukes-english', "Luke's English Podcast", 'https://feeds.libsyn.com/108160/rss', 'en-GB', 'medium');
  }
}
