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

function extractKeyTerms(text) {
  return text
    .toLowerCase()
    .split(/[,;/\s]+/)
    .filter(t => t.length > 3 && !STOP_WORDS.has(t));
}

function keywordMatch(userText, correctText) {
  const keyTerms = extractKeyTerms(correctText);
  if (keyTerms.length === 0) return userText.length > 0;
  return keyTerms.some(term => userText.toLowerCase().includes(term));
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
      if (question.answers && Array.isArray(question.answers)) {
        const blanks = question.answers;
        const val = userAnswer || {};
        let matched = 0;
        for (let i = 0; i < blanks.length; i++) {
          if (normalizeAnswer(String(val[i] || '')) === normalizeAnswer(String(blanks[i] || ''))) {
            matched++;
          }
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
      // Single blank
      const correct = normalizeAnswer(String(userAnswer || '')) === normalizeAnswer(String(question.correctAnswer || ''));
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

      // 4. Keyword fallback (extract key terms from correct answer)
      const correctText = String(question.correctAnswer || '').trim();
      if (correctText && keywordMatch(userText, correctText)) {
        return { correct: true, marksEarned: maxMarks, maxMarks, feedback: 'Correct!' };
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

      // 4. Keyword fallback
      const correctText = String(question.correctAnswer || '').trim();
      if (correctText && keywordMatch(userText, correctText)) {
        return { correct: true, marksEarned: maxMarks, maxMarks, feedback: 'Correct!' };
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
