const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'and', 'but', 'or', 'because', 'until',
  'while', 'if', 'this', 'that', 'these', 'those', 'it', 'its', 'he',
  'she', 'they', 'them', 'we', 'you', 'i', 'me', 'my', 'your', 'his',
  'her', 'our', 'their', 'just', 'about', 'also', 'get', 'got', 'getting',
  'really', 'like', 'well', 'way', 'even', 'new', 'make', 'made',
  'what', 'which', 'who', 'whom', 'any', 'much', 'many', 'need',
  'thing', 'things', 'day', 'today', 'still', 'back', 'going', 'come',
  'take', 'want', 'know', 'think', 'feel', 'good', 'bad',
  'say', 'said', 'let', 'put', 'set', 'use', 'could', 'would',
  'might', 'must', 'shall', 'every', 'each', 'now', 'then', 'here',
  'there', 'without', 'always', 'never', 'also', 'seem', 'seemed',
  'seems', 'done', 'doing', 'made', 'make', 'making', 'time', 'moment',
  'part', 'life', 'something', 'anything', 'nothing', 'everything',
  'someone', 'anyone', 'everyone', 'must', 'shall', 'yet', 'already',
  'since', 'until', 'next', 'last', 'first', 'second',
  'enough', 'able', 'about', 'across', 'after', 'along', 'among',
  'around', 'because', 'before', 'behind', 'below', 'beneath', 'beside',
  'between', 'beyond', 'despite', 'during', 'except', 'inside', 'near',
  'onto', 'outside', 'since', 'through', 'throughout', 'toward',
  'underneath', 'until', 'upon', 'within',
  'year', 'years', 'month', 'months', 'week', 'weeks', 'days',
  'lot', 'lots', 'number', 'numbers', 'example', 'examples', 'etc',
  'sometimes', 'often', 'always', 'never', 'especially', 'including',
  'means', 'mean', 'meaning', 'word', 'words', 'nonsense',
]);

const NOUN_SUFFIXES = /(?:tion|sion|ment|ness|ity|ism|ist|ance|ence|ship|dom|hood|logy|ics|sis|ture|ure|age|ery|ory|eer|eer|ant|ent|ary|ery|tivity|ability|ibility|ology|graphy|metry|nomy|tomy)$/i;
const VERB_SUFFIXES = /(?:ify|ize|ise|ate|en|ish|ing|ed)$/i;
const ADJ_SUFFIXES = /(?:able|ible|al|ous|ious|ive|ful|less|ic|ical|ar|ary|ant|ent|some|esque)$/i;

function stripHtml(html) {
  return html
    .replace(/<\/(?:h\d|p|div|blockquote|pre|li|ul|ol)>/gi, '. ')
    .replace(/<(?:h\d|p|div|blockquote|pre|li|ul|ol|br)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&[^;]+;/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .replace(/\.$/, '')
    .trim();
}

function isCapitalized(word) {
  return /^[A-Z]/.test(word);
}

function guessPos(word, index, isFirstWord) {
  if (word.length <= 2) return 'other';

  const capped = isCapitalized(word) && !isFirstWord;

  if (capped) return 'proper';
  if (NOUN_SUFFIXES.test(word)) return 'noun';
  if (VERB_SUFFIXES.test(word)) return 'verb';
  if (ADJ_SUFFIXES.test(word)) return 'adj';

  return 'noun';
}

function tokenize(text) {
  return text.toLowerCase().split(/\W+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
}

function tokenizeWithPos(text) {
  const re = /[A-Za-z]{3,}/g;
  const tokens = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const word = match[0];
    const lower = word.toLowerCase();
    if (STOP_WORDS.has(lower) || /^\d+$/.test(word)) continue;
    const textBefore = text.slice(0, match.index);
    const trimmedBefore = textBefore.trimEnd();
    const isSentenceStart = trimmedBefore === '' || /[.!?]$/.test(trimmedBefore.slice(-1));
    const pos = guessPos(word, tokens.length, isSentenceStart);
    tokens.push({ word: lower, original: word, pos, index: match.index, isSentenceStart });
  }
  return tokens;
}

function computePMICollocations(tokens, minFreq = 2) {
  const unigramFreq = {};
  const bigramFreq = {};
  let totalUnigrams = 0;

  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i].word;
    unigramFreq[w] = (unigramFreq[w] || 0) + 1;
    totalUnigrams++;

    if (i < tokens.length - 1) {
      const bg = `${w} ${tokens[i + 1].word}`;
      bigramFreq[bg] = (bigramFreq[bg] || 0) + 1;
    }
  }

  const collocations = [];
  for (const [bg, freq] of Object.entries(bigramFreq)) {
    if (freq < minFreq) continue;
    const [w1, w2] = bg.split(' ');
    const pBgram = freq / (totalUnigrams - 1 || 1);
    const pW1 = (unigramFreq[w1] || 1) / totalUnigrams;
    const pW2 = (unigramFreq[w2] || 1) / totalUnigrams;
    const pmi = Math.log(pBgram / (pW1 * pW2)) / Math.log(2);
    if (pmi > 1.5) {
      collocations.push({ phrase: bg, freq, pmi: +pmi.toFixed(2) });
    }
  }

  return collocations.sort((a, b) => b.pmi - a.pmi);
}

