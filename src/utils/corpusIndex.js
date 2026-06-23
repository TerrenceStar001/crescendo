import { scoreTopics } from './topics';
import { extractKeyphrases, tokenize, STOP_WORDS } from './extractKeyphrases';

export const KINDS = [
  { slug: '',       label: 'Auto',       icon: '🤖', color: '#888' },
  { slug: 'youtube', label: 'YouTube Notes', icon: '▶️', color: '#FF0000' },
  { slug: 'threads', label: 'Threads',        icon: '🧵', color: '#1DA1F2' },
  { slug: 'project', label: 'Project Ideas',  icon: '🛠️', color: '#10B981' },
  { slug: 'knowledge', label: 'Knowledge & Learning', icon: '📚', color: '#6366F1' },
  { slug: 'research', label: 'Research & Analysis',   icon: '🔬', color: '#8B5CF6' },
  { slug: 'essay',   label: 'Essay',          icon: '📝', color: '#F59E0B' },
  { slug: 'journal', label: 'Journal & Reflections',   icon: '✍️', color: '#EC4899' },
  { slug: 'meeting', label: 'Meeting Notes',  icon: '📋', color: '#06B6D4' },
  { slug: 'recipe',  label: 'Recipes',        icon: '🍳', color: '#EF4444' },
  { slug: 'book',    label: 'Book Notes',     icon: '📖', color: '#3B82F6' },
  { slug: 'random-thoughts', label: 'Random Thoughts', icon: '💭', color: '#A1A1AA' },
  { slug: 'exercise', label: 'Exercise Analysis', icon: '📊', color: '#7C3AED' },
  { slug: 'general', label: 'General Note',   icon: '📄', color: '#71717A' },
];

