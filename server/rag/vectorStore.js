function tokenize(text) {
  return text.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);
}

function keywordScore(queryTokens, textTokens) {
  const textFreq = {};
  for (const t of textTokens) { textFreq[t] = (textFreq[t] || 0) + 1; }
  let score = 0;
  for (const qt of queryTokens) {
    if (textFreq[qt]) {
      score += 1 + Math.log2(1 + textFreq[qt]);
    }
  }
  return score / Math.max(textTokens.length, 1);
}

export class VectorStore {
  constructor() {
    this.docs = [];
    this.lastQuery = '';
  }

  add(id, text) {
    this.docs.push({ id, text });
  }

  search(query, limit = 5) {
    this.lastQuery = query;
    const qt = tokenize(query);
    const scored = this.docs.map(d => ({
      id: d.id,
      text: d.text,
      similarity: keywordScore(qt, tokenize(d.text)),
    }));
    return scored.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  removeByPrefix(prefix) {
    this.docs = this.docs.filter(d => !d.id.startsWith(prefix));
    return this.docs.length;
  }

  removeBySourceId(sourceId) {
    this.docs = this.docs.filter(d => d.id !== sourceId && !d.id.startsWith(sourceId + '-'));
  }

  clear() {
    this.docs = [];
  }

  get size() {
    return this.docs.length;
  }
}
