import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// --- Config ---
const API_URL = 'http://127.0.0.1:4010/v1/chat/completions';
const MODEL = 'opencode/deepseek-v4-flash-free';
const REFERENCE_PATH = resolve(ROOT, 'docs/reference-dse-p2-prompts.json');
const OUTPUT_PATH = resolve(ROOT, 'src/assets/writing-prompts.json');
const CACHE_PATH = resolve(ROOT, 'scripts/.generated-cache.json');

// Target counts
const PART_A_TARGETS = {
  'letter': 25, 'article': 17, 'speech': 15, 'email': 10,
  'review': 6, 'notice': 5, 'memo': 4, 'photo-caption': 4,
  'yearbook': 4, 'visitor-guide': 4, 'form': 3, 'diary': 3,
};
const PART_B_TARGETS = {
  'article': 18, 'letter': 14, 'story': 11, 'speech': 8,
  'essay': 8, 'email': 6, 'blog': 5, 'report': 3,
  'review': 4, 'proposal': 3, 'diary': 3, 'debate': 3,
  'forum': 2, 'biography': 2, 'guide': 2,
};
const TOTAL_A = Object.values(PART_A_TARGETS).reduce((a, b) => a + b, 0);
const TOTAL_B = Object.values(PART_B_TARGETS).reduce((a, b) => a + b, 0);

const TOPIC_DOMAINS = [
  'education', 'environment', 'technology', 'health', 'social issues',
  'culture', 'career', 'media', 'sports', 'family', 'travel', 'consumer'
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];

// --- Helpers ---
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function pick(arr) {
  const idx = Math.floor(Math.random() * arr.length);
  return arr.splice(idx, 1)[0];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16).slice(0, 8);
}

// --- Load references ---
const refData = JSON.parse(readFileSync(REFERENCE_PATH, 'utf-8'));
const references = refData.prompts || refData;

function findReferences(part, textType, count = 2) {
  const matched = references.filter(r => r.part === part && r.textType === textType);
  const others = references.filter(r => r.part === part && r.textType !== textType);
  shuffle(matched);
  shuffle(others);
  return [...matched.slice(0, count), ...others.slice(0, 1)];
}

// --- API call ---
async function callAI(messages, temperature = 0.4, maxTokens = 1500) {
  const body = { model: MODEL, messages, temperature, max_tokens: maxTokens };
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJSON(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
  // Try direct parse
  try { return JSON.parse(cleaned); } catch {}
  // Try extracting first JSON object
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) try { return JSON.parse(objMatch[0]); } catch {}
  // Try extracting first JSON array
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) try { return JSON.parse(arrMatch[0]); } catch {}
  return null;
}

// --- Build generation prompts ---
function buildPartAPrompt(type, reference, topicDomain, difficulty, usedTopics) {
  const refText = reference
    ? `Here is a REAL HKDSE Part A question for reference:\n--- REFERENCE ---\n${reference.task}\nContext: ${reference.context}\n--- END REFERENCE ---`
    : '';

  return [
    { role: 'system', content: `You are a senior HKDSE English Paper 2 examiner with 15 years of experience. You generate authentic HKDSE Paper 2 Part A writing prompts.` },
    { role: 'user', content: `Generate a HKDSE English Paper 2 Part A writing prompt.

TEXT TYPE: ${type}
TOPIC DOMAIN: ${topicDomain}
DIFFICULTY: ${difficulty}
WORD COUNT: ~200 words

${refText}

CRITICAL RULES:
- Realistic Hong Kong context with specific locations, schools, or organisations
- Clear student role ("You are a Form 6 student who...")
- Task instruction must incorporate 2-3 things to cover WITHOUT listing bullet hints
- The prompt must be self-contained and immediately understandable
- Do NOT include "suggestedPoints" or bullet hints — real HKDSE Part A gives NO such hints
- Do NOT use these banned AI-isms: "delve", "landscape", "in today's world", "crucial", "paramount", "rapidly evolving"
- Output ONLY valid JSON

Previous topics to avoid repeating: ${usedTopics.slice(-5).join(', ') || 'none'}

Output JSON format:
{
  "type": "${type}",
  "title": "Short descriptive title (max 8 words)",
  "context": "2-3 sentences setting up realistic HK situation and student's role",
  "task": "Clear task instruction that incorporates what to cover",
  "wordLimit": { "min": 180, "max": 250 },
  "instructions": "Exam-style instructions",
  "difficulty": "${difficulty}",
  "topicDomain": "${topicDomain}"
}` }
  ];
}

