// Per-type validation functions for DSE Paper 1 questions.
// All functions are pure — they do NOT mutate inputs. They return
// validation results as new objects via { valid, warnings } or similar.
//
// Per D-08: Post-generation validation layer.
// Per D-05: TFNG NG distribution enforced via validation (reject if insufficient NG).

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectTruncatedStem(stem) {
  const s = (stem || '').trim();
  if (!s || s.length < 10) return false;
  const endsProperly = /[.?!:)]$/.test(s);
  if (endsProperly) return false;
  // Question that doesn't end with ? is likely truncated
  const isQuestion = /^(What|Why|How|Which|Where|When|Who|Do|Does|Is|Are|Can|Should|Would|Could|Find|Give|Name|State|Explain|Describe|Identify|List)/i.test(s);
  if (isQuestion) return true;
  // Ends mid-word or with incomplete sentence
  const lastWord = s.split(/\s+/).pop() || '';
  const lastChar = s.slice(-1);
  if (lastWord.length <= 3 && !/[.?!:]/.test(lastChar)) return true;
  return false;
}

function normalizeText(text) {
  return (text || '').replace(/<[^>]+>/g, '').toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// 1. Per-question validation
// ---------------------------------------------------------------------------

/**
 * Validates a single question's structure and format per its type.
 *
 * @param {Object} q - Question object
 * @returns {{ valid: boolean, warnings: string[], normalized: Object|null }}
 *   normalized is the question with fixes applied, or null if unrecoverable.
 */
export function validateQuestion(q) {
  if (!q || typeof q !== 'object') {
    return { valid: false, warnings: ['Question is null or not an object'], normalized: null };
  }

  const warnings = [];
  const type = (q.type || '').trim().toLowerCase();
  const stem = (q.stem || '').trim();
  const answer = (q.correctAnswer || '').trim();
  let normalized = { ...q };

  // --- Stem checks ---
  if (!stem) {
    warnings.push('Stem is empty');
  } else if (stem.length < 5) {
    warnings.push('Stem is too short (< 5 chars)');
  } else if (detectTruncatedStem(stem)) {
    warnings.push('Stem appears truncated');
    normalized.stemTruncated = true;
  }

  // --- Answer checks ---
  if (!answer) {
    normalized.answerUnknown = true;
  }

  // --- Type-specific format checks ---
  switch (type) {
    case 'mcq': {
      // Answer must be a single letter A-D
      if (answer && !/^[A-D]$/i.test(answer)) {
        warnings.push('MCQ correctAnswer should be a single letter (A-D)');
      }
      // Options must be 4 items with labels
      const opts = normalized.options || [];
      if (opts.length !== 4) {
        warnings.push(`MCQ should have exactly 4 options, got ${opts.length}`);
      }
      const hasLabels = opts.every(o => o && /^[A-D]$/i.test(String(o.label || '').trim()));
      if (opts.length > 0 && !hasLabels) {
        warnings.push('MCQ options should have A/B/C/D labels');
      }
      break;
    }

    case 'tfng': {
      // Answer must be T/F/NG (single letter)
      if (answer && !/^(T|F|NG|True|False|Not Given)$/i.test(answer)) {
        warnings.push('TFNG correctAnswer should be T, F, or NG');
      }
      // Stem must be a statement, not a question
      if (stem.endsWith('?')) {
        warnings.push('TFNG stem is a question — should be a declarative statement');
      }
      break;
    }

    case 'gap-fill': {
      // Answer either single string or answers array
      if (normalized.answers && Array.isArray(normalized.answers)) {
        if (normalized.answers.length === 0) {
          warnings.push('Gap-fill answers array is empty');
        }
      } else if (answer) {
        const words = answer.split(/[,;]/).map(s => s.trim()).filter(Boolean);
        if (words.length === 0) {
          warnings.push('Gap-fill correctAnswer has no words');
        }
      } else {
        warnings.push('Gap-fill has no correctAnswer or answers array');
      }
      break;
    }

    case 'short-answer': {
      if (answer) {
        const wordCount = answer.split(/\s+/).filter(Boolean).length;
        if (wordCount > 30) {
          warnings.push(`Short-answer is too long (${wordCount} words, max 30)`);
        }
      }
      break;
    }

    case 'matching':
    case 'semantic-connect': {
      const pairs = normalized.pairs || [];
      const opts = normalized.options || [];
      if (pairs.length < 3) {
        warnings.push(`${type} should have at least 3 pairs, got ${pairs.length}`);
      }
      if (opts.length < 2) {
        warnings.push(`${type} should have at least 2 options, got ${opts.length}`);
      }
      break;
    }

    case 'summary-cloze': {
      if (normalized.answers && Array.isArray(normalized.answers)) {
        if (normalized.answers.length === 0) {
          warnings.push('Summary-cloze answers array is empty');
        }
      } else {
        warnings.push('Summary-cloze should have an answers array');
      }
      break;
    }

    case 'pronoun-ref': {
      if (!answer && !normalized.acceptableAnswers) {
        warnings.push('Pronoun-ref question should have a correctAnswer or acceptableAnswers');
      }
      break;
    }

    case 'open-ended': {
      // Open-ended has no strict answer format, but should have explanation
      break;
    }

    default: {
      warnings.push(`Unknown question type: "${type}"`);
      normalized.answerUnknown = true;
      break;
    }
  }

  // --- Marks check ---
  const marks = normalized.marks || 1;
  if (!Number.isInteger(marks) || marks < 1 || marks > 3) {
    warnings.push(`Marks should be integer 1-3, got ${marks}`);
  }

  // --- Rubric check for marks ≥2 ---
  if (marks >= 2 && !normalized.rubric) {
    warnings.push(`Missing rubric for ${marks}-mark question`);
  } else if (marks >= 2 && normalized.rubric) {
    if (!normalized.rubric.requiredPoints || !Array.isArray(normalized.rubric.requiredPoints) || normalized.rubric.requiredPoints.length === 0) {
      warnings.push('Rubric should have non-empty requiredPoints array');
    }
  }

  // --- Explanation check (warning only) ---
  if (!normalized.explanation) {
    warnings.push('No explanation provided');
  }

  // --- Fix rubric for marks ≥2 if missing (auto-fill to avoid retries) ---
  if (marks >= 2 && !normalized.rubric) {
    normalized.rubric = { requiredPoints: ['see answer key'], unacceptableAnswers: [] };
  }

  return {
    valid: warnings.length === 0,
    warnings,
    normalized,
  };
}

// ---------------------------------------------------------------------------
// 2. MCQ distractor validation
// ---------------------------------------------------------------------------

/**
 * Validates MCQ distractors: labels, word overlap, negation traps.
 *
 * @param {Object[]} mcqQuestions - Array of MCQ question objects
 * @returns {{ valid: boolean, warnings: string[] }}
 */
export function validateDistractors(mcqQuestions) {
  const warnings = [];

  for (const q of (mcqQuestions || [])) {
    const opts = q.options || [];
    if (opts.length < 2) continue;

    const id = q.id || '?';

    // Check labels
    const labels = opts.map(o => (o.label || '').trim().toUpperCase()).filter(Boolean);
    const expectedLabels = ['A', 'B', 'C', 'D'].slice(0, opts.length);
    if (JSON.stringify(labels) !== JSON.stringify(expectedLabels)) {
      warnings.push(`Q${id}: Option labels should be ${expectedLabels.join('/')}, got ${labels.join(',') || 'none'}`);
    }

    // Check word overlap < 60% between any two options
    for (let i = 0; i < opts.length; i++) {
      for (let j = i + 1; j < opts.length; j++) {
        const a = (opts[i].text || '').toLowerCase().split(/\s+/).filter(Boolean);
        const b = (opts[j].text || '').toLowerCase().split(/\s+/).filter(Boolean);
        if (a.length < 2 || b.length < 2) continue;
        const setB = new Set(b);
        const overlap = a.filter(w => setB.has(w)).length;
        const overlapRate = overlap / Math.min(a.length, b.length);
        if (overlapRate > 0.6) {
          warnings.push(`Q${id}: Overlapping distractors (${Math.round(overlapRate * 100)}% word overlap between "${opts[i].label}" and "${opts[j].label}")`);
        }
      }
    }

    // Check no option is a direct negation of the correct answer
    const correctOpt = q.correctAnswer ? opts.find(o => (o.label || '').toUpperCase() === q.correctAnswer.toUpperCase()) : null;
    if (correctOpt && correctOpt.text) {
      const correctText = correctOpt.text.toLowerCase().trim();
      for (const opt of opts) {
        if ((opt.label || '').toUpperCase() === (q.correctAnswer || '').toUpperCase()) continue;
        const optText = (opt.text || '').toLowerCase().trim();
        // Check if the option is a direct negation of the correct answer
        if (
          optText === 'not ' + correctText ||
          optText === 'no ' + correctText ||
          correctText.startsWith(optText.replace(/^not /, '')) ||
          optText.startsWith('not ' + correctText)
        ) {
          warnings.push(`Q${id}: Option "${opt.label}" appears to be a direct negation of the correct answer`);
        }
      }
    }
  }

  return { valid: warnings.length === 0, warnings };
}

// ---------------------------------------------------------------------------
// 3. TFNG distribution validation
// ---------------------------------------------------------------------------

/**
 * Validates TFNG NG answer distribution. If needsFix is true, the caller
 * should regenerate rather than post-process (per D-05).
 *
 * @param {Object[]} questions - All questions (filters internally for TFNG)
 * @returns {{ valid: boolean, warnings: string[], needsFix: boolean }}
 */
export function validateTFNGDistribution(questions) {
  const warnings = [];
  const tfng = (questions || []).filter(q => (q.type || '').trim().toLowerCase() === 'tfng');

  if (tfng.length === 0) {
    return { valid: true, warnings: [], needsFix: false };
  }

  const ngCount = tfng.filter(q => /^ng$/i.test((q.correctAnswer || '').trim())).length;

  if (tfng.length >= 4 && ngCount < 2) {
    warnings.push(`Need at least 2 NG answers in ${tfng.length} TFNG, got ${ngCount}`);
  } else if (tfng.length >= 2 && ngCount === 0) {
    warnings.push(`Need at least 1 NG answer in ${tfng.length} TFNG, got 0`);
  }

  const needsFix = warnings.length > 0;

  return {
    valid: !needsFix,
    warnings,
    needsFix,
  };
}

// ---------------------------------------------------------------------------
// 4. Type consistency across all questions
// ---------------------------------------------------------------------------

/**
 * Cross-type consistency checks: diversity, paragraph distribution,
 * stem copy detection, truncation references.
 *
 * @param {Object[]} questions - All question objects
 * @returns {{ valid: boolean, warnings: string[] }}
 */
export function validateTypeConsistency(questions) {
  const warnings = [];

  if (!questions?.length) {
    return { valid: false, warnings: ['No questions to validate'] };
  }

  // 1. Type diversity: at least 4 unique types
  const typeSet = new Set(questions.map(q => (q.type || '').trim().toLowerCase()).filter(Boolean));
  if (typeSet.size < 4) {
    warnings.push(`Low type diversity: ${typeSet.size}/4 types (need at least 4, got: ${[...typeSet].join(', ')})`);
  }

  // 2. Paragraph distribution: at least 30% from second half
  const withRef = questions.filter(q => Number.isFinite(q.paragraphRef));
  if (withRef.length >= 5) {
    const maxPara = Math.max(...withRef.map(q => q.paragraphRef));
    if (maxPara > 1) {
      const mid = maxPara / 2;
      const secondHalf = withRef.filter(q => q.paragraphRef > mid).length;
      const rate = secondHalf / withRef.length;
      if (rate < 0.3) {
        warnings.push(`Uneven paragraph distribution: ${Math.round(rate * 100)}% from second half (need ≥30%)`);
      }
    }
  }

  // 3. Stem copy detection: check if stem is a direct lift from passage
  // (passage-independent check — detects stems that are too close to generic
  // passage-like language or self-referential)
  for (const q of questions) {
    const stem = (q.stem || '').trim();
    // Check for truncation self-references (these are always invalid)
    const truncationPatterns = /cut.?off|truncated|incomplete|cuts? off|ends? abrupt/i;
    const selfRefPatterns = /passage|text|section|above|reading|this (article|excerpt)/i;
    const stemAndExp = stem + ' ' + (q.explanation || '');
    if (truncationPatterns.test(stemAndExp) && selfRefPatterns.test(stemAndExp)) {
      warnings.push(`Q${q.id || '?'}: References non-existent truncation or missing content`);
    }
  }

  return { valid: warnings.length === 0, warnings };
}

// ---------------------------------------------------------------------------
// 5. Composite validator
// ---------------------------------------------------------------------------

/**
 * Runs all validators on the question set and returns composite results.
 *
 * @param {Object[]} questions - Array of question objects
 * @param {string} passagePlain - Plain-text passage for stem copy checks
 * @returns {{ valid: boolean, warnings: string[], questionResults: Array<{ id: number|string, valid: boolean, warnings: string[] }> }}
 */
export function validateQuestions(questions, passagePlain) {
  if (!questions?.length) {
    return { valid: false, warnings: ['No questions to validate'], questionResults: [] };
  }

  const allWarnings = [];

  // 1. Per-question validation
  const questionResults = questions.map(q => {
    const result = validateQuestion(q);
    if (!result.valid && result.warnings.length > 0) {
      allWarnings.push(...result.warnings.map(w => `Q${q.id || '?'}: ${w}`));
    }
    return {
      id: q.id,
      valid: result.valid,
      warnings: result.warnings,
    };
  });

  // 2. Distractor validation for MCQ questions
  const mcqQuestions = questions.filter(q => (q.type || '').trim().toLowerCase() === 'mcq');
  if (mcqQuestions.length > 0) {
    const distractorResult = validateDistractors(mcqQuestions);
    if (!distractorResult.valid) {
      allWarnings.push(...distractorResult.warnings);
    }
  }

  // 3. TFNG distribution validation
  const tfngResult = validateTFNGDistribution(questions);
  if (!tfngResult.valid) {
    allWarnings.push(...tfngResult.warnings);
  }

  // 4. Type consistency validation
  const consistencyResult = validateTypeConsistency(questions);
  if (!consistencyResult.valid) {
    allWarnings.push(...consistencyResult.warnings);
  }

  // 5. Passage-specific stem copy check (only if passage provided)
  if (passagePlain) {
    const lowerPassage = normalizeText(passagePlain);
    for (const q of questions) {
      const stem = (q.stem || '').trim();
      const clean = stem.replace(/_{2,}|__|\?{2,}/g, '').toLowerCase().trim();
      if (clean.length > 25 && lowerPassage.includes(clean)) {
        allWarnings.push(`Q${q.id || '?'}: Stem appears to be a direct passage copy ("${clean.slice(0, 40)}...")`);
      }
      if (q.context) {
        const ctx = q.context.replace(/_{2,}/g, '').toLowerCase().trim();
        if (ctx.length > 25 && lowerPassage.includes(ctx)) {
          allWarnings.push(`Q${q.id || '?'}: Context is a direct passage copy`);
        }
      }
    }
  }

  return {
    valid: allWarnings.length === 0,
    warnings: allWarnings,
    questionResults,
  };
}
