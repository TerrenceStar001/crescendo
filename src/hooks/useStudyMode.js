import { useCallback, useRef } from 'react';
import extractKeyphrases from '../utils/extractKeyphrases';

const STOP_WORDS = new Set([
  'the', 'this', 'that', 'with', 'from', 'have', 'been', 'were', 'they',
  'their', 'what', 'which', 'when', 'where', 'there', 'about', 'would',
  'could', 'should', 'into', 'over', 'such', 'only', 'than', 'then',
  'also', 'its', 'has', 'had', 'but', 'not', 'are', 'was', 'for',
  'and', 'our', 'your', 'can', 'will', 'after', 'before', 'between',
  'through', 'during', 'without', 'within', 'across', 'because',
  'while', 'since', 'until', 'being', 'having', 'does', 'used',
  'may', 'might', 'must', 'shall', 'other', 'more', 'some', 'most',
  'many', 'each', 'every', 'both', 'few', 'those', 'these', 'than',
]);

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').trim();
}

function extractSentences(text) {
  if (!text) return [];
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  return sentences.map(s => s.trim()).filter(Boolean);
}

function extractParagraphs(text) {
  return text.split(/\n\s*\n/).filter(Boolean);
}

function getKeyphrases(content) {
  const html = content;
  const kps = extractKeyphrases(html);
  return kps.map(k => k.phrase);
}

