/**
 * tutorialSource — Pulls a crawled IELTS Deal reading tutorial from the backend
 * and formats a compact reference block for AI course/plan generation prompts.
 *
 * This is the "secret" ingestion: tutorials never appear in the UI. Their
 * passage topics, question patterns, and explanation depth are fed directly
 * into the prompts that generate courses and study plans, so generated content
 * matches the quality bar of the source tutorials.
 *
 * All failures are silent — if the backend is unavailable (offline) we return
 * '' and generation proceeds exactly as before.
 */

async function fetchRandomTutorial() {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocal) return null;
  try {
    const res = await fetch('/api/tutorials/random', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function formatQuestionSets(questionSets, maxSets = 3) {
  if (!Array.isArray(questionSets) || questionSets.length === 0) return '';
  const lines = [];
  const sets = questionSets.slice(0, maxSets);
  for (const set of sets) {
    const range = set.range || '';
    const type = set.type || '';
    lines.push(`- Questions ${range} (${type}):`);
    const qs = (Array.isArray(set.questions) ? set.questions : []).slice(0, 3);
    for (const q of qs) {
      const stem = q.stem ? q.stem.slice(0, 160) : '';
      const keys = q.keywords ? `keywords: ${q.keywords.slice(0, 120)}` : '';
      const loc = q.location ? q.location.slice(0, 140) : '';
      const para = q.paraphrase ? `paraphrase mapping: ${q.paraphrase.slice(0, 120)}` : '';
      const ans = q.answer ? `answer: ${q.answer.slice(0, 60)}` : '';
      lines.push(`  - Q: ${stem}`);
      if (keys) lines.push(`    ${keys}`);
      if (loc) lines.push(`    ${loc}`);
      if (para) lines.push(`    ${para}`);
      if (ans) lines.push(`    ${ans}`);
    }
  }
  return lines.join('\n');
}

/**
 * buildTutorialReference — Returns a prompt block referencing an authentic
 * IELTS reading tutorial, or '' when none is available.
 */
export async function buildTutorialReference() {
  const tutorial = await fetchRandomTutorial();
  if (!tutorial) return '';

  const content = typeof tutorial.content === 'string'
    ? (() => { try { return JSON.parse(tutorial.content); } catch { return {}; } })()
    : (tutorial.content || {});

  const passageTitle = tutorial.passage_title || content.passage_title || tutorial.title || '';
  const intro = (content.intro || '').replace(/\s+/g, ' ').trim();
  const setsBlock = formatQuestionSets(content.question_sets);

  const excerpt = intro ? `Excerpt (${Math.min(240, intro.length)} chars): ${intro.slice(0, 240)}` : '';

  return `=== REFERENCE READING TUTORIAL (authentic IELTS passage with full solutions) ===
Passage title: ${passageTitle}
${excerpt}
Sample questions with detailed explanations (keywords, passage location, paraphrase mapping, answer):
${setsBlock}
=== END REFERENCE ===

Use the passage topic, question difficulty, and explanation depth above as a benchmark for the reading passages and exercises you generate. Base generated content on these topics and this style of step-by-step reasoning. Do not reproduce the source text verbatim.`;
}

/**
 * attachTutorialReference — Convenience wrapper: appends the reference block
 * to an existing prompt when available.
 */
export async function attachTutorialReference(prompt) {
  const block = await buildTutorialReference();
  if (!block) return prompt;
  return `${prompt}\n\n${block}`;
}