function findEntities(tokens) {
  const entities = [];
  let current = [];

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].isSentenceStart && current.length > 0) {
      if (current.length >= 2) entities.push({ phrase: current.join(' '), words: current.length });
      current = [];
    }
    if (tokens[i].pos === 'proper') {
      current.push(tokens[i].original);
    } else {
      if (current.length >= 2) entities.push({ phrase: current.join(' '), words: current.length });
      current = [];
    }
  }
  if (current.length >= 2) entities.push({ phrase: current.join(' '), words: current.length });
  return entities;
}

const POS_BOOST = { proper: 2.5, noun: 1.5, verb: 0.6, adj: 0.8, other: 0.5 };

function extractKeyphrases(html, options = {}) {
  const { docFreq = {}, totalDocs = 0 } = options;
  const text = stripHtml(html);
  if (!text) return [];

  const tokens = tokenizeWithPos(text);
  if (tokens.length === 0) return [];

  const wordFreq = {};
  tokens.forEach(t => { wordFreq[t.word] = (wordFreq[t.word] || 0) + 1; });

  const docs = Math.max(totalDocs || 1, 1);
  const scored = [];

  for (const t of tokens) {
    const df = docFreq[t.word] || 1;
    const idf = Math.log(docs / (1 + df)) + 1;
    const tf = wordFreq[t.word] || 1;
    const boost = POS_BOOST[t.pos] || 1;
    const score = tf * idf * boost;
    scored.push({ word: t.word, original: t.original, pos: t.pos, score: +score.toFixed(3), tf, idf: +idf.toFixed(3) });
  }

  const unique = [];
  const seen = new Set();
  for (const s of scored) {
    if (!seen.has(s.word)) {
      seen.add(s.word);
      unique.push(s);
    }
  }

  const sorted = unique.sort((a, b) => b.score - a.score);

  const collocations = computePMICollocations(tokens, 2);
  const entities = findEntities(tokens);

  const topScore = sorted[0]?.score || 1;
  const keyphrases = sorted.slice(0, 16).map(s => ({
    phrase: s.original,
    word: s.word,
    score: +(s.score / topScore).toFixed(3),
    pos: s.pos,
    type: 'word',
  }));

  for (const c of collocations) {
    if (keyphrases.length >= 20) break;
    const exists = keyphrases.some(k => k.phrase === c.phrase);
    if (!exists) {
      keyphrases.push({
        phrase: c.phrase,
        word: c.phrase,
        score: +(c.pmi / 10).toFixed(3),
        pos: 'noun',
        type: 'collocation',
      });
    }
  }

  for (const e of entities) {
    if (keyphrases.length >= 20) break;
    const exists = keyphrases.some(k => k.phrase.toLowerCase() === e.phrase.toLowerCase());
    if (!exists) {
      keyphrases.push({
        phrase: e.phrase,
        word: e.phrase.toLowerCase(),
        score: 0.5,
        pos: 'proper',
        type: 'entity',
      });
    }
  }

  return keyphrases.sort((a, b) => b.score - a.score);
}

export { extractKeyphrases, STOP_WORDS, tokenize, stripHtml };
export default extractKeyphrases;
