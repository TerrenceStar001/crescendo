// Per-type AI prompt template builders for DSE Paper 1 question generation.
// Each function returns a format-specific instruction fragment for a
// single question type. composeFullPrompt assembles them into a complete
// AI generation prompt.
//
// Per D-08: Separate AI prompts for each question type + post-generation validation.
// Per D-05: TFNG NG constraint during generation (not post-processing).

import { COGNITIVE_TRAP_TYPES } from './questionTypes';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const SKILL_TYPES_DEFINITIONS = `
SKILL TESTED — The "skillTested" field is SEPARATE from type. Choose one per question:
- mainIdea: understanding the overall argument/purpose
- detail: recalling specific facts
- inference: reading between the lines
- vocabInContext: word meaning from context
- tone: identifying the author's attitude
- purpose: why something is mentioned
`;

const TYPE_DEFINITIONS = `
CRITICAL — The "type" field MUST be exactly one of these 9 values (no alternatives):
- "mcq" — multiple choice with 4 labelled options (A/B/C/D)
- "tfng" — True / False / Not Given (stem must be a STATEMENT, not a question)
- "gap-fill" — fill in the blank with word(s) from the passage
- "short-answer" — answer with a word/phrase from the passage
- "matching" — match items from two columns (minimum 3 pairs). REQUIRES: "pairs" array [{"item": "1", "match": "C"}, {"item": "2", "match": "A"}, {"item": "3", "match": "B"}] and "options" array [{"label": "A", "text": "description"}, {"label": "B", "text": "description"}, {"label": "C", "text": "description"}]
- "open-ended" — explain or give an opinion (no single correct answer)
- "summary-cloze" — fill in numbered blanks from a table summarizing multiple paragraphs
- "pronoun-ref" — "What does [word] in paragraph X refer to?"
- "semantic-connect" — match causes to effects, or claims to evidence (include pairs and options)
`;

const SHARED_JSON_FORMAT = `
For each question output this JSON:
{
  "stem": "question text or statement",
  "type": "mcq | tfng | gap-fill | short-answer | matching | open-ended | summary-cloze | pronoun-ref | semantic-connect",
  "skillTested": "mainIdea | detail | inference | vocabInContext | tone | purpose",
  "paragraphRef": integer (the paragraph number this question targets; 1 = first paragraph),
  "marks": integer (1-3),
  "options": [{"label": "A", "text": "option text"}],
  "pairs": [{"item": "1", "match": "C"}, {"item": "2", "match": "A"}],
  "rubric": { "requiredPoints": ["..."], "unacceptableAnswers": ["..."] },
  "correctAnswer": "the answer",
  "explanation": "explain with passage reference"
}

Return ONLY a valid JSON array. No other text. No comments, no trailing commas, no JavaScript syntax. Every string must be double-quoted. Every object in the array must be comma-separated.
`;

const SHARED_RULES = `
DISTRIBUTION RULES: Distribute questions evenly across the entire passage -- use the paragraphRef field to indicate which paragraph each question targets. At least 30% of questions must target the second half of the passage.

PARAPHRASE RULES: Do NOT copy exact sentences from the passage into question stems, TFNG statements, or gap-fill context. Paraphrase and rephrase to test comprehension, not visual pattern-matching. For gap-fill, the blank word must NOT appear verbatim in the immediately adjacent text -- the student must understand meaning, not spot the word.

TRUNCATION RULES: The words "truncated", "cut off", "incomplete", "missing", "not shown", "not included", "before the passage", "after the passage" are BANNED in stems and explanations. If any of these words appear, the question is automatically rejected. The passage is COMPLETE and fully visible -- every question must be answerable from the provided text.

SUMMARY CONTRAST RULE (2-Mark Questions):
- When generating a 2-mark contrast question, the rubric.requiredPoints must be binary-mapped: exactly TWO distinct elements, each worth 1 mark.
- Each requiredPoint must describe ONE side of the contrast independently. E.g., for "contrast the interior and exterior", requiredPoints = ["interior characteristic", "exterior characteristic"].
- The grading engine evaluates each requiredPoint independently. A student who identifies only one side of the contrast gets 1/2 marks.
- Do NOT collapse both sides of a contrast into a single requiredPoint. This is the most common grading failure -- always split contrasts into separate requiredPoints.

CONCISENESS RULE (CRITICAL): Keep each question extremely short. Each question object must average <=500 characters total. Explanations: max 1 sentence. Option texts: max 8 words each. Marks: omit rubric for 1-mark questions. Tight stems only -- no fluff.
`;

// ---------------------------------------------------------------------------
// Per-type prompt builders
// ---------------------------------------------------------------------------

/**
 * Build prompt section for MCQ generation.
 * @param {number} numQuestions - Total questions being generated
 * @param {string} part - Part identifier ('A', 'B1', 'B2')
 * @returns {string} Prompt section for MCQ rules
 */