const GENERIC_NOUNS = new Set([
  'people', 'thing', 'things', 'way', 'ways', 'part', 'parts', 'time', 'times',
  'year', 'years', 'world', 'life', 'day', 'days', 'place', 'places', 'group',
  'groups', 'member', 'members', 'number', 'numbers', 'point', 'points', 'fact',
  'facts', 'case', 'cases', 'issue', 'issues', 'problem', 'problems', 'question',
  'questions', 'answer', 'answers', 'reason', 'reasons', 'result', 'results',
  'effect', 'effects', 'change', 'changes', 'idea', 'ideas', 'thought', 'thoughts',
  'belief', 'beliefs', 'value', 'values', 'view', 'views', 'sense', 'senses',
  'type', 'types', 'sort', 'sorts', 'kind', 'kinds', 'form', 'forms', 'area',
  'areas', 'field', 'fields', 'system', 'systems', 'process', 'processes',
  'state', 'states', 'level', 'levels', 'role', 'roles', 'action', 'actions',
  'behavior', 'behaviors', 'behaviour', 'behaviours', 'practice', 'practices',
  'experience', 'experiences', 'situation', 'situations', 'condition',
  'conditions', 'context', 'contexts', 'approach', 'approaches', 'method',
  'methods', 'model', 'models', 'pattern', 'patterns', 'structure', 'structures',
  'factor', 'factors', 'element', 'elements', 'aspect', 'aspects', 'feature',
  'features', 'quality', 'qualities', 'characteristic', 'characteristics',
  'property', 'properties', 'relation', 'relations', 'relationship',
  'relationships', 'connection', 'connections', 'difference', 'differences',
  'similarity', 'similarities', 'example', 'examples', 'instance', 'instances',
  'term', 'terms', 'concept', 'concepts', 'notion', 'notions', 'topic', 'topics',
  'subject', 'subjects', 'theme', 'themes', 'category', 'categories', 'class',
  'classes', 'type', 'types', 'standard', 'standards', 'criterion', 'criteria',
  'rule', 'rules', 'principle', 'principles', 'law', 'laws', 'theory', 'theories',
  'truth', 'truths', 'fact', 'facts', 'reality', 'realities', 'knowledge',
  'understanding', 'argument', 'arguments', 'claim', 'claims', 'statement',
  'statements', 'position', 'positions', 'perspective', 'perspectives',
  'opinion', 'opinions', 'viewpoint', 'viewpoints', 'attitude', 'attitudes',
  'right', 'rights', 'wrong', 'good', 'bad', 'better', 'best', 'worst',
  'important', 'importance', 'significant', 'significance', 'necessary',
  'necessity', 'possible', 'possibility', 'probable', 'probability', 'likely',
  'common', 'commonly', 'typical', 'typically', 'normal', 'normally', 'general',
  'generally', 'specific', 'specifically', 'particular', 'particularly',
  'certain', 'certainly', 'clear', 'clearly', 'simple', 'simply', 'basic',
  'basically', 'major', 'minor', 'primary', 'primary', 'secondary', 'main',
  'mainly', 'central', 'core', 'key', 'crucial', 'critical', 'essential',
  'fundamental', 'basic', 'underlying', 'overall', 'overall', 'broad', 'broadly',
  'narrow', 'narrowly', 'deep', 'deeply', 'high', 'highly', 'low', 'lowly',
  'large', 'largely', 'small', 'little', 'big', 'great', 'much', 'many',
  'several', 'various', 'multiple', 'numerous', 'countless', 'endless',
  'endless', 'infinite', 'finite', 'limited', 'unlimited', 'extensive',
  'extensive', 'widespread', 'commonplace', 'everyday', 'daily', 'regular',
  'regularly', 'constant', 'constantly', 'frequent', 'frequently', 'rare',
  'rarely', 'occasional', 'occasionally', 'usual', 'usually', 'typical',
  'typically', 'normal', 'normally', 'ordinary', 'extraordinary',
  'john', 'jane', 'doe', 'smith', 'jones',
  'crowd', 'picture', 'photo', 'image', 'images', 'participant', 'participants',
  'run', 'walk', 'move', 'moves', 'look', 'looks', 'lot', 'lots',
  'hand', 'hands', 'head', 'eye', 'eyes', 'face', 'faces', 'body', 'bodies',
  'room', 'rooms', 'house', 'houses', 'home', 'homes', 'door', 'doors',
  'table', 'tables', 'chair', 'chairs', 'window', 'windows', 'wall', 'walls',
  'book', 'books', 'page', 'pages', 'line', 'lines', 'word', 'words',
  'paper', 'papers', 'report', 'reports', 'document', 'documents', 'file', 'files',
  'data', 'info', 'information', 'detail', 'details', 'note', 'notes',
  'list', 'lists', 'item', 'items', 'section', 'sections', 'chapter', 'chapters',
  'step', 'steps', 'stage', 'stages', 'phase', 'phases', 'round', 'rounds',
  'session', 'sessions', 'meeting', 'meetings', 'call', 'calls', 'event', 'events',
  'show', 'shows', 'display', 'displays', 'screen', 'screens', 'view', 'views',
  'mode', 'modes', 'option', 'options', 'setting', 'settings', 'config',
  'status', 'state', 'states', 'type', 'types', 'kind', 'kinds',
  'source', 'sources', 'resource', 'resources', 'tool', 'tools',
  'feature', 'features', 'function', 'functions', 'component', 'components',
  'module', 'modules', 'plugin', 'plugins', 'extension', 'extensions',
  'version', 'versions', 'update', 'updates', 'release', 'releases',
]);

