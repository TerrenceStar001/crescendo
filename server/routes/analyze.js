import { Router } from 'express';

const router = Router();

async function callAI(prompt, opts = {}) {
  const apiKey = process.env.AI_API_KEY;
  const endpoint = (process.env.AI_ENDPOINT || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '') + '/chat/completions';
  const model = process.env.AI_MODEL || 'meta/llama-3.1-8b-instruct';
  if (!apiKey) throw new Error('No AI_API_KEY configured');

  const messages = [{ role: 'user', content: prompt }];
  if (opts.system) messages.unshift({ role: 'system', content: opts.system });

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: opts.maxTokens || 2000,
      temperature: opts.temperature ?? 0.3,
    }),
  });

  if (!res.ok) throw new Error(`AI API error: ${res.status} ${await res.text().catch(() => '')}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

router.post('/writing', async (req, res) => {
  try {
    const { essay, prompt: taskPrompt } = req.body;
    if (!essay) return res.status(400).json({ error: 'Essay text required' });

    const wordLimit = req.body.wordLimit || { min: 250, max: 400 };
    const data = await callAI(`Evaluate this HKDSE English writing task:

Task: ${taskPrompt || 'General writing task'}
Word limit: ${wordLimit.min}-${wordLimit.max} words

Student's essay:
${essay.replace(/<[^>]+>/g, '')}

Assess on a scale of 1-7 for each category:
1. Content (relevance, development, examples)
2. Organization (coherence, cohesion, structure)
3. Language (grammar, vocabulary, sentence variety)

Return as JSON:
{ "content": { "score": 4, "feedback": "...", "subScores": { "relevance": 5, "development": 4, "examples": 3 } },
  "organization": { "score": 4, "feedback": "..." },
  "language": { "score": 4, "feedback": "..." },
  "overall": { "total": 12, "maxTotal": 21, "percentage": 57, "dseLevel": "3" },
  "errors": [ { "original": "...", "correction": "...", "type": "grammar", "explanation": "..." } ],
  "vocabularySuggestions": [ { "original": "good", "suggestion": "beneficial", "context": "..." } ] }`, {
      system: 'You are an expert HKDSE English writing examiner. Return ONLY valid JSON.',
      temperature: 0.3,
      maxTokens: 2000,
    });

    const match = data.match(/\{[\s\S]*\}/);
    res.json(match ? JSON.parse(match[0]) : { error: 'Failed to parse AI response', raw: data.slice(0, 500) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/speaking', async (req, res) => {
  try {
    const { transcript, topic } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript required' });

    const data = await callAI(`Analyze this HKDSE English speaking response.

Topic: ${topic || 'General'}
Transcript: ${transcript}

Assess on a scale of 0-100 for: pronunciation, fluency, grammar, vocabulary, structure.

Return as JSON:
{ "pronunciation": { "score": 70, "errors": [], "feedback": "..." },
  "fluency": { "score": 65, "feedback": "..." },
  "grammar": { "score": 60, "feedback": "..." },
  "vocabulary": { "score": 55, "feedback": "..." },
  "structure": { "score": 60, "feedback": "..." },
  "overall": { "score": 62, "dseLevel": "3" },
  "improvements": ["..."],
  "modelAnswer": "..." }`, {
      system: 'You are an expert HKDSE English speaking examiner. Return ONLY valid JSON.',
      temperature: 0.3,
      maxTokens: 1500,
    });

    const match = data.match(/\{[\s\S]*\}/);
    res.json(match ? JSON.parse(match[0]) : { error: 'Failed to parse AI response', raw: data.slice(0, 500) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
