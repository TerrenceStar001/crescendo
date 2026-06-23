import { chunkText } from './chunker.js';
import { VectorStore } from './vectorStore.js';

export class RAGEngine {
  constructor(db) {
    this.db = db;
    this.vectorStore = new VectorStore();
  }

  async indexDocument(sourceType, sourceId, text) {
    const chunks = chunkText(text);

    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO embeddings (id, source_type, source_id, chunk_index, chunk_text, embedding)
      VALUES (?, ?, ?, ?, ?, NULL)
    `);

    const tx = this.db.transaction(() => {
      for (const chunk of chunks) {
        const id = `${sourceId}-${chunk.index}`;
        insert.run(id, sourceType, sourceId, chunk.index, chunk.text);
        this.vectorStore.add(id, chunk.text);
      }
    });
    tx();
  }

  loadFromDB() {
    this.vectorStore.clear();
    const rows = this.db.prepare('SELECT id, chunk_text FROM embeddings').all();
    for (const row of rows) {
      this.vectorStore.add(row.id, row.chunk_text);
    }
  }

  deleteDocument(sourceId) {
    this.db.prepare('DELETE FROM embeddings WHERE source_id = ?').run(sourceId);
    this.vectorStore.removeBySourceId(sourceId);
  }

  async reindexAll() {
    this.db.prepare('DELETE FROM embeddings').run();
    this.vectorStore.clear();

    const articles = this.db.prepare('SELECT * FROM articles').all();
    const podcasts = this.db.prepare('SELECT * FROM podcasts').all();

    for (const a of articles) {
      this.indexDocument('article', a.id, a.content || a.title);
    }
    for (const p of podcasts) {
      this.indexDocument('podcast', p.id, p.title + '\n\n' + (p.transcript || ''));
    }
  }

  async search(query, limit = 5) {
    return this.vectorStore.search(query, limit);
  }
}