const KIND_PATTERNS = [
  { slug: 'youtube',   test: /\b(youtube|video|tutorial|watch|episode|channel|stream)\b/i, score: 0.75, minMatches: 2, cluster: ['youtube', 'tutorial', 'episode', 'stream'] },
  { slug: 'threads',   test: /\b(thread|tweet|twitter|reddit|post|subreddit)\b/i, score: 0.9, minMatches: 3, cluster: ['thread', 'tweet', 'twitter', 'reddit', 'post', 'subreddit'] },
  { slug: 'project',   test: /\b(project|build|create|app|prototype|mvp|startup|side.?project)\b/i, score: 0.75 },
  { slug: 'knowledge', test: /\b(learn|study|course|lecture|book|read|chapter|lesson|curriculum|syllabus)\b/i, score: 0.75 },
  { slug: 'research',  test: /\b(paper|research|study|experiment|hypothesis|literature|methodology)\b/i, score: 0.75 },
  { slug: 'essay',     test: /\b(abstract|introduction|conclusion|section|hence|therefore|furthermore)\b/i, score: 0.85, minSentences: 8 },
  { slug: 'journal',   test: /\b(i\s+(feel|think|believe|wonder|remember|personally)|my\s+opinion|in\s+my\s+experience)\b/i, score: 0.8 },
  { slug: 'meeting',   test: /\b(meeting|agenda|attendees?|action\s+items|discussed|standup|retro|sprint)\b/i, score: 0.9, minMatches: 2, cluster: ['meeting', 'agenda', 'attendees', 'attendee', 'action items', 'discussed', 'standup', 'retro', 'sprint'] },
  { slug: 'recipe',    test: /\b(recipe|ingredients|cook|bake|kitchen)\b/i, score: 0.85, minMatches: 3, cluster: ['recipe', 'ingredients', 'cook', 'bake', 'kitchen'] },
  { slug: 'book',      test: /\b(book|novel|chapter|page|author|reading|library)\b/i, score: 0.85, conjunct: /\b(review|summary|notes?)\b/i },
];

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, '');
}

function extractSentences(text) {
  return text.split(/[.!?\n\r]+/).map(s => s.trim()).filter(s => s.length > 10);
}

function extractHeadings(html) {
  const headings = [];
  const re = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    if (text) headings.push({ level: parseInt(m[1]), text });
  }
  return headings;
}

function detectGenre(text, html) {
  if (/<pre>|<code>/i.test(html)) return 'technical';
  if (/\b(vs|versus|compare|comparison|differences?|pros|cons|advantages?|disadvantages?)\b/i.test(text)) return 'comparison';
  if (/\b\d{1,2}:\d{2}\b/.test(text) && /\b(attendees?|agenda|minutes|meeting)\b/i.test(text)) return 'meeting';
  if (/\b(i\s+(feel|think|believe|wonder|remember)|dear\s+(diary|journal))\b/i.test(text)) return 'journal';
  if (text.split('\n').filter(l => l.match(/^\s*[-*]\s/)).length >= 3) return 'list';
  return 'general';
}

function detectContentType(text, html, sentences) {
  const lower = text.toLowerCase();
  const types = [];

  for (const rule of KIND_PATTERNS) {
    if (rule.minSentences && sentences.length <= rule.minSentences) continue;
    if (rule.conjunct && !rule.conjunct.test(lower)) continue;
    if (rule.test.test(lower)) {
      if (rule.minMatches) {
        const matches = rule.cluster.filter(w => new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(lower));
        if (matches.length < rule.minMatches) continue;
      }
      types.push({ slug: rule.slug, label: KINDS.find(k => k.slug === rule.slug)?.label || rule.slug, score: rule.score });
    }
  }

  if (types.length === 0 && (sentences.length <= 5 || text.length < 500)) {
    types.push({ slug: 'random-thoughts', label: 'Random Thoughts', score: 0.6 });
  }
  if (types.length === 0) {
    types.push({ slug: 'general', label: 'General Note', score: 0.5 });
  }

  return types.sort((a, b) => b.score - a.score);
}

function detectDefinition(sentence) {
  const patterns = [
    /^(.*?)\s+(is|are|refers?\s+to|means?|constitutes?|represents?|can\s+be\s+defined\s+as|describes?|involves?)\s+/i,
    /^(.*?),\s+or\s+(.*?),\s+is\s+/i,
  ];
  for (const p of patterns) {
    const m = sentence.match(p);
    if (m && m[1].trim().length < 60) return m[1].trim();
  }
  return null;
}