export function buildMCQPrompt(numQuestions, part) {
  const trapExamples = COGNITIVE_TRAP_TYPES.map(t =>
    `  * ${t.id}: ${t.description}`
  ).join('\n');

  return `
MCQ & DISTRACTOR DESIGN (The Distractor Engine):
- The stem MUST be a QUESTION ending with a question mark (?) — NOT a statement. Statements should use "tfng" type instead.
- Exactly 4 labelled options (A/B/C/D).
- Only ONE option can be correct. The other three must be "plausible but partial" — 100% true from a different section of the text, but incorrect for this specific question.
- Design each distractor as one of these ${COGNITIVE_TRAP_TYPES.length} cognitive trap types:
${trapExamples}
- Each distractor must share FEWER THAN 60% of its words with any other option.
- Do NOT use direct negations of the correct answer as a distractor (opposite traps are banned).
`;
}

/**
 * Build prompt section for TFNG generation.
 * @param {number} numQuestions - Total questions being generated
 * @returns {string} Prompt section for TFNG rules
 */
export function buildTFNGPrompt(numQuestions) {
  const ngConstraint = numQuestions >= 4
    ? 'If you include 4+ TFNG questions, at least 2 MUST be "NG". If 2–3 TFNG, at least 1 MUST be "NG".'
    : 'If you include 2–3 TFNG questions, at least 1 MUST be "NG".';

  return `
TFNG RULES (Binary Overhaul):
- The stem MUST be a declarative STATEMENT ending with a period (.) — NOT a question.
- The correctAnswer must be exactly "T", "F", or "NG" (single letter).
- TRUE: A statement is TRUE if the passage directly supports it through explicit wording OR through clear inferential logic (e.g., binary contrast, direct synonym substitution, or logical entailment). If the passage says "X is not A but B", then "X is B" is True — do NOT mark as NG.
- FALSE requires explicit, verifiable contradiction in the text. The statement must directly conflict with a specific sentence, not merely differ from the overall implication.
- NOT GIVEN: Apply NG ONLY when a modifier (such as 'publicly', 'historically', 'globally', 'always', 'never') is introduced in the question but is entirely missing or unverified in the passage text. Do NOT mark as NG when the answer can be inferred through clear logical reasoning from the passage.
- CRITICAL NG PROTOCOL: Do NOT treat "False" and "Not Given" interchangeably. An NG answer must be a statement the passage neither confirms nor contradicts. Never infer False from absence of evidence — if the text is silent on a claim, it is Not Given, not False.
- SECRET ACTION PROTOCOL: If the text describes a secret or private action, do NOT infer the opposite of a public action. E.g., if the text says "they secretly did X," this does NOT prove "they publicly condemned Y" is False — it is Not Given. The passage simply doesn't address the public action.
- ${ngConstraint}
`;
}

/**
 * Build prompt section for gap-fill / cloze generation.
 * @returns {string} Prompt section for gap-fill rules
 */
export function buildClozePrompt() {
  return `
GAP-FILL RULES:
- Blank represented by _____ or {1} in the stem.
- The answers array must contain the correct words in order.
- Blanks draw from passage but the answer word must NOT appear verbatim in the immediately adjacent text.
- Part of speech must match (noun→noun, verb→verb).
- Single blank questions: use correctAnswer field. Multiple blanks: use answers array.
`;
}

/**
 * Build prompt section for short-answer generation.
 * @returns {string} Prompt section for short-answer rules
 */
export function buildShortAnswerPrompt() {
  return `
SHORT-ANSWER & OPEN-ENDED DESIGN:
- Short-answer: answer with a word/phrase from the passage (or own words if specified).
- Include acceptableAnswers array with at least 2-3 valid alternative phrasings, including conceptual synonyms and professional terminology equivalents.
- Add wordLimit field when applicable (e.g., "in no more than 15 words").
- For questions with marks >=2, include rubric with requiredPoints.
- These must NOT be answerable by copying a single line. Target synthesis across structural gaps.
- Force candidates to locate two competing forces within the text, bridge them, and articulate the tension.
- Focus stems on paradox, irony, and divergence:
  * Instead of asking what a character's plan is, ask why their plan contradicts their stated values.
  * Instead of asking for a definition, ask how different stakeholders interpret the same term differently.
- For these questions, the rubric field is REQUIRED for marks >=2 -- list evidence demands in requiredPoints and shallow responses in unacceptableAnswers.
- IMPORTANT: When generating acceptableAnswers, include both literal text extractions AND conceptual equivalents. E.g., for an answer about "the taste of dirt/earth", also accept "terroir", "soil profile characteristics", "grounded flavor profile" — real DSE markers reward precise professional terminology.
- For 2-mark contrast questions, the rubric.requiredPoints must list EACH distinct contrast element as a separate point. E.g., for an interior/exterior contrast, requiredPoints should be ["interior description/characteristic", "exterior description/characteristic"] so partial credit can be awarded.
`;
}

