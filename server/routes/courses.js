/**
 * Express router for course management endpoints.
 *
 * POST   /api/courses/ingest       — Receive base64-encoded PDF, parse, AI-structure → course draft
 * GET    /api/courses              — List all published courses
 * GET    /api/courses/:id          — Return course draft or published course
 * PUT    /api/courses/:id/publish  — Mark draft as published
 * POST   /api/courses/auto-generate — Generate course from weakness pattern tags
 */
import { Router } from 'express';
import { getDB } from '../db/connection.js';
import { parsePdf } from '../crawlers/pdfParser.js';

const router = Router();

/**
 * POST /api/courses/ingest
 * Receives base64-encoded PDF in JSON body.
 * Validates magic bytes (%PDF) and file extension (.pdf).
 * Parses PDF, calls AI to structure into course draft, saves to SQLite.
 */
router.post('/ingest', async (req, res) => {
  try {
    const { pdfBase64, fileName } = req.body;

    if (!pdfBase64 || !fileName) {
      return res.status(400).json({ error: 'pdfBase64 and fileName are required' });
    }

    // Validate file extension
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'File must have .pdf extension' });
    }

    // Decode base64
    let fileBuffer;
    try {
      fileBuffer = Buffer.from(pdfBase64, 'base64');
    } catch {
      return res.status(400).json({ error: 'Invalid base64 encoding' });
    }

    // Validate magic bytes (%PDF)
    if (fileBuffer.length < 4 || fileBuffer.toString('ascii', 0, 4) !== '%PDF') {
      return res.status(400).json({ error: 'File is not a valid PDF (missing %PDF magic bytes)' });
    }

    // Size limit (10MB per T-06-03)
    if (fileBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'PDF exceeds 10MB size limit' });
    }

    // Parse PDF text
    const { text, method } = await parsePdf(fileBuffer);
    if (!text) {
      return res.status(422).json({ error: 'Could not extract text from PDF' });
    }

    // Sanitize PDF text before AI prompt injection (T-06-02)
    const sanitizedText = text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Strip control chars
      .slice(0, 50000); // Limit length to 50K chars

    // Call AI to structure into course draft via existing proxy
    const aiPrompt = `You are a DSE English course designer. Structure the following PDF content into a course with topics, lessons, and exercises.

PDF CONTENT:
${sanitizedText}

Return ONLY a JSON object with this exact structure:
{
  "title": "string - A descriptive course title based on the content",
  "description": "string - 2-3 sentence description of what this course covers",
  "tags": ["array of relevant tags from: grammar, vocabulary, sentence-structure, academic, articles, tenses, subject-verb-agreement, conditionals, passive-voice, idiomatic, collocations, phrasal-verbs, word-forms, complex-sentences, relative-clauses, inversion, ellipsis, cohesion"],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "topics": [
    {
      "title": "string",
      "learningObjectives": ["objective 1", "objective 2"],
      "lessons": [
        {
          "title": "string",
          "exercises": [
            {
              "question": "string",
              "type": "gap-fill" | "sentence-rewrite" | "mcq" | "matching" | "cloze" | "reordering" | "short-answer",
              "answer": "string",
              "explanation": "string",
              "difficulty": 1-5
            }
          ]
        }
      ]
    }
  ]
}

Do NOT include any markdown code fences, explanations, or text outside the JSON object.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    let aiResponse;
    try {
      const fetchRes = await fetch('http://127.0.0.1:4010/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'opencode/deepseek-v4-flash-free',
          messages: [
            { role: 'system', content: 'You are a DSE English course designer. Return ONLY valid JSON, no markdown fences, no other text.' },
            { role: 'user', content: aiPrompt },
          ],
          max_tokens: 4000,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!fetchRes.ok) {
        throw new Error(`AI proxy returned HTTP ${fetchRes.status}`);
      }
      const data = await fetchRes.json();
      aiResponse = data.choices?.[0]?.message?.content?.trim() || null;
    } catch (e) {
      clearTimeout(timeout);
      console.warn('[courses] AI call failed:', e.message);
      return res.status(502).json({ error: `AI structuring failed: ${e.message}` });
    }

    if (!aiResponse) {
      return res.status(502).json({ error: 'AI returned empty response' });
    }

    // Parse JSON from AI response (strip markdown fences if present)
    let courseDraft;
    try {
      const cleaned = aiResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      courseDraft = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: 'AI returned invalid JSON structure' });
    }

    // Validate course draft structure
    if (!courseDraft.title || !Array.isArray(courseDraft.topics) || courseDraft.topics.length === 0) {
      return res.status(502).json({ error: 'AI generated incomplete course structure' });
    }

    // Save draft to SQLite
    const db = getDB();
    const draftId = `course-draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pdfTextStripped = sanitizedText.replace(/<[^>]+>/g, '').slice(0, 10000);

    db.prepare(`
      INSERT INTO courses (id, title, description, content, tags, difficulty, source, published, draft_content, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      draftId,
      courseDraft.title || 'Untitled Course',
      courseDraft.description || '',
      JSON.stringify(courseDraft),
      JSON.stringify(courseDraft.tags || []),
      courseDraft.difficulty || 'intermediate',
      'pdf-import',
      0, // not published yet
      pdfTextStripped,
      new Date().toISOString()
    );

    res.json({
      draftId,
      status: 'draft',
      course: { ...courseDraft, id: draftId, published: false },
    });
  } catch (e) {
    console.error('[courses] Error in POST /ingest:', e.message);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

/**
 * GET /api/courses
 * Lists all published courses with title, description, tags, difficulty.
 */
router.get('/', (req, res) => {
  try {
    const db = getDB();
    const courses = db.prepare(`
      SELECT id, title, description, tags, difficulty, source, published, created_at
      FROM courses
      WHERE published = 1
      ORDER BY created_at DESC
    `).all();

    const parsed = courses.map(c => ({
      ...c,
      tags: (() => { try { return JSON.parse(c.tags); } catch { return []; } })(),
    }));

    res.json({ courses: parsed });
  } catch (e) {
    console.error('[courses] Error in GET /:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/courses/:id
 * Returns course draft or published course from SQLite.
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDB();
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Parse JSON fields
    let content = null;
    try { content = JSON.parse(course.content); } catch {}

    return res.json({
      ...course,
      content,
      tags: (() => { try { return JSON.parse(course.tags); } catch { return []; } })(),
    });
  } catch (e) {
    console.error('[courses] Error in GET /:id:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * PUT /api/courses/:id/publish
 * Marks a draft as published.
 */
router.put('/:id/publish', (req, res) => {
  try {
    const db = getDB();
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    db.prepare('UPDATE courses SET published = 1, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), req.params.id);

    res.json({ success: true, id: req.params.id, status: 'published' });
  } catch (e) {
    console.error('[courses] Error in PUT /:id/publish:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/courses/auto-generate
 * Receives weakness pattern tags, builds AI prompt, generates course draft.
 */
router.post('/auto-generate', async (req, res) => {
  try {
    const { tags, weaknessPattern, difficulty } = req.body;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'tags array is required' });
    }

    const aiPrompt = `You are a DSE English course designer. Generate a structured course targeting these weakness areas.

WEAKNESS AREAS: ${JSON.stringify(tags)}
${weaknessPattern ? `DETECTED PATTERN: ${weaknessPattern}` : ''}
${difficulty ? `DIFFICULTY: ${difficulty}` : ''}

Return ONLY a JSON object with this exact structure:
{
  "title": "string - course title targeting these weaknesses",
  "description": "string - 2-3 sentence description",
  "tags": ["same tags as weakness areas"],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "topics": [
    {
      "title": "string",
      "learningObjectives": ["string"],
      "lessons": [
        {
          "title": "string",
          "exercises": [
            {
              "question": "string",
              "type": "gap-fill" | "sentence-rewrite" | "mcq" | "matching" | "cloze" | "reordering" | "short-answer",
              "answer": "string",
              "explanation": "string",
              "difficulty": 1-5
            }
          ]
        }
      ]
    }
  ]
}

Do NOT include any markdown code fences or text outside the JSON.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    let aiResponse;
    try {
      const fetchRes = await fetch('http://127.0.0.1:4010/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'opencode/deepseek-v4-flash-free',
          messages: [
            { role: 'system', content: 'You are a DSE English course designer. Return ONLY valid JSON, no markdown fences, no other text.' },
            { role: 'user', content: aiPrompt },
          ],
          max_tokens: 4000,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!fetchRes.ok) throw new Error(`AI proxy returned HTTP ${fetchRes.status}`);
      const data = await fetchRes.json();
      aiResponse = data.choices?.[0]?.message?.content?.trim() || null;
    } catch (e) {
      clearTimeout(timeout);
      console.warn('[courses] AI auto-generate failed:', e.message);
      return res.status(502).json({ error: `AI generation failed: ${e.message}` });
    }

    if (!aiResponse) {
      return res.status(502).json({ error: 'AI returned empty response' });
    }

    // Parse and validate JSON
    let courseDraft;
    try {
      const cleaned = aiResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      courseDraft = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: 'AI returned invalid JSON' });
    }

    if (!courseDraft.title || !Array.isArray(courseDraft.topics) || courseDraft.topics.length === 0) {
      return res.status(502).json({ error: 'AI generated incomplete structure' });
    }

    // Save draft to SQLite
    const db = getDB();
    const draftId = `course-auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    db.prepare(`
      INSERT INTO courses (id, title, description, content, tags, difficulty, source, weakness_pattern, published, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      draftId,
      courseDraft.title || 'Auto-generated Course',
      courseDraft.description || '',
      JSON.stringify(courseDraft),
      JSON.stringify(courseDraft.tags || tags),
      courseDraft.difficulty || difficulty || 'intermediate',
      'auto-generated',
      weaknessPattern || null,
      0,
      new Date().toISOString()
    );

    res.json({
      draftId,
      status: 'draft',
      course: { ...courseDraft, id: draftId, published: false },
    });
  } catch (e) {
    console.error('[courses] Error in POST /auto-generate:', e.message);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

export default router;