const STORAGE_KEY = 'crescendo-corpus-index';
const KIND_PROFILES_KEY = 'crescendo-kind-profiles';

class CorpusIndex {
  constructor() {
    this.topicProfiles = {};
    this.kindProfiles = {};
    this.docFreq = {};
    this.totalDocs = 0;
    this.vocabSize = 0;
    this.loaded = false;
    this._load();
    this._loadKindProfiles();
  }

  _loadKindProfiles() {
    try {
      const raw = localStorage.getItem(KIND_PROFILES_KEY);
      if (raw) {
        this.kindProfiles = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Kind profiles load failed:', e.message);
      this.kindProfiles = {};
    }
  }

  _saveKindProfiles() {
    try {
      localStorage.setItem(KIND_PROFILES_KEY, JSON.stringify(this.kindProfiles));
    } catch (e) {
      console.warn('Kind profiles save failed:', e.message);
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.topicProfiles = data.topicProfiles || {};
        this.docFreq = data.docFreq || {};
        this.totalDocs = data.totalDocs || 0;
        this.vocabSize = data.vocabSize || this._computeVocabSize();
        this.loaded = true;
      }
    } catch (e) {
      console.warn('CorpusIndex load failed, rebuilding:', e.message);
      this.topicProfiles = {};
      this.docFreq = {};
      this.totalDocs = 0;
      this.vocabSize = 0;
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        topicProfiles: this.topicProfiles,
        docFreq: this.docFreq,
        totalDocs: this.totalDocs,
        vocabSize: this.vocabSize,
        lastRebuilt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('CorpusIndex save failed:', e.message);
    }
  }

  _computeVocabSize() {
    const all = new Set();
    for (const profile of Object.values(this.topicProfiles)) {
      for (const term of Object.keys(profile.terms)) {
        all.add(term);
      }
    }
    return all.size;
  }

  rebuild(notes) {
    const topicProfiles = {};
    const docFreq = {};
    let totalDocs = 0;
    const docWordsMap = {};

    notes.forEach(note => {
      const text = stripHtml(note.content || '');
      const words = tokenize(text);
      if (words.length === 0) return;
      totalDocs++;

      const wordSet = new Set(words);
      wordSet.forEach(w => {
        docFreq[w] = (docFreq[w] || 0) + 1;
      });
      docWordsMap[note.id] = words;

      (note.tags || []).forEach(tag => {
        if (!topicProfiles[tag]) {
          topicProfiles[tag] = { terms: {}, totalTerms: 0, totalNotes: 0 };
        }
        topicProfiles[tag].totalNotes++;
        words.forEach(w => {
          topicProfiles[tag].terms[w] = (topicProfiles[tag].terms[w] || 0) + 1;
          topicProfiles[tag].totalTerms++;
        });
      });
    });

    this.topicProfiles = topicProfiles;
    this.docFreq = docFreq;
    this.totalDocs = totalDocs;
    this.vocabSize = this._computeVocabSize();
    this._save();
  }

  update(note, oldTags) {
    const text = stripHtml(note.content || '');
    const words = tokenize(text);
    if (words.length === 0) return;

    const wordSet = new Set(words);
    this.totalDocs++;

    wordSet.forEach(w => {
      this.docFreq[w] = (this.docFreq[w] || 0) + 1;
    });

    const newTags = note.tags || [];

    newTags.forEach(tag => {
      if (!this.topicProfiles[tag]) {
        this.topicProfiles[tag] = { terms: {}, totalTerms: 0, totalNotes: 0 };
      }
      this.topicProfiles[tag].totalNotes++;
      words.forEach(w => {
        this.topicProfiles[tag].terms[w] = (this.topicProfiles[tag].terms[w] || 0) + 1;
        this.topicProfiles[tag].totalTerms++;
      });
    });

    if (oldTags) {
      oldTags.forEach(tag => {
        if (tag && this.topicProfiles[tag]) {
          this.topicProfiles[tag].totalNotes = Math.max(0, this.topicProfiles[tag].totalNotes - 1);
          if (this.topicProfiles[tag].totalNotes === 0) {
            delete this.topicProfiles[tag];
          }
        }
      });
    }

    this.vocabSize = this._computeVocabSize();
    this._save();
  }