function buildPartBPrompt(types, refs, domains, usedTopics) {
  const refSections = refs.map((r, i) =>
    `Option ${i + 1} reference (REAL DSE):\nText Type: ${r.textType}\nTopic: ${r.topic}\nTask: ${r.task}\nContext: ${r.context}`
  ).join('\n\n');

  const typeSpecs = types.map((t, i) =>
    `Option ${i + 1}: ${t.label} (${t.genre}), Domain: ${domains[i]}`
  ).join('\n');

  return [
    { role: 'system', content: 'You are a senior HKDSE English Paper 2 examiner who has set exam questions for 15 years.' },
    { role: 'user', content: `Generate 3 DISTINCT HKDSE English Paper 2 Part B writing options.

${refSections}

REQUIRED OPTIONS:
${typeSpecs}

CRITICAL RULES:
- Each option must use a DIFFERENT topic domain as specified
- Each option must have a DIFFERENT core topic — no overlap
- Realistic Hong Kong context for each
- Clear role for the student
- Task instructions that incorporate requirements WITHOUT bullet hints
- Word limit: 380-450 words
- Do NOT use: "delve", "landscape", "in today's world", "crucial", "paramount"
- Output ONLY valid JSON array

Previous topics to avoid: ${usedTopics.slice(-10).join(', ') || 'none'}

Output format — JSON array of 3 objects:
[{ "type": "...", "title": "...", "context": "1-2 sentence context", "task": "Clear task instruction", "wordLimit": { "min": 380, "max": 450 }, "difficulty": "easy|medium|hard", "topicDomain": "..." }]` }
  ];
}

// --- Validation ---
function validatePrompt(p, part, textType) {
  if (!p || typeof p !== 'object') return 'Not an object';
  if (!p.title || p.title.length < 3) return 'Missing or too short title';
  if (!p.context || p.context.length < 20) return 'Missing or too short context';
  if (!p.task || p.task.length < 20) return 'Missing or too short task';
  if (!p.wordLimit || !p.wordLimit.min) return 'Missing wordLimit';
  if (!p.difficulty || !['easy', 'medium', 'hard'].includes(p.difficulty)) return 'Missing/invalid difficulty';
  if (!p.topicDomain) return 'Missing topicDomain';
  // Check for AI-isms
  const banned = ['delve', 'in today\'s world', 'paramount', 'rapidly evolving', 'landscape of'];
  const combined = (p.context + ' ' + p.task).toLowerCase();
  for (const w of banned) {
    if (combined.includes(w)) return `Contains banned word: "${w}"`;
  }
  // Check for bullet hints (should NOT have suggested points)
  if (p.suggestedPoints) return 'Has suggestedPoints — remove for authenticity';
  return null;
}