function generateCloze(sentence, term) {
  const words = term.split(/\s+/);
  const pattern = words.map(w => `\\b${escapeRegex(w)}\\b`).join('\\s+');
  const re = new RegExp(pattern, 'gi');
  const blanked = sentence.replace(re, '______');
  if (blanked === sentence) return null;
  return { question: 'Fill in the blank:', sentence: blanked, answer: term, type: 'cloze' };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDefinitionSentence(s) {
  const lower = s.toLowerCase().trim();
  const patterns = [
    /^[\w\s]+ is (?:a |an |the )?[\w\s]+/,
    /^[\w\s]+ are (?:the )?[\w\s]+/,
    /^[\w\s]+ refers to /,
    /^[\w\s]+ means /,
    /^[\w\s]+ can be defined as /,
    /^[\w\s]+ is defined as /,
    /^[\w\s]+ is known as /,
    /^[\w\s]+ describes /,
    /^[\w\s]+ represents /,
  ];
  return patterns.some(p => p.test(lower));
}

function extractDefinedTerm(sentence) {
  const m = sentence.match(/^(\w[\w\s]*?)\s+is\s+(?:a |an |the )?(?:[\w\s]+)/i);
  if (m) return m[1].trim().split(/\s+/).slice(0, 4).join(' ');
  const m2 = sentence.match(/^(\w[\w\s]*?)\s+(?:refers to|means|can be defined as|is defined as|is known as|describes|represents)\s+/i);
  if (m2) return m2[1].trim().split(/\s+/).slice(0, 4).join(' ');
  return null;
}

function generateDefinition(sentences, keywords) {
  for (const s of sentences) {
    if (!isDefinitionSentence(s)) continue;
    const term = extractDefinedTerm(s);
    if (!term) continue;
    if (!keywords.some(k => s.toLowerCase().includes(k))) continue;
    return {
      question: `What is "${term}"?`,
      sentence: s,
      answer: term,
      type: 'definition',
    };
  }
  return null;
}

function generateRelationship(sentences, keywords, allContent) {
  const paragraphs = extractParagraphs(allContent);
  for (let i = 0; i < keywords.length; i++) {
    for (let j = i + 1; j < keywords.length; j++) {
      const k1 = keywords[i];
      const k2 = keywords[j];
      const shared = paragraphs.find(p =>
        p.toLowerCase().includes(k1) && p.toLowerCase().includes(k2)
      );
      if (!shared) continue;
      return {
        question: `How do "${k1}" and "${k2}" relate?`,
        sentence: shared.slice(0, 250),
        answer: `${k1} and ${k2}`,
        type: 'relationship',
      };
    }
  }
  return null;
}

function generateTrueFalse(sentences, keywords) {
  const defPatterns = [
    { re: /^([A-Z][\w\s]{2,40})\s+is\s+(?:a |an |the )?([\w\s]{2,40})\.?$/i, verb: 'is' },
    { re: /^([A-Z][\w\s]{2,40})\s+are\s+(?:the )?([\w\s]{2,40})\.?$/i, verb: 'are' },
    { re: /^([A-Z][\w\s]{2,40})\s+refers?\s+to\s+([\w\s]{2,40})\.?$/i, verb: 'refers to' },
    { re: /^([A-Z][\w\s]{2,40})\s+can\s+be\s+defined\s+as\s+([\w\s]{2,40})\.?$/i, verb: 'can be defined as' },
  ];

  for (const { re, verb } of defPatterns) {
    for (const s of sentences) {
      const m = s.match(re);
      if (!m) continue;
      const subject = m[1].trim();
      const definition = m[2].trim();
      if (subject.length < 3 || definition.length < 3) continue;
      if (!keywords.some(k => s.toLowerCase().includes(k.toLowerCase()))) continue;
      const wrongDefs = keywords.filter(k =>
        k.toLowerCase() !== definition.toLowerCase() &&
        k.toLowerCase() !== subject.toLowerCase() &&
        !s.toLowerCase().includes(k.toLowerCase())
      );
      const wrong = wrongDefs.find(w => /^[a-z]/i.test(w));
      if (!wrong) continue;
      const isTrue = Math.random() > 0.5;
      const displayedDef = isTrue ? definition : wrong;
      return {
        question: `True or False: ${subject} ${verb} ${displayedDef}.`,
        sentence: s,
        answer: isTrue ? 'True' : 'False',
        correctStatement: `${subject} ${verb} ${definition}.`,
        type: 'truefalse',
      };
    }
  }
  return null;
}

function generateComparison(sentences, keywords) {
  const patterns = [
    /(?:unlike|whereas|in contrast to)\s+([A-Z][\w\s]{2,30}),?\s+([A-Z][\w\s]{2,30})/i,
    /(?:difference|differences?)\s+(?:between|among)\s+([A-Z][\w\s]{2,30})\s+and\s+([A-Z][\w\s]{2,30})/i,
    /([A-Z][\w\s]{2,30})\s+(?:however|but|whereas)\s+([A-Z][\w\s]{2,30})/i,
  ];

  for (const s of sentences) {
    for (const p of patterns) {
      const m = s.match(p);
      if (!m) continue;
      const c1 = m[1].trim();
      const c2 = m[2].trim();
      if (c1.split(/\s+/).length > 6 || c2.split(/\s+/).length > 6) continue;
      return {
        question: `How do "${c1}" and "${c2}" differ?`,
        sentence: s,
        answer: `${c1} and ${c2}`,
        type: 'comparison',
      };
    }
  }

  const relKeywords = keywords.filter(k => /^[a-z]/i.test(k)).slice(0, 6);
  for (let i = 0; i < relKeywords.length; i++) {
    for (let j = i + 1; j < relKeywords.length; j++) {
      const k1 = relKeywords[i];
      const k2 = relKeywords[j];
      const shared = sentences.find(s =>
        s.toLowerCase().includes(k1.toLowerCase()) && s.toLowerCase().includes(k2.toLowerCase())
      );
      if (shared) {
        return {
          question: `How do "${k1}" and "${k2}" relate?`,
          sentence: shared,
          answer: `${k1} and ${k2}`,
          type: 'comparison',
        };
      }
    }
  }

  return null;
}

function pickDistractors(correctWord, allKeywords, count = 3) {
  const others = allKeywords.filter(k => k.toLowerCase() !== correctWord.toLowerCase());
  const sameDomain = [];
  const fallback = [];
  for (const o of others) {
    if (o.length >= 4 && /^[a-z]/i.test(o)) {
      if (Math.abs(o.length - correctWord.length) <= 3) {
        sameDomain.push(o);
      } else {
        fallback.push(o);
      }
    }
  }
  const pool = sameDomain.length >= count ? sameDomain : [...sameDomain, ...fallback];
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  while (selected.length < count) {
    selected.push('concept');
  }
  return selected;
}

function passesQualityFilter(question, sentences, content) {
  if (!question.sentence || question.sentence.replace(/_{2,}/g, '').trim().length < 15) return false;
  const answer = question.answer || '';
  if (answer.length < 3) return false;
  if (question.type === 'cloze' || question.type === 'definition') {
    const answerWords = answer.toLowerCase().split(/\s+/);
    const hasMatch = answerWords.some(w => {
      if (w.length < 3) return false;
      const re = new RegExp(`\\b${escapeRegex(w)}\\b`, 'gi');
      return re.test(content);
    });
    if (!hasMatch) return false;
  }
  return true;
}

function stripSentenceForCloze(sentence, term) {
  const re = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi');
  return sentence.replace(re, '______');
}

function jaccardSimilarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function evaluateFuzzy(userAnswer, correctAnswer) {
  const u = userAnswer.trim();
  const c = correctAnswer.trim();
  if (!u) return { correct: false, feedback: `The answer was: ${c}` };

  if (u.toLowerCase() === c.toLowerCase()) return { correct: true, feedback: 'Correct!' };

  const jaccard = jaccardSimilarity(u, c);
  if (jaccard >= 0.4) return { correct: true, feedback: 'Correct!' };

  const singleWord = u.split(/\s+/).length === 1 && c.split(/\s+/).length === 1;
  if (singleWord) {
    const dist = levenshtein(u.toLowerCase(), c.toLowerCase());
    const maxLen = Math.max(u.length, c.length);
    if (dist / maxLen <= 0.3) return { correct: true, feedback: `Close (typo: "${c}")` };
  }

  const cWords = c.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const uWords = u.toLowerCase().split(/\s+/);
  const matched = cWords.filter(cw => uWords.some(uw => uw.includes(cw) || cw.includes(uw)));
  if (matched.length >= cWords.length * 0.5 && matched.length > 0) {
    return { correct: true, feedback: 'Correct!' };
  }

  return { correct: false, feedback: `The answer was: ${c}` };
}

function generateQuestions(content) {
  const text = stripHtml(content);
  if (!text || text.length < 20) return [];

  const sentences = extractSentences(text);
  const keywords = getKeyphrases(content);
  if (keywords.length < 2) return [];

  const usedWords = new Set();
  const questions = [];

  for (const kw of keywords) {
    if (questions.length >= 3) break;
    const kwLower = kw.toLowerCase();
    if (usedWords.has(kwLower)) continue;

    const kwWords = kwLower.split(/\s+/);
    const sentence = sentences.find(s => {
      const sLower = s.toLowerCase();
      return kwWords.every(w => sLower.includes(w));
    });
    if (!sentence) continue;

    const cloze = generateCloze(sentence, kw);
    if (cloze && passesQualityFilter(cloze, sentences, text)) {
      const distractors = pickDistractors(kw, keywords);
      questions.push({ ...cloze, options: [kw, ...distractors].sort(() => Math.random() - 0.5) });
      usedWords.add(kwLower);
    }
  }

  if (questions.length < 2) {
    const tf = generateTrueFalse(sentences, keywords);
    if (tf && passesQualityFilter(tf, sentences, text)) {
      questions.push({ ...tf, options: ['True', 'False'] });
    }
  }

  if (questions.length < 3) {
    const def = generateDefinition(sentences, keywords);
    if (def && passesQualityFilter(def, sentences, text)) {
      const distractors = pickDistractors(def.answer, keywords);
      questions.push({ ...def, options: [def.answer, ...distractors].sort(() => Math.random() - 0.5) });
    }
  }

  if (questions.length < 4) {
    const rel = generateComparison(sentences, keywords);
    if (rel && passesQualityFilter(rel, sentences, text)) {
      const distractors = pickDistractors(rel.answer, keywords);
      questions.push({ ...rel, options: [rel.answer, ...distractors].sort(() => Math.random() - 0.5) });
    }
  }

  if (questions.length < 2) {
    for (const kw of keywords) {
      if (questions.length >= 5) break;
      const kwLower = kw.toLowerCase();
      if (usedWords.has(kwLower)) continue;
      const kwWords = kwLower.split(/\s+/);
      const sentence = sentences.find(s => kwWords.every(w => s.toLowerCase().includes(w)));
      if (!sentence) continue;
      const q = generateCloze(sentence, kw);
      if (q && passesQualityFilter(q, sentences, text)) {
        const distractors = pickDistractors(kw, keywords);
        questions.push({ ...q, options: [kw, ...distractors].sort(() => Math.random() - 0.5) });
        usedWords.add(kwLower);
      }
    }
  }

  return questions.slice(0, 5);
}

async function generateAIQuestions(content, callAI, signal) {
  const text = stripHtml(content).slice(0, 3000);
  if (!text) return [];

  const raw = await callAI(text, {
    system: 'Generate 5 quiz questions based on this text. Include a mix of fill-in-the-blank, multiple choice (with 4 options), and short answer questions. Each must have a "question", "answer", and optional "options" array. Return ONLY a JSON array of objects.\n\n' +
      'When generating distractors (wrong options), ensure they reflect plausible misreadings of the text — exploit structural asymmetry, ambiguous authorial stance, and domain-specific vocabulary. Do NOT create trivially obvious wrong answers. Distractors should test whether the student truly parsed the text\'s syntactic turbulence, tonal shifts, and unresolved tensions.',
    temperature: 0.4,
    maxTokens: 800,
    signal,
  });
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
}

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem('crescendo-study-sessions') || '[]');
  } catch { return []; }
}