  removeNote(note) {
    const text = stripHtml(note.content || '');
    const words = tokenize(text);
    const wordSet = new Set(words);
    this.totalDocs = Math.max(0, this.totalDocs - 1);

    wordSet.forEach(w => {
      if (this.docFreq[w]) {
        this.docFreq[w]--;
        if (this.docFreq[w] <= 0) delete this.docFreq[w];
      }
    });

    (note.tags || []).forEach(tag => {
      if (this.topicProfiles[tag]) {
        this.topicProfiles[tag].totalNotes--;
        words.forEach(w => {
          if (this.topicProfiles[tag].terms[w]) {
            this.topicProfiles[tag].terms[w]--;
            this.topicProfiles[tag].totalTerms--;
            if (this.topicProfiles[tag].terms[w] <= 0) delete this.topicProfiles[tag].terms[w];
          }
        });
        if (this.topicProfiles[tag].totalNotes <= 0) {
          delete this.topicProfiles[tag];
        }
      }
    });

    this.vocabSize = this._computeVocabSize();
    this._save();
  }

  trainKind(slug, content) {
    if (!slug || !content) return;
    const text = stripHtml(content);
    const words = tokenize(text);
    if (words.length < 3) return;
    if (!this.kindProfiles[slug]) {
      this.kindProfiles[slug] = { terms: {}, totalTerms: 0, totalNotes: 0 };
    }
    const profile = this.kindProfiles[slug];
    profile.totalNotes++;
    words.forEach(w => {
      profile.terms[w] = (profile.terms[w] || 0) + 1;
      profile.totalTerms++;
    });
    this._saveKindProfiles();
  }

  _boostKindsWithNB(text, kinds) {
    const trainedKinds = Object.entries(this.kindProfiles)
      .filter(([, p]) => p.totalNotes >= 3);
    if (trainedKinds.length === 0) return kinds;

    const words = tokenize(text);
    if (words.length === 0) return kinds;

    const totalTrained = trainedKinds.reduce((s, [, p]) => s + p.totalNotes, 0);
    const kindVocab = new Set();
    for (const [, p] of trainedKinds) {
      for (const term of Object.keys(p.terms)) kindVocab.add(term);
    }
    const vocabSize = kindVocab.size || 1;

    const nbScores = {};
    for (const [slug, profile] of trainedKinds) {
      const prior = Math.log(profile.totalNotes / totalTrained);
      let logProb = prior;
      let matched = 0;
      for (const w of words) {
        const count = profile.terms[w] || 0;
        if (count > 0) matched++;
        logProb += Math.log((count + 1) / (profile.totalTerms + vocabSize));
      }
      if (matched > 0) {
        nbScores[slug] = { score: logProb, matchRatio: matched / words.length };
      }
    }

    const existingSlugs = new Set(kinds.map(k => k.slug));
    const result = [...kinds];

    for (const [slug, nb] of Object.entries(nbScores)) {
      if (existingSlugs.has(slug)) {
        const existing = result.find(k => k.slug === slug);
        existing.score = Math.min(1, existing.score + nb.matchRatio * 0.15);
      } else if (nb.matchRatio > 0.25) {
        const label = KINDS.find(k => k.slug === slug)?.label || slug;
        result.push({ slug, label, score: 0.4 + nb.matchRatio * 0.3 });
      }
    }

    return result.sort((a, b) => b.score - a.score);
  }

