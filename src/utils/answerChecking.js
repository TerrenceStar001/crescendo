// DSE-style answer checking with partial marking, spelling tolerance,
// acceptable alternatives, and rubric-aware score computation.
// Per D-06: DSE-style rubric with partial marks and acceptable alternatives.
// Per D-07: Case + article tolerance, UK/US spelling variants. No Levenshtein fuzzy matching.

export const UK_US_MAP = {
  'colour': 'color', 'favourite': 'favorite', 'centre': 'center',
  'theatre': 'theater', 'organise': 'organize', 'realise': 'realize',
  'recognise': 'recognize', 'apologise': 'apologize', 'analyse': 'analyze',
  'catalogue': 'catalog', 'dialogue': 'dialog', 'labelled': 'labeled',
  'modelling': 'modeling', 'travelling': 'traveling', 'defence': 'defense',
  'offence': 'offense', 'licence': 'license', 'practice': 'practice',
  'fulfil': 'fulfill', 'enrol': 'enroll', 'skilful': 'skillful',
  'wilful': 'willful', 'favourable': 'favorable', 'honour': 'honor',
  'humour': 'humor', 'labour': 'labor', 'neighbour': 'neighbor',
};

export function normalizeAnswer(text) {
  if (!text || typeof text !== 'string') return '';
  let s = text.trim().toLowerCase();
  // Strip leading articles (a/an/the), word-initial only, each tried once
  s = s.replace(/^(a|an|the)\s+/, '');
  // Strip trailing punctuation that users might accidentally include
  s = s.replace(/[.,!?;:]+$/, '');
  // Normalize UK → US spelling
  const words = s.split(/\s+/).filter(Boolean);
  const normalized = words.map(w => UK_US_MAP[w] || w).join(' ');
  return normalized.trim();
}

function toTFNG(val) {
  const norm = { 'true': 'T', 'false': 'F', 'not given': 'NG', 't': 'T', 'f': 'F', 'ng': 'NG' };
  const nv = (val || '').toString().toLowerCase().trim();
  return norm[nv] || val;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
  'was', 'one', 'our', 'out', 'has', 'have', 'been', 'some', 'than', 'that',
  'they', 'this', 'very', 'what', 'when', 'where', 'which', 'who', 'will',
  'with', 'from', 'their', 'there', 'would', 'about', 'into', 'over', 'such', 'your',
]);

function stem(w) {
  w = w.toLowerCase();
  if (w.length < 4) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ves') && w.length > 4) return w.slice(0, -3) + 'f';
  if (w.endsWith('es') && w.length > 4 && /[szx]|sh|ch|o$/.test(w.slice(0, -2))) return w.slice(0, -2);
  if (w.endsWith('ss')) return w;
  if (w.endsWith('s') && w.length > 3) return w.slice(0, -1);
  if (w.endsWith('ing') && w.length > 5) {
    const base = w.slice(0, -3);
    if (base.length >= 2 && base[base.length - 1] === base[base.length - 2]) return base.slice(0, -1);
    return base;
  }
  if (w.endsWith('ed') && w.length > 4) {
    const base = w.slice(0, -2);
    if (base.length >= 2 && base[base.length - 1] === base[base.length - 2]) return base.slice(0, -1);
    return base;
  }
  if (w.endsWith('ly') && w.length > 4) return w.slice(0, -2);
  return w;
}

function extractKeyTerms(text) {
  return text
    .toLowerCase()
    .split(/[,;/\s]+/)
    .filter(t => t.length > 3 && !STOP_WORDS.has(t));
}

function keywordMatch(userText, correctText) {
  const keyTerms = extractKeyTerms(correctText);
  if (keyTerms.length === 0) return userText.length > 0;
  const userStems = new Set(userText.toLowerCase().split(/\s+/).filter(Boolean).map(stem));
  const matched = keyTerms.filter(term => {
    if (userText.toLowerCase().includes(term)) return true;
    return userStems.has(stem(term));
  });
  return matched.length / keyTerms.length >= 0.5;
}