// --- Main generation ---
async function main() {
  const existing = [];
  const usedPartATopics = [];
  const usedPartBTopics = [];

  // Load any existing prompts to preserve
  if (existsSync(OUTPUT_PATH)) {
    try {
      const existingData = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'));
      existing.push(...existingData.filter(p => p.source === 'curated'));
      // Track topics from existing
      existing.forEach(p => {
        if (p.part === 'A') usedPartATopics.push(p.title);
        else usedPartBTopics.push(p.title);
      });
      console.log(`Loaded ${existing.length} existing curated prompts`);
    } catch {}
  }

  // --- Generate Part A prompts ---
  const partA = [];
  const typeEntriesA = Object.entries(PART_A_TARGETS);

  for (const [type, count] of typeEntriesA) {
    console.log(`\n=== Part A: Generating ${count} × ${type} ===`);
    const domainPool = shuffle([...TOPIC_DOMAINS]);

    for (let i = 0; i < count; i++) {
      const topicDomain = domainPool[i % domainPool.length];
      const difficulty = rand(DIFFICULTIES);
      const refs = findReferences('A', type, 2);
      const reference = refs[0];
      const messages = buildPartAPrompt(type, reference, topicDomain, difficulty, usedPartATopics);
      const usedTitle = `generated_${type}_${i + 1}`;

      for (let retry = 0; retry < 3; retry++) {
        try {
          console.log(`  [${i + 1}/${count}] Generating ${type} (${topicDomain}, ${difficulty})... attempt ${retry + 1}`);
          const raw = await callAI(messages, 0.4, 1200);
          const parsed = parseJSON(raw);

          if (!parsed) {
            console.log(`    ✗ Parse failed, retrying...`);
            continue;
          }

          // Ensure type matches
          parsed.type = type;

          const err = validatePrompt(parsed, 'A', type);
          if (err) {
            console.log(`    ✗ Validation: ${err}`);
            continue;
          }

          const id = `wp-partA-${type}-${String(partA.length + 1).padStart(3, '0')}`;
          const prompt = {
            id,
            part: 'A',
            type,
            title: parsed.title,
            context: parsed.context,
            task: parsed.task,
            wordLimit: parsed.wordLimit || { min: 180, max: 250 },
            instructions: parsed.instructions || `Write about ${parsed.wordLimit?.max || 250} words.`,
            difficulty: parsed.difficulty || difficulty,
            source: 'ai-generated',
            topicDomain: parsed.topicDomain || topicDomain,
            tags: [type, topicDomain],
            validationStatus: 'draft',
            semanticHash: simpleHash(parsed.task),
          };

          partA.push(prompt);
          usedPartATopics.push(parsed.title);
          if (usedPartATopics.length > 50) usedPartATopics.shift();
          console.log(`    ✓ Generated: "${parsed.title}"`);
          break;
        } catch (e) {
          console.log(`    ✗ Error: ${e.message.slice(0, 100)}`);
          if (retry === 2) console.log(`    ✗ Giving up on this prompt after 3 attempts`);
        }
      }
    }
  }

  console.log(`\n=== Part A complete: ${partA.length} prompts generated ===`);

  // --- Generate Part B prompts ---
  const partB = [];
  const typeEntriesB = Object.entries(PART_B_TARGETS);
  // Group into batches of 3
  const batchedTypes = [];
  let batch = [];
  for (const [type, count] of typeEntriesB) {
    for (let i = 0; i < count; i++) {
      batch.push(type);
      if (batch.length === 3) {
        batchedTypes.push(batch);
        batch = [];
      }
    }
  }
  if (batch.length > 0) batchedTypes.push(batch);

  for (const [batchIdx, typeBatch] of batchedTypes.entries()) {
    console.log(`\n=== Part B: Batch ${batchIdx + 1}/${batchedTypes.length} (${typeBatch.join(', ')}) ===`);

    // Generate 3 distinct domains for this batch
    const domainPool = shuffle([...TOPIC_DOMAINS]);
    const domains = domainPool.slice(0, 3);
    const types = typeBatch.map(t => {
      const entry = PART_B_TARGETS;
      return { type: t, label: t.charAt(0).toUpperCase() + t.slice(1), genre: t };
    });

    const refs = typeBatch.map(t => findReferences('B', t, 1)[0]).filter(Boolean);
    const messages = buildPartBPrompt(types, refs, domains, usedPartBTopics);

    for (let retry = 0; retry < 4; retry++) {
      try {
        console.log(`  Generating 3 options... attempt ${retry + 1}`);
        const raw = await callAI(messages, 0.5, 2000);
        const parsed = parseJSON(raw);

        if (!parsed || !Array.isArray(parsed)) {
          console.log(`  ✗ Parse failed, not an array`);
          continue;
        }

        const batchValid = parsed.slice(0, 3);
        const validated = [];

        for (let i = 0; i < batchValid.length; i++) {
          const p = batchValid[i];
          p.type = typeBatch[i] || p.type;
          const err = validatePrompt(p, 'B', p.type);
          if (err) {
            console.log(`  ✗ Option ${i + 1} validation: ${err}`);
            continue;
          }

          const id = `wp-partB-${p.type}-${String(partB.length + validated.length + 1).padStart(3, '0')}`;
          validated.push({
            id,
            part: 'B',
            type: p.type,
            title: p.title,
            context: p.context,
            task: p.task,
            wordLimit: p.wordLimit || { min: 380, max: 450 },
            instructions: p.instructions || 'Write about 400 words.',
            difficulty: p.difficulty || 'medium',
            source: 'ai-generated',
            topicDomain: p.topicDomain || domains[i] || 'general',
            tags: [p.type, p.topicDomain || domains[i] || 'general'],
            validationStatus: 'draft',
            semanticHash: simpleHash(p.task),
          });
          usedPartBTopics.push(p.title);
          if (usedPartBTopics.length > 50) usedPartBTopics.shift();
          console.log(`  ✓ Option ${i + 1}: "${p.title}"`);
        }

        if (validated.length > 0) {
          partB.push(...validated);
          console.log(`  ✓ Batch complete: ${validated.length}/3 valid`);
          break;
        } else {
          console.log(`  ✗ All 3 options failed validation, retrying...`);
        }
      } catch (e) {
        console.log(`  ✗ Error: ${e.message.slice(0, 100)}`);
        if (retry === 3) console.log(`  ✗ Giving up on this batch after 4 attempts`);
      }
    }
  }

  console.log(`\n=== Part B complete: ${partB.length} prompts generated ===`);

  // --- Merge and write ---
  const existingCurated = existing.filter(p => p.source === 'curated');
  const allPrompts = [...existingCurated, ...partA, ...partB];

  // Sort: Part A first, then Part B, then by type, then by id
  allPrompts.sort((a, b) => {
    if (a.part !== b.part) return a.part.localeCompare(b.part);
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return (a.id || '').localeCompare(b.id || '');
  });

  // Deduplicate by semantic hash
  const seenHashes = new Set();
  const deduped = [];
  for (const p of allPrompts) {
    const hash = p.semanticHash || simpleHash(p.task);
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      deduped.push(p);
    }
  }

  // Count by type
  const counts = {};
  for (const p of deduped) {
    const key = `${p.part}-${p.type}`;
    counts[key] = (counts[key] || 0) + 1;
  }

  console.log(`\n=== FINAL SUMMARY ===`);
  console.log(`Total prompts: ${deduped.length}`);
  console.log(`  Part A: ${deduped.filter(p => p.part === 'A').length}`);
  console.log(`  Part B: ${deduped.filter(p => p.part === 'B').length}`);
  console.log(`\nBreakdown:`);
  for (const [key, count] of Object.entries(counts).sort()) {
    console.log(`  ${key}: ${count}`);
  }
  console.log(`\nDedup removed: ${allPrompts.length - deduped.length}`);

  writeFileSync(OUTPUT_PATH, JSON.stringify(deduped, null, 2), 'utf-8');
  console.log(`\n✓ Written to ${OUTPUT_PATH}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