  analyze(content, notes) {
    if (!content || !content.trim()) {
      return { title: 'Untitled', tags: [], keywords: [], summary: '', genre: 'general', kind: '', contentTypes: [] };
    }

    try {
      const text = stripHtml(content);
      const words = tokenize(text);
      const html = content;
      const sentences = extractSentences(text);
      const headings = extractHeadings(html);
      const genre = detectGenre(text, html);

      const idf = this.totalDocs > 0 ? this.docFreq : {};
      const totalDocs = this.totalDocs || notes.length || 1;

      const wordFreq = {};
      words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });

      const wordScore = {};
      for (const [w, freq] of Object.entries(wordFreq)) {
        const df = idf[w] || 1;
        const idfVal = Math.log(totalDocs / (1 + df)) + 1;
        wordScore[w] = freq * idfVal;
      }

      const sortedWords = Object.entries(wordScore).sort((a, b) => b[1] - a[1]);

      const keyphrases = extractKeyphrases(content, { docFreq: idf, totalDocs });
      const keywords = keyphrases.slice(0, 12).map(k => ({ word: k.word, score: k.score }));

      const collocations = keyphrases.filter(k => k.type === 'collocation').map(k => k.phrase).slice(0, 6);
      const entities = keyphrases.filter(k => k.type === 'entity').map(k => k.phrase).slice(0, 4);

      const tagCount = new Map();
      notes.forEach(n => (n.tags || []).forEach(t => tagCount.set(t, (tagCount.get(t) || 0) + 1)));
      const tagsWithCount = [...tagCount.entries()].filter(([, c]) => c >= 3);

      let scoredTopics = [];

      if (tagsWithCount.length > 0) {
        const profileKeys = Object.keys(this.topicProfiles).filter(
          k => tagsWithCount.some(([t]) => t === k)
        );

        if (profileKeys.length > 0 && words.length > 0) {
          const vocab = this.vocabSize || 1;
          for (const tag of profileKeys) {
            const profile = this.topicProfiles[tag];
            if (!profile || profile.totalNotes < 1) continue;
            const prior = Math.log(profile.totalNotes / (totalDocs || 1));
            let logProb = prior;
            const matchedTerms = [];
            for (const w of words) {
              const count = profile.terms[w] || 0;
              const p = (count + 1) / (profile.totalTerms + vocab);
              logProb += Math.log(p);
              if (count > 0) matchedTerms.push(w);
            }
            if (matchedTerms.length > 0) {
              scoredTopics.push({
                label: tag,
                score: logProb,
                matchRatio: matchedTerms.length / words.length,
              });
            }
          }
        }
      }