function saveSession(session) {
  const sessions = loadSessions();
  sessions.unshift(session);
  const trimmed = sessions.slice(0, 200);
  localStorage.setItem('crescendo-study-sessions', JSON.stringify(trimmed));
}

export default function useStudyMode() {
  const currentRef = useRef(null);

  const startSession = useCallback((note, callAI) => {
    const content = note?.content || '';
    let questions = null;
    const useAI = !!callAI;

    if (!callAI) {
      questions = generateQuestions(content);
    }

    currentRef.current = {
      note,
      questions,
      useAI,
      callAI,
      content,
      startTime: Date.now(),
      results: [],
    };

    return { questions, useAI };
  }, []);

  const generateWithAI = useCallback(async (signal) => {
    const ctx = currentRef.current;
    if (!ctx || !ctx.callAI || !ctx.content) return [];
    try {
      const questions = await generateAIQuestions(
        ctx.content, ctx.callAI, signal
      );
      ctx.questions = questions;
      return questions;
    } catch {
      ctx.questions = generateQuestions(ctx.content);
      return ctx.questions;
    }
  }, []);

  const submitAnswer = useCallback((questionIdx, userAnswer) => {
    const ctx = currentRef.current;
    if (!ctx || !ctx.questions?.[questionIdx]) return { correct: false, feedback: 'Error' };

    const q = ctx.questions[questionIdx];
      const result = q.type === 'truefalse'
        ? { correct: userAnswer.toLowerCase() === q.answer.toLowerCase(), feedback: userAnswer.toLowerCase() === q.answer.toLowerCase() ? 'Correct!' : `The answer was: ${q.answer}` }
        : q.type === 'comparison'
          ? { correct: true, feedback: 'Good! Understanding these connections helps build knowledge structures.' }
          : evaluateFuzzy(userAnswer, q.answer);
    const elapsed = Math.round((Date.now() - ctx.startTime) / 1000);

    ctx.results.push({
      ...q,
      userAnswer,
      correct: result.correct,
      timeSpent: elapsed,
    });

    return result;
  }, []);

  const recordSession = useCallback((noteId, noteTitle) => {
    const ctx = currentRef.current;
    if (!ctx?.results?.length) return;

    const correct = ctx.results.filter(r => r.correct).length;
    const total = ctx.results.length;
    const duration = Math.round((Date.now() - ctx.startTime) / 1000);

    saveSession({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      noteId,
      noteTitle: noteTitle || 'Untitled',
      date: new Date().toISOString(),
      score: total > 0 ? Math.round((correct / total) * 100) : 0,
      total,
      correct,
      duration,
      questions: ctx.results,
    });
  }, []);

  const getQuestions = useCallback(() => {
    return currentRef.current?.questions || [];
  }, []);

  const getResults = useCallback(() => {
    return currentRef.current?.results || [];
  }, []);

  const getStats = useCallback(() => {
    const sessions = loadSessions();
    const thisWeek = sessions.filter(s => {
      const d = new Date(s.date);
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return d.getTime() > weekAgo;
    });

    const weekSessions = thisWeek.length;
    const totalCorrect = thisWeek.reduce((s, x) => s + x.correct, 0);
    const totalQuestions = thisWeek.reduce((s, x) => s + x.total, 0);
    const weekAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const uniqueNotes = new Set(thisWeek.map(s => s.noteId)).size;
    const totalSessionsAll = sessions.length;

    return {
      weekSessions,
      weekAccuracy,
      uniqueNotes,
      totalSessionsAll,
    };
  }, []);

  const getUseAI = useCallback(() => {
    return currentRef.current?.useAI || false;
  }, []);

  const getNoteHistory = useCallback((noteId) => {
    const sessions = loadSessions();
    return sessions.filter(s => s.noteId === noteId).slice(0, 10);
  }, []);

  return {
    startSession,
    generateWithAI,
    submitAnswer,
    getQuestions,
    getResults,
    recordSession,
    getStats,
    getUseAI,
    getNoteHistory,
  };
}