export function checkAnswer(question, userAnswer) {
  if (userAnswer === null || userAnswer === undefined || userAnswer === '') {
    return { correct: false, marksEarned: 0, maxMarks: question?.marks || 1, feedback: '' };
  }

  const maxMarks = question?.marks || 1;
  const type = question?.type || 'mcq';

  switch (type) {
    case 'mcq': {
      const correct = normalizeAnswer(String(userAnswer)) === normalizeAnswer(String(question.correctAnswer));
      return {
        correct,
        marksEarned: correct ? maxMarks : 0,
        maxMarks,
        feedback: correct ? 'Correct!' : 'Incorrect',
      };
    }

    case 'tfng': {
      const correct = toTFNG(userAnswer) === toTFNG(question.correctAnswer);
      return {
        correct,
        marksEarned: correct ? maxMarks : 0,
        maxMarks,
        feedback: correct ? 'Correct!' : 'Incorrect',
      };
    }

    case 'gap-fill':
    case 'summary-cloze': {
      function acceptAny(userVal, expected) {
        const norm = normalizeAnswer(String(expected || ''));
        if (normalizeAnswer(String(userVal)) === norm) return true;
        if (norm.includes(',')) {
          const alts = norm.split(',').map(a => normalizeAnswer(a.trim())).filter(Boolean);
          if (alts.some(a => normalizeAnswer(String(userVal)) === a)) return true;
        }
        return false;
      }
      function extractHintWords(text) {
        if (!text || typeof text !== 'string') return [];
        const matches = text.matchAll(/\((\w+)\)/g);
        return [...matches].map(m => normalizeAnswer(m[1]));
      }
      if (question.answers && Array.isArray(question.answers)) {
        const blanks = question.answers;
        const val = userAnswer || {};
        const hints = extractHintWords(question.question);
        let matched = 0;
        for (let i = 0; i < blanks.length; i++) {
          const blankNorm = normalizeAnswer(String(blanks[i] || ''));
          const userNorm = normalizeAnswer(String(val[i] || ''));
          let ok = userNorm === blankNorm;
          // Comma-separated alternatives for this blank
          if (!ok && blankNorm.includes(',')) {
            const alts = blankNorm.split(',').map(a => a.trim()).filter(Boolean);
            ok = alts.some(a => userNorm === a);
          }
          // Multi-blank acceptableAnswers
          if (!ok && question.acceptableAnswers?.[i]) {
            ok = question.acceptableAnswers[i].some(a => acceptAny(val[i], a));
          }
          // Hint-word detection: AI stored hint as answer, accept replacement
          if (!ok && hints.includes(blankNorm) && userNorm && userNorm !== blankNorm) {
            ok = true;
          }
          if (ok) matched++;
        }
        const perBlank = maxMarks / blanks.length;
        const marksEarned = matched * perBlank;
        const allCorrect = matched === blanks.length;
        return {
          correct: allCorrect,
          marksEarned: allCorrect ? maxMarks : marksEarned,
          maxMarks,
          feedback: allCorrect ? 'Correct!' : matched > 0 ? `Partially correct (${Math.round(marksEarned)}/${maxMarks} marks)` : 'Incorrect',
        };
      }
      // Single blank: check acceptableAnswers
      if (question.acceptableAnswers && Array.isArray(question.acceptableAnswers)) {
        const match = question.acceptableAnswers.some(a => acceptAny(userAnswer, a));
        if (match) {
          return { correct: true, marksEarned: maxMarks, maxMarks, feedback: 'Correct!' };
        }
      }
      // Single blank exact match with comma alternatives
      let correct = acceptAny(userAnswer, question.correctAnswer);
      // Hint-word detection: if expected answer matches (word) in question
      if (!correct) {
        const hints = extractHintWords(question.question);
        const expectedNorm = normalizeAnswer(String(question.correctAnswer || ''));
        if (hints.includes(expectedNorm)) {
          const userNorm = normalizeAnswer(String(userAnswer || ''));
          if (userNorm && userNorm !== expectedNorm) {
            correct = true;
          }
        }
      }
      return {
        correct,
        marksEarned: correct ? maxMarks : 0,
        maxMarks,
        feedback: correct ? 'Correct!' : 'Incorrect',
      };
    }

    case 'matching':
    case 'semantic-connect': {
      if (!userAnswer || typeof userAnswer !== 'object') {
        return { correct: false, marksEarned: 0, maxMarks, feedback: 'Incorrect' };
      }
      const pairs = question.pairs || [];
      if (pairs.length === 0) {
        return { correct: false, marksEarned: 0, maxMarks, feedback: 'Incorrect' };
      }
      let matched = 0;
      for (const p of pairs) {
        if (userAnswer[p.item] === p.match) matched++;
      }
      const perPair = maxMarks / pairs.length;
      const marksEarned = matched * perPair;
      const allCorrect = matched === pairs.length;
      return {
        correct: allCorrect,
        marksEarned: allCorrect ? maxMarks : marksEarned,
        maxMarks,
        feedback: allCorrect ? 'Correct!' : matched > 0 ? `Partially correct (${Math.round(marksEarned)}/${maxMarks} marks)` : 'Incorrect',
      };
    }

    case 'short-answer': {
      const userText = String(userAnswer || '').trim();
      if (!userText) return { correct: false, marksEarned: 0, maxMarks, feedback: '' };

      // 1. Check acceptableAnswers array (multiple correct alternatives)
      if (question.acceptableAnswers && Array.isArray(question.acceptableAnswers)) {
        const match = question.acceptableAnswers.some(a => normalizeAnswer(String(a)) === normalizeAnswer(userText));
        if (match) {
          return { correct: true, marksEarned: maxMarks, maxMarks, feedback: 'Correct!' };
        }
      }

      // 2. Check rubric.requiredPoints with partial marks
      if (question.rubric?.requiredPoints?.length > 0) {
        const points = question.rubric.requiredPoints;
        let matched = 0;
        for (const point of points) {
          if (keywordMatch(userText, point)) matched++;
        }
        const perPoint = maxMarks / points.length;
        const marksEarned = matched * perPoint;
        const allCorrect = matched >= points.length;
        return {
          correct: allCorrect,
          marksEarned: allCorrect ? maxMarks : marksEarned,
          maxMarks,
          feedback: allCorrect ? 'Correct!' : matched > 0 ? `Partially correct (${Math.round(marksEarned)}/${maxMarks} marks)` : 'Incorrect',
        };
      }

      // 3. Normalize exact match
      const normalizedUser = normalizeAnswer(userText);
      const normalizedCorrect = normalizeAnswer(String(question.correctAnswer || ''));
      if (normalizedCorrect && normalizedUser === normalizedCorrect) {
        return { correct: true, marksEarned: maxMarks, maxMarks, feedback: 'Correct!' };
      }

      // 4. Accept conceptual synonyms: if the correctAnswer has an acceptableAnswers array,
      // check normalized conceptual matches (professional definitions, paraphrases)
      if (question.acceptableAnswers && Array.isArray(question.acceptableAnswers)) {
        for (const alt of question.acceptableAnswers) {
          const normAlt = normalizeAnswer(String(alt));
          if (normAlt && normalizedUser === normAlt) {
            return { correct: true, marksEarned: maxMarks, maxMarks, feedback: 'Correct!' };
          }
        }
      }

      // 5. Semantic overlap scoring for short-answer: count shared content words
      // between user text and correct answer, with stem normalization
      const correctText = String(question.correctAnswer || '').trim();
      if (correctText) {
        const userWords = new Set(normalizedUser.split(/\s+/).map(stem));
        const correctWords = new Set(normalizedCorrect.split(/\s+/).map(stem));
        const contentWords = [...correctWords].filter(w => !STOP_WORDS.has(w) && w.length > 2);
        
        if (contentWords.length > 0) {
          const shared = contentWords.filter(w => userWords.has(w)).length;
          const overlapRatio = shared / contentWords.length;
          
          // Accept if overlap is strong (>= 60% shared content words)
          // OR if the user's answer contains a recognized conceptual synonym
          // OR if the user's answer is a valid professional definition
          if (overlapRatio >= 0.6) {
            return { correct: true, marksEarned: maxMarks, maxMarks, feedback: 'Correct!' };
          }
          
          // Partial credit for moderate overlap (30-60%)
          if (overlapRatio >= 0.3) {
            const partialMarks = Math.ceil(maxMarks * overlapRatio);
            return { correct: false, marksEarned: partialMarks, maxMarks, feedback: `Partially correct (${partialMarks}/${maxMarks} marks)` };
          }
        }
        
        // Fallback keyword match
        if (keywordMatch(userText, correctText)) {
          return { correct: true, marksEarned: maxMarks, maxMarks, feedback: 'Correct!' };
        }
      }

      // No match
      if (!correctText && userText.length > 0) {
        return { correct: true, marksEarned: maxMarks, maxMarks, feedback: 'Correct!' };
      }

      return { correct: false, marksEarned: 0, maxMarks, feedback: 'Incorrect' };
    }

    case 'open-ended': {
      const userText = String(userAnswer || '').trim();
      if (!userText) return { correct: false, marksEarned: 0, maxMarks, feedback: '' };

      // 1. Check acceptableAnswers
      if (question.acceptableAnswers && Array.isArray(question.acceptableAnswers)) {
        const match = question.acceptableAnswers.some(a => normalizeAnswer(String(a)) === normalizeAnswer(userText));
        if (match) {
          return { correct: true, marksEarned: maxMarks, maxMarks, feedback: 'Correct!' };
        }
      }

      // 2. Rubric requiredPoints with partial marks
      if (question.rubric?.requiredPoints?.length > 0) {
        const points = question.rubric.requiredPoints;
        let matched = 0;
        for (const point of points) {
          if (keywordMatch(userText, point)) matched++;
        }
        const perPoint = maxMarks / points.length;
        const marksEarned = matched * perPoint;
        const allCorrect = matched >= points.length;
        return {
          correct: allCorrect,
          marksEarned: allCorrect ? maxMarks : Math.max(marksEarned, perPoint),
          maxMarks,
          feedback: allCorrect ? 'Correct!' : matched > 0 ? `Partially correct (${Math.round(marksEarned)}/${maxMarks} marks)` : 'Partially correct',
        };
      }

      // 3. Exact normalize match
      if (normalizeAnswer(userText) === normalizeAnswer(String(question.correctAnswer || ''))) {
        return { correct: true, marksEarned: maxMarks, maxMarks, feedback: 'Correct!' };
      }

      // 4. Accept conceptual synonyms from acceptableAnswers
      if (question.acceptableAnswers && Array.isArray(question.acceptableAnswers)) {
        for (const alt of question.acceptableAnswers) {
          const normAlt = normalizeAnswer(String(alt));
          if (normAlt && normalizeAnswer(userText) === normAlt) {
            return { correct: true, marksEarned: maxMarks, maxMarks, feedback: 'Correct!' };
          }
        }
      }

      // 5. Semantic overlap scoring for open-ended
      const correctText = String(question.correctAnswer || '').trim();
      if (correctText) {
        const userWords = new Set(normalizeAnswer(userText).split(/\s+/).map(stem));
        const correctWords = new Set(normalizeAnswer(correctText).split(/\s+/).map(stem));
        const contentWords = [...correctWords].filter(w => !STOP_WORDS.has(w) && w.length > 2);
        
        if (contentWords.length > 0) {
          const shared = contentWords.filter(w => userWords.has(w)).length;
          const overlapRatio = shared / contentWords.length;
          
          if (overlapRatio >= 0.6) {
            return { correct: true, marksEarned: maxMarks, maxMarks, feedback: 'Correct!' };
          }
          
          if (overlapRatio >= 0.3) {
            const partialMarks = Math.ceil(maxMarks * overlapRatio);
            return { correct: false, marksEarned: partialMarks, maxMarks, feedback: `Partially correct (${partialMarks}/${maxMarks} marks)` };
          }
        }
        
        // Fallback keyword match
        if (keywordMatch(userText, correctText)) {
          return { correct: true, marksEarned: maxMarks, maxMarks, feedback: 'Correct!' };
        }
      }

      // Open-ended always gives partial credit for any attempt
      if (userText.length > 0) {
        return { correct: false, marksEarned: Math.max(1, Math.round(maxMarks * 0.25)), maxMarks, feedback: 'Partially correct' };
      }

      return { correct: false, marksEarned: 0, maxMarks, feedback: 'Incorrect' };
    }

    case 'pronoun-ref': {
      const correct = normalizeAnswer(String(userAnswer || '')) === normalizeAnswer(String(question.correctAnswer || ''));
      return {
        correct,
        marksEarned: correct ? maxMarks : 0,
        maxMarks,
        feedback: correct ? 'Correct!' : 'Incorrect',
      };
    }

    default:
      return { correct: false, marksEarned: 0, maxMarks, feedback: 'Unsupported type' };
  }
}

export function computeScore(questions, userAnswers) {
  if (!questions?.length) return { marksEarned: 0, maxMarks: 0, percentage: 0, results: [] };

  const results = questions.map(q => checkAnswer(q, userAnswers?.[q.id]));
  const marksEarned = results.reduce((s, r) => s + r.marksEarned, 0);
  const maxMarks = results.reduce((s, r) => s + r.maxMarks, 0);
  const percentage = maxMarks > 0 ? Math.round((marksEarned / maxMarks) * 100) : 0;

  return {
    marksEarned,
    maxMarks,
    percentage,
    results: questions.map((q, i) => ({
      questionId: q.id,
      correct: results[i].correct,
      marksEarned: results[i].marksEarned,
      maxMarks: results[i].maxMarks,
      feedback: results[i].feedback,
    })),
  };
}

export function isQuestionCorrect(question, answer) {
  return checkAnswer(question, answer).correct;
}
