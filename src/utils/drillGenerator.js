// DSE drill generator — builds focused AI prompts from student error patterns
// and calls AI to produce targeted practice questions.
// Extends the composeFullPrompt pattern from questionGenerator.js.
//
// Per T-03-02-01: Generated drills are validated with validateQuestions()
// before display to filter malformed or unsafe output.

import { composeFullPrompt } from './questionGenerator';
import { validateQuestions } from './questionValidator';

/**
 * Parse AI response text that may contain markdown code fences.
 * Extracts the outermost JSON array from the text.
 * @param {string} text - Raw AI response
 * @returns {Array} Parsed JSON array
 */
function parseJSONResponse(text) {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  return JSON.parse(text);
}

/**
 * Build a focused drill prompt targeting specific weak areas.
 * Takes the student's actual mistakes as context and produces a prompt
 * that generates questions addressing their specific skill gaps.
 *
 * @param {string} passagePreview - Plain text passage excerpt (first ~2000 chars)
 * @param {string[]} weakTypes - Question type slugs the student struggled with (e.g. ['inference', 'mcq'])
 * @param {string} part - 'A', 'B1', or 'B2'
 * @param {Array} mistakesContext - [{ qNum, type, userAnswer, correctAnswer }]
 * @returns {string} Focused AI prompt with passage and mistake context
 */
export function buildDrillPrompt(passagePreview, weakTypes, part, mistakesContext) {
  // Build typeDist limited to the student's weak types
  const typeDist = {};
  const perType = Math.floor(100 / weakTypes.length);
  weakTypes.forEach(t => { typeDist[t] = perType; });

  // Format mistake summary lines
  const mistakeSummary = mistakesContext
    .map(m => `- Q${m.qNum} (${m.type}): Your answer "${m.userAnswer}", correct was "${m.correctAnswer}"`)
    .join('\n');

  // Get base prompt and strip the DSE examiner framing, keeping only the passage
  const basePrompt = composeFullPrompt(passagePreview, 3, part, typeDist);
  const strippedPassage = basePrompt.replace(/^You are a DSE.*?TASK:.*?PASSAGE:/ms, '');

  return `You are a DSE English tutor creating TARGETED PRACTICE questions.

The student struggled with these question types: ${weakTypes.join(', ')}.
Their actual mistakes were:
${mistakeSummary}

Create exactly 3 drill questions targeting their specific weaknesses.
Make each question directly address the skill they found difficult.
CRITICAL: Each question MUST be answerable from the passage alone.
Focus on the SKILL the student got wrong, not just the question type.

${strippedPassage}`;
}

/**
 * Generate drill questions via AI based on the student's weak areas.
 * Validates output before returning to prevent malformed questions.
 *
 * @param {string} passagePreview - Plain text passage excerpt
 * @param {string[]} weakTypes - Question type slugs
 * @param {string} part - 'A', 'B1', or 'B2'
 * @param {Array} mistakesContext - [{ qNum, type, userAnswer, correctAnswer }]
 * @param {Function} callAI - AI call function: (prompt, { system, temperature, maxTokens, timeout }) => string
 * @returns {Array|null} Array of up to 3 validated question objects, or null on failure
 */
export async function generateDrills(passagePreview, weakTypes, part, mistakesContext, callAI) {
  const prompt = buildDrillPrompt(passagePreview, weakTypes, part, mistakesContext);
  const systemMsg = 'You are a DSE English tutor. Generate exactly 3 practice questions as a JSON array. Each question follows the format: { stem, type, skillTested, paragraphRef, marks, options, correctAnswer, explanation }. Return ONLY the JSON array, no other text.';

  try {
    const raw = await callAI(prompt, {
      system: systemMsg,
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000,
    });

    const parsed = parseJSONResponse(raw);
    if (!parsed?.length) return null;

    const validation = validateQuestions(parsed);
    return validation.valid ? parsed.slice(0, 3) : null;
  } catch {
    return null;
  }
}