/**
 * Build prompt section for matching generation.
 * @returns {string} Prompt section for matching rules
 */
export function buildMatchingPrompt() {
  return `
MATCHING RULES:
- Minimum 3 pairs.
- REQUIRES pairs array AND options array.
- pairs: [{"item": "1", "match": "C"}, {"item": "2", "match": "A"}, {"item": "3", "match": "B"}]
- options: [{"label": "A", "text": "description"}, {"label": "B", "text": "description"}, {"label": "C", "text": "description"}]
- Column labels vary by skillTested: cause→effect, claim→evidence, term→definition.
`;
}

/**
 * Build prompt section for summary cloze generation.
 * @returns {string} Prompt section for summary cloze rules
 */
export function buildSummaryClozePrompt() {
  return `
SUMMARY CLOZE RULES:
- Summary table covering multiple paragraphs.
- Numbered blanks (1, 2, 3...).
- Each blank = ONE word from the passage.
- answers array with correct words in order.
- The answer word must NOT appear verbatim in the immediately adjacent context.
`;
}

/**
 * Build prompt section for pronoun reference generation.
 * @returns {string} Prompt section for pronoun-ref rules
 */
export function buildPronounRefPrompt() {
  return `
PRONOUN REFERENCE RULES:
- "What does [word] in paragraph X refer to?"
- Must specify the line/paragraph number where the reference word appears.
- Include acceptableAnswers array for pronoun antecedents (multiple possible phrasings).
`;
}

/**
 * Build prompt section for semantic connect generation.
 * @returns {string} Prompt section for semantic-connect rules
 */
export function buildSemanticConnectPrompt() {
  return `
SEMANTIC CONNECT RULES:
- Match causes to effects, or claims to evidence.
- REQUIRES pairs and options arrays (same format as matching).
- Minimum 3 pairs.
- Column labels vary by skillTested: cause→effect, claim→evidence.
`;
}

// ---------------------------------------------------------------------------
// Prompt composer
// ---------------------------------------------------------------------------

/**
 * Composes the full generation prompt by combining shared rules with
 * per-type prompt sections for the types that appear in the distribution
 * for a given part.
 *
 * @param {string} passagePreview - Plain-text passage excerpt (first ~4000 chars)
 * @param {number} numQuestions - Number of questions to generate
 * @param {string} part - Part identifier ('A', 'B1', 'B2')
 * @param {Object} typeDist - Type distribution map from getTypeDistributionForPart(part)
 * @returns {string} Complete AI generation prompt
 */
export function composeFullPrompt(passagePreview, numQuestions, part, typeDist) {
  const typesInPrompt = typeDist ? Object.keys(typeDist).filter(t => (typeDist[t] || 0) > 0) : [];

  let typeSections = '';
  if (typesInPrompt.includes('mcq')) {
    typeSections += buildMCQPrompt(numQuestions, part);
  }
  if (typesInPrompt.includes('tfng')) {
    typeSections += buildTFNGPrompt(numQuestions);
  }
  if (typesInPrompt.includes('gap-fill') || typesInPrompt.includes('cloze')) {
    typeSections += buildClozePrompt();
  }
  if (typesInPrompt.includes('short-answer') || typesInPrompt.includes('open-ended')) {
    typeSections += buildShortAnswerPrompt();
  }
  if (typesInPrompt.includes('matching')) {
    typeSections += buildMatchingPrompt();
  }
  if (typesInPrompt.includes('summary-cloze')) {
    typeSections += buildSummaryClozePrompt();
  }
  if (typesInPrompt.includes('pronoun-ref') || typesInPrompt.includes('reference')) {
    typeSections += buildPronounRefPrompt();
  }
  if (typesInPrompt.includes('semantic-connect')) {
    typeSections += buildSemanticConnectPrompt();
  }

  const prompt = `You are a DSE English Paper 1 examiner. Below is a reading passage for comprehension assessment.

TASK: Create ${numQuestions} original comprehension questions. Each must be answerable solely from the passage.
${TYPE_DEFINITIONS}
TYPE DIVERSITY: You MUST use at least 4 different question types.${typeDist ? ` Distribution guidance for Part ${part}: ${Object.entries(typeDist).filter(([, pct]) => pct > 0).map(([t, pct]) => `${t} ~${pct}%`).join(', ')}.` : ` A good distribution for ${numQuestions} questions is: roughly 4–5 mcq, 3–4 tfng, 2–3 gap-fill, 2–3 short-answer, 1–2 open-ended, 1 matching, 1 pronoun-ref, 1 semantic-connect, 1 summary-cloze. Include at least 1 of the 3 advanced types (summary-cloze, pronoun-ref, semantic-connect).`}
${SKILL_TYPES_DEFINITIONS}
${typeSections}
${SHARED_RULES}
${SHARED_JSON_FORMAT}
PASSAGE:
${passagePreview}`;

  return prompt;
}