      if (scoredTopics.length < 2) {
        const fallback = scoreTopics(text);
        const lower = text.toLowerCase();
        let added = 0;
        for (const label of fallback) {
          if (added >= 3) break;
          if (scoredTopics.some(s => s.label === label)) continue;
          const labelWords = label.toLowerCase().split(/[\s&,/]+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
          const hasMatch = labelWords.length === 0 || labelWords.some(w => lower.includes(w));
          if (!hasMatch) continue;
          scoredTopics.push({ label, score: 0.3, matchRatio: 0 });
          added++;
        }
      }

      scoredTopics.sort((a, b) => b.score - a.score);

      let title = '';
      if (headings.length > 0) {
        title = headings[0].text.replace(/^[\d#.\s]+/, '').replace(/[|/\\]$/, '').trim();
        if (title.length > 80) title = title.slice(0, 77) + '...';
      }

      if (!title && sentences.length > 0) {
        for (const s of sentences) {
          const def = detectDefinition(s);
          if (def) { title = def; break; }
        }
      }

      if (!title && sentences.length > 0) {
        const totalSentences = sentences.length;
        const scoredSentences = sentences.map((s, i) => {
          const sw = tokenize(s);
          const kwScore = sw.reduce((sum, w) => sum + (wordScore[w] || 0), 0) / (sw.length || 1);
          const posBoost = 1 + Math.max(0, 1 - i / totalSentences) * 0.3;
          return { text: s, score: kwScore * posBoost, idx: i };
        });
        scoredSentences.sort((a, b) => b.score - a.score);
        const best = scoredSentences[0];
        if (best && best.score > 0.1) {
          title = best.text.slice(0, 77).replace(/[,;:\s]+$/, '') + (best.text.length > 77 ? '...' : '');
        }
      }

      if (!title && scoredTopics.length > 0 && scoredTopics[0].label.length < 50) {
        title = scoredTopics[0].label;
      }

      if (!title && sentences.length > 0) {
        const first = sentences[0];
        title = first.length > 77 ? first.slice(0, 74) + '...' : first;
      }

      if (!title) {
        title = text.slice(0, 77) + (text.length > 77 ? '...' : '');
      }

      if (/^(how|what|why|when|where|does|is|are|can|will|would|could|should|do|did)\b/i.test(title) || /\?/.test(title)) {
        const fallback = sentences.find(s => !/^(how|what|why|when|where|does|is|are|can)\b/i.test(s) && !/\?/.test(s));
        if (fallback) title = fallback.slice(0, 77).replace(/[,;:\s]+$/, '');
      }

      title = title.charAt(0).toUpperCase() + title.slice(1);
      if (title.length < 4) title = 'Untitled';

      const usedTags = new Set();
      const tags = [];
      const maxTags = Math.min(
        text.length < 50 ? 3 : text.length < 200 ? 5 : text.length < 500 ? 8 : text.length < 1500 ? 12 : 20,
        20
      );

      for (const t of scoredTopics) {
        if (tags.length >= maxTags) break;
        const label = t.label;
        if (!usedTags.has(label)) {
          usedTags.add(label);
          tags.push(label);
        }
      }

      for (const ent of entities) {
        if (tags.length >= maxTags) break;
        if (!usedTags.has(ent)) {
          usedTags.add(ent);
          tags.push(ent);
        }
      }

      for (const cp of collocations) {
        if (tags.length >= maxTags) break;
        if (usedTags.has(cp)) continue;
        const parts = cp.split(' ');
        if (parts.length === 2 && parts.every(p => p.length < 4 || GENERIC_NOUNS.has(p.toLowerCase()))) continue;
        usedTags.add(cp);
        tags.push(cp);
      }

      for (const kp of keyphrases) {
        if (tags.length >= maxTags) break;
        if (kp.type === 'collocation' || kp.type === 'entity') continue;
        const w = kp.phrase.toLowerCase();
        if (!usedTags.has(w) && (kp.pos === 'noun' || kp.pos === 'proper') && w.length >= 4 && !GENERIC_NOUNS.has(w)) {
          usedTags.add(w);
          tags.push(kp.phrase);
        }
      }

      let contentTypes = detectContentType(text, html, sentences);
      contentTypes = this._boostKindsWithNB(text, contentTypes);

      let summary = '';
      if (sentences.length > 0) {
        const scored = sentences.map((s, i) => {
          const sw = tokenize(s);
          const score = sw.reduce((sum, w) => sum + (wordScore[w] || 0), 0) / (sw.length || 1);
          return { text: s, score, idx: i };
        });
        scored.sort((a, b) => b.score - a.score);
        summary = scored[0]?.text.slice(0, 150).replace(/[,;:]+$/, '') || '';
      }

      const kindTop = contentTypes.length > 0 ? contentTypes[0].slug : '';

      return { title, tags, keywords, summary, genre, kind: kindTop, contentTypes: contentTypes.map(c => ({ slug: c.slug, label: c.label, score: c.score })) };
    } catch (e) {
      console.error('CorpusIndex.analyze error:', e.message);
      const text = stripHtml(content);
      const sentences = extractSentences(text);
      return {
        title: sentences[0]?.slice(0, 77) || 'Untitled',
        tags: scoreTopics(text).slice(0, 5),
        keywords: [],
        summary: '',
        genre: 'general',
        kind: '',
        contentTypes: [],
      };
    }
  }
}

const instance = new CorpusIndex();
export default instance;
