import { chunkText } from './chunker.js';
import { VectorStore } from './vectorStore.js';

export class RAGEngine {
  constructor(db) {
    this.db = db;
    this.vectorStore = new VectorStore();
  }

  async indexDocument(sourceType, sourceId, text) {
    const chunks = chunkText(text);
    for (const chunk of chunks) {
      const id = `${sourceId}-${chunk.index}`;
      await this.db.execute({
        sql: 'INSERT OR REPLACE INTO embeddings (id, source_type, source_id, chunk_index, chunk_text, embedding) VALUES (?, ?, ?, ?, ?, NULL)',
        args: [id, sourceType, sourceId, chunk.index, chunk.text],
      });
      this.vectorStore.add(id, chunk.text);
    }
  }

  async loadFromDB() {
    this.vectorStore.clear();
    const result = await this.db.execute('SELECT id, chunk_text FROM embeddings');
    for (const row of result.rows) {
      this.vectorStore.add(row.id, row.chunk_text);
    }
  }

  async deleteDocument(sourceId) {
    await this.db.execute({
      sql: 'DELETE FROM embeddings WHERE source_id = ?',
      args: [sourceId],
    });
    this.vectorStore.removeBySourceId(sourceId);
  }

  async reindexAll() {
    await this.db.execute('DELETE FROM embeddings');
    this.vectorStore.clear();

    const articles = (await this.db.execute('SELECT * FROM articles')).rows;
    const podcasts = (await this.db.execute('SELECT * FROM podcasts')).rows;

    for (const a of articles) {
      await this.indexDocument('article', a.id, a.content || a.title);
    }
    for (const p of podcasts) {
      await this.indexDocument('podcast', p.id, p.title + '\n\n' + (p.transcript || ''));
    }
  }

  async search(query, limit = 5) {
    return this.vectorStore.search(query, limit);
  }
}
