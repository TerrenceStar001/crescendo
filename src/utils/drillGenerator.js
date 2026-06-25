import { composeFullPrompt } from './questionGenerator';

const VALID_DRILL_TYPES = ['mcq', 'gap-fill', 'short-answer', 'tfng', 'matching', 'summary-cloze', 'pronoun-ref', 'semantic-connect', 'open-ended'];

function parseJSONResponse(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch { }
  }
  try { return JSON.parse(trimmed); } catch { return null; }
  return null;
}

export function buildDrillPrompt(passagePreview, weakTypes, part, mistakesContext) {
  const drillTypes = weakTypes.filter(t => VALID_DRILL_TYPES.includes(t));
  const typesToUse = drillTypes.length > 0 ? drillTypes : ['short-answer', 'gap-fill'];

  const typeDist = {};
  const perType = Math.floor(100 / typesToUse.length);
  typesToUse.forEach(t => { typeDist[t] = perType; });

  const mistakeSummary = mistakesContext
    .map(m => `- Q${m.qNum} (${m.type}): Your answer "${m.userAnswer}", correct was "${m.correctAnswer}"`)
    .join('\n');

  const basePrompt = composeFullPrompt(passagePreview, 3, part, typeDist);
  const passageIdx = basePrompt.lastIndexOf('PASSAGE:');
  const strippedPassage = passageIdx >= 0 ? basePrompt.slice(passageIdx + 8).trim() : passagePreview;

  let prompt = `You are a DSE English tutor creating TARGETED PRACTICE questions.

The student struggled with these question types: ${typesToUse.join(', ')}.
Their actual mistakes were:
${mistakeSummary}

Create exactly 3 drill questions targeting their specific weaknesses.
Each question MUST be answerable from the passage alone.

Return ONLY a JSON array with exactly 3 question objects. Each object MUST have these fields:
- "stem": the question text (string)
- "type": one of: ${typesToUse.join(', ')}
- "skillTested": the skill being tested (string)
- "paragraphRef": paragraph number (integer 1-10)
- "marks": 1 or 2
- "correctAnswer": the correct answer
- "explanation": brief explanation of why this is correct
${typesToUse.includes('mcq') ? '- "options": array of 4 options with "label" (A-D) and "text"' : ''}

Do NOT include any markdown code fences, explanations, or text outside the JSON array.

PASSAGE:
${strippedPassage}`;

  return prompt;
}

export async function generateDrills(passagePreview, weakTypes, part, mistakesContext, callAI) {
  if (!passagePreview || !passagePreview.trim()) return null;

  const prompt = buildDrillPrompt(passagePreview, weakTypes, part, mistakesContext);
  const systemMsg = 'You are a DSE English tutor. Generate exactly 3 practice questions as a JSON array. Each question follows the format: { stem, type, skillTested, paragraphRef, marks, options, correctAnswer, explanation }. Return ONLY the JSON array, no other text.';

  try {
    const raw = await callAI(prompt, {
      system: systemMsg,
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 45000,
    });

    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
      return null;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[Drill] AI response length:', raw?.length);
    }

    const parsed = parseJSONResponse(raw);
    if (!parsed?.length) return null;

    const isValid = parsed.every(q =>
      q && typeof q === 'object' &&
      typeof q.stem === 'string' && q.stem.trim().length > 5 &&
      typeof q.correctAnswer === 'string' &&
      typeof q.type === 'string' &&
      typeof q.skillTested === 'string' &&
      typeof q.marks === 'number' && q.marks >= 1
    );

    if (!isValid) return null;
    const result = parsed.slice(0, 3);
    let idCounter = 0;
    result.forEach(q => {
      q.id = q.id || `drill-${++idCounter}-${Date.now()}`;
      q.correctAnswer = q.correctAnswer || '';
      q.explanation = q.explanation || 'Based on the passage.';
      if (q.type === 'short-answer' && !q.wordLimit) q.wordLimit = 50;
    });
    return result;
  } catch {
    return null;
  }
}
