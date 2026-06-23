import { useState, useCallback, useMemo } from 'react';
import { useIndexedDB } from './useIndexedDB';
import bundledContent from '../assets/bundled-content.json';
import { STRUCTURAL_CONSTRAINTS, ARGUMENTATION_FLOW, WORD_COUNT_TARGETS, TEXT_TYPE_REQUIREMENTS, getMaxTokensForPart } from '../utils/structuralConstraints';

function parseJSONArray(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
  let parsed = tryParseJSON(cleaned);
  if (parsed) return parsed;
  const m = cleaned.match(/\[[\s\S]*\]/);
  if (m) {
    parsed = tryParseJSON(m[0]);
    if (parsed) return parsed;
    const fixed = fixAIJSON(m[0]);
    try { parsed = JSON.parse(fixed); } catch {}
    if (parsed) return parsed;
  }
  // Last resort: try fixing the entire cleaned string
  const wholeFix = fixAIJSON(cleaned);
  try { parsed = JSON.parse(wholeFix); } catch {}
  return parsed || null;
}

function tryParseJSON(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch {}
  const fixed = fixAIJSON(str);
  try { return JSON.parse(fixed); } catch {}
  return null;
}

function fixAIJSON(str) {
  if (!str) return str;
  let s = str;
  // Strip // line comments (not inside strings)
  let stripped = '';
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && (i === 0 || s[i - 1] !== '\\')) inStr = !inStr;
    if (!inStr && c === '/' && s[i + 1] === '/') {
      while (i < s.length && s[i] !== '\n') i++;
      continue;
    }
    stripped += c;
  }
  s = stripped;
  // Fix trailing commas before ] or }
  s = s.replace(/,(\s*[\]}])/g, '$1');
  // Fix single-quoted property names to double-quoted (but not inside double-quoted strings)
  const parts = [];
  let i = 0; inStr = false;
  while (i < s.length) {
    const c = s[i];
    if (c === '"' && (i === 0 || s[i - 1] !== '\\')) inStr = !inStr;
    if (!inStr && c === "'") { parts.push(c); i++; continue; }
    parts.push(c);
    i++;
  }
  s = parts.join('');
  // Replace single quotes with double quotes when not inside double-quoted strings
  let result = '';
  inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && (i === 0 || s[i - 1] !== '\\')) inStr = !inStr;
    result += inStr ? c : (c === "'" ? '"' : c);
  }
  // Fix unquoted property names: {key: value} → {"key": value}
  result = result.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3');
  // Insert missing commas between adjacent JSON values (outside strings)
  let final = '';
  inStr = false;
  for (let i = 0; i < result.length; i++) {
    const c = result[i];
    if (c === '"' && (i === 0 || result[i - 1] !== '\\')) inStr = !inStr;
    final += c;
    if (inStr) continue;
    if (c === '}' || c === ']' || c === '"') {
      let j = i + 1;
      while (j < result.length && result[j] === ' ') j++;
      const next = result[j];
      if (next === '{' || next === '[' || next === '"') {
        final += ',';
      }
    }
  }
  // Fix truncated JSON: append missing closing brackets
  let depth = 0, lastArray = false;
  for (let i = 0; i < final.length; i++) {
    if (inStrCheck(final, i)) continue;
    if (final[i] === '[') { depth++; lastArray = true; }
    else if (final[i] === ']') { depth--; }
    else if (final[i] === '{') { depth++; lastArray = false; }
    else if (final[i] === '}') { depth--; }
  }
  while (depth > 0) {
    final += lastArray ? '}' : ']';
    depth--;
  }
  // Strip trailing content after the final ] or }
  const lastBracket = Math.max(final.lastIndexOf(']'), final.lastIndexOf('}'));
  if (lastBracket >= 0 && lastBracket < final.length - 1) {
    final = final.slice(0, lastBracket + 1);
  }
  return final;
}

function inStrCheck(s, i) {
  let inStr = false;
  for (let j = 0; j <= i; j++) {
    if (s[j] === '"' && (j === 0 || s[j - 1] !== '\\')) inStr = !inStr;
  }
  return inStr;
}

function parseJSONObject(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) try { return JSON.parse(m[0]); } catch {}
  return null;
}

function normalizeQuestion(q) {
  const stem = typeof q.stem === 'object' && q.stem !== null ? Object.values(q.stem).join(' ') : (q.stem || '');
  let correctAnswer = typeof q.correctAnswer === 'object' && q.correctAnswer !== null ? Object.values(q.correctAnswer).join(', ') : (q.correctAnswer || '');
  let options = q.options;
  if (options && typeof options === 'object' && !Array.isArray(options)) {
    options = Object.entries(options).map(([k, v]) => ({ label: k.replace(/[()]/g, '').trim(), text: String(v) }));
  }
  let pairs = q.pairs;
  if (pairs && typeof pairs === 'object' && !Array.isArray(pairs)) {
    pairs = Object.entries(pairs).map(([k, v]) => ({ item: k.replace(/[()]/g, '').trim(), match: String(v).trim() }));
    if (!options) {
      const seen = new Set();
      options = pairs.map(p => p.match).filter(m => { const u = !seen.has(m); seen.add(m); return u; }).map((m, i) => ({ label: String.fromCharCode(65 + i), text: m }));
    }
    correctAnswer = pairs.map(p => `${p.item}→${p.match}`).join(', ');
  } else if (Array.isArray(pairs) && pairs.length > 0) {
    pairs = pairs.map(p => ({ item: String(p.item || '').trim(), match: String(p.match || '').trim() }));
    correctAnswer = pairs.map(p => `${p.item}→${p.match}`).join(', ');
  }
  let answers = q.answers;
  if (q.type === 'gap-fill' && !answers && correctAnswer && correctAnswer.includes(',')) {
    answers = correctAnswer.split(',').map(s => s.trim()).filter(Boolean);
  }
  // Auto-fill missing rubric for marks ≥2 to avoid unnecessary retries
  let rubric = q.rubric;
  if ((q.marks || 1) >= 2 && !rubric) {
    rubric = { requiredPoints: ['see answer key'], unacceptableAnswers: [] };
  }
  return { ...q, stem, correctAnswer, options, pairs, answers, rubric };
}

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
  // If last word is short (incomplete) and no punctuation
  if (lastWord.length <= 3 && !/[.?!:]/.test(lastChar)) return true;
  return false;
}

const VALID_TYPES = new Set(['mcq', 'tfng', 'gap-fill', 'short-answer', 'matching', 'open-ended']);
const SKILL_VALUES = new Set(['mainIdea', 'detail', 'inference', 'vocabInContext', 'tone', 'purpose']);

function fixQuestionTypes(q) {
  let type = (q.type || '').trim().toLowerCase();
  const stem = (q.stem || '').trim();
  const answer = (q.correctAnswer || '').trim();
  const hasOptions = Array.isArray(q.options) && q.options.length >= 2;

  // Fix type-skill confusion: if type is a skill value, reclassify
  if (SKILL_VALUES.has(type)) {
    const skill = type; // save as skill
    if (hasOptions) type = 'mcq';
    else if (/^(T|F|NG|True|False|Not Given)$/i.test(answer)) type = 'tfng';
    else type = 'short-answer';
    q = { ...q, type, skillTested: q.skillTested || skill };
  }

  // Fix skill-test-type confusion in skillTested field
  if (q.skillTested && !SKILL_VALUES.has(q.skillTested)) {
    delete q.skillTested;
  }

  // Validate type is one of 6 valid values
  if (!VALID_TYPES.has(type)) {
    if (hasOptions) type = 'mcq';
    else type = 'short-answer';
    q = { ...q, type };
  }

  // TFNG: normalize answer to single letter
  if (type === 'tfng') {
    const norm = { 'true': 'T', 'false': 'F', 'not given': 'NG' };
    const normalized = norm[answer.toLowerCase()];
    if (normalized) q = { ...q, correctAnswer: normalized };

    // TFNG stems must be statements, not questions
    if (stem.endsWith('?')) {
      // Reclassify as short-answer if it's a question-word question
      q = { ...q, type: 'short-answer' };
    }
  }

  // MCQ: ensure options array is present
  if (type === 'mcq' && (!Array.isArray(q.options) || q.options.length < 2)) {
    // Generate generic options if missing
    const letters = ['A', 'B', 'C', 'D'];
    q = { ...q, options: letters.map(l => ({ label: l, text: '' })) };
  }

  // Matching: ensure pairs and options are present
  if (type === 'matching') {
    if (!q.pairs && q.options && answer) {
      // Try to reconstruct pairs from correctAnswer string
      const pairMatches = answer.match(/(\d+)\s*[→:-]\s*([A-D])/g);
      if (pairMatches) {
        q.pairs = pairMatches.map(pm => {
          const [, item, match] = pm.match(/(\d+)\s*[→:-]\s*([A-D])/);
          return { item, match };
        });
      }
    }
  }

  return q;
}

function validateQuestionAnswer(q) {
  const type = q.type || 'mcq';
  const stem = (q.stem || '').trim();
  const answer = (q.correctAnswer || '').trim();
  // Reject only if stem is empty or missing — answer can be null (unable to determine)
  if (!stem || stem.length < 5) return false;
  // Mark truncated stems
  if (detectTruncatedStem(stem)) {
    return { ...q, stemTruncated: true, answerUnknown: true };
  }
  // If answer is empty, it's valid but marked as unknown
  if (!answer) return { ...q, answerUnknown: true };
  switch (type) {
    case 'mcq':
      // Allow single letter or any answer that starts with a letter
      if (!/^[A-D]/i.test(answer) && !/^[A-D][.)\s]/.test(answer)) return { ...q, answerUnknown: true };
      break;
    case 'tfng':
      if (!/^(T|F|NG|True|False|Not Given)/i.test(answer)) return { ...q, answerUnknown: true };
      // Reject TFNG stems that are just a truth value (generation error)
      if (/^(True|False|Not Given|T|F|NG)$/i.test(stem)) return false;
      break;
    case 'gap-fill': {
      const words = answer.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      if (words.length === 0 || !words.every(w => w.split(/\s+/).length <= 8)) return { ...q, answerUnknown: true };
      break;
    }
    case 'short-answer':
      if (answer.split(/\s+/).filter(Boolean).length > 30) return { ...q, answerUnknown: true };
      break;
    case 'matching':
    case 'open-ended':
    case 'summary-cloze':
    case 'pronoun-ref':
    case 'semantic-connect':
      break; // always accept
    default:
      return { ...q, answerUnknown: true };
  }
  return q;
}

function ensureNGCount(questions) {
  const tfng = questions.filter(q => q.type === 'tfng');
  if (tfng.length < 4) return questions;
  const ngCount = tfng.filter(q => /^ng$/i.test((q.correctAnswer || '').trim())).length;
  if (ngCount >= 2) return questions;
  const needed = 2 - ngCount;
  let flipped = 0;
  return questions.map(q => {
    if (q.type !== 'tfng') return q;
    if (flipped >= needed) return q;
    if (/^ng$/i.test((q.correctAnswer || '').trim())) return q;
    q.correctAnswer = 'NG';
    q.explanation = (q.explanation || '') + ' [Not explicitly stated in the passage]';
    flipped++;
    return q;
  });
}

function validateQuestions(questions, passagePlain) {
  const warnings = [];
  if (!questions?.length) return { valid: false, warnings: ['No questions'] };

  const lowerPassage = passagePlain.replace(/<[^>]+>/g, '').toLowerCase();

  // 1. NG count check: at least 2 TFNG answers should be "NG"
  const tfngQuestions = questions.filter(q => q.type === 'tfng');
  if (tfngQuestions.length >= 4) {
    const ngCount = tfngQuestions.filter(q => /^ng$/i.test((q.correctAnswer || '').trim())).length;
    if (ngCount < 2) {
      warnings.push(`Need ≥2 NG answers in TFNG, got ${ngCount}`);
    }
  } else if (tfngQuestions.length >= 2) {
    const ngCount = tfngQuestions.filter(q => /^ng$/i.test((q.correctAnswer || '').trim())).length;
    if (ngCount === 0) {
      warnings.push(`Need at least 1 NG answer in ${tfngQuestions.length} TFNG`);
    }
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
        warnings.push(`Uneven distribution: ${Math.round(rate * 100)}% from second half (need ≥30%)`);
      }
    }
  }

  // 3. Distractor overlap: check >60% word overlap between any two options
  for (const q of questions) {
    if (q.type === 'mcq' && q.options?.length >= 2) {
      for (let i = 0; i < q.options.length; i++) {
        for (let j = i + 1; j < q.options.length; j++) {
          const a = (q.options[i].text || '').toLowerCase().split(/\s+/).filter(Boolean);
          const b = (q.options[j].text || '').toLowerCase().split(/\s+/).filter(Boolean);
          if (a.length < 2 || b.length < 2) continue;
          const setB = new Set(b);
          const overlap = a.filter(w => setB.has(w)).length;
          const overlapRate = overlap / Math.min(a.length, b.length);
          if (overlapRate > 0.6) {
            warnings.push(`Q${q.id || '?'}: Overlapping distractors (${Math.round(overlapRate * 100)}% word overlap)`);
          }
        }
      }
    }
  }

  // 4. Pattern-matching: check stem is not a direct lift from passage
  for (const q of questions) {
    const stem = q.stem || '';
    const clean = stem.replace(/_{2,}|__|\?{2,}/g, '').toLowerCase().trim();
    if (clean.length > 25 && lowerPassage.includes(clean)) {
      warnings.push(`Q${q.id || '?'}: Stem appears to be a direct passage copy (${clean.slice(0, 40)}...)`);
    }
    if (q.context) {
      const ctx = q.context.replace(/_{2,}/g, '').toLowerCase().trim();
      if (ctx.length > 25 && lowerPassage.includes(ctx)) {
        warnings.push(`Q${q.id || '?'}: Context is a direct passage copy`);
      }
    }
  }

  // 5. Truncation check: no question should reference truncated/missing content ABOUT THE PASSAGE ITSELF
  const truncationPatterns = /cut.?off|truncated|incomplete|cuts? off|ends? abrupt/i;
  const selfRefPatterns = /passage|text|section|above|reading|this (article|excerpt)/i;
  for (const q of questions) {
    const stem = (q.stem || '') + ' ' + (q.explanation || '');
    if (truncationPatterns.test(stem) && selfRefPatterns.test(stem)) {
      warnings.push(`Q${q.id || '?'}: References non-existent truncation or missing content`);
    }
  }

  // 6. Rubric check: questions with marks ≥2 must have rubric
  for (const q of questions) {
    if ((q.marks || 1) >= 2 && !q.rubric) {
      warnings.push(`Q${q.id || '?'}: Missing rubric for ${q.marks}-mark question`);
    }
  }

  // 7. Type diversity: check at least 4 types used
  const typeSet = new Set(questions.map(q => q.type));
  if (typeSet.size < 4) {
    warnings.push(`Low type diversity: ${typeSet.size}/4 types (need at least 4)`);
  }

  return { valid: warnings.length === 0, warnings };
}

function stripPassageFooter(text) {
  return text
    .replace(/^.*\d{4}-DSE-ENG\s+LANG.*$/gm, '')
    .replace(/^.*Provided by dse\.life.*$/gm, '')
    .replace(/^.*Sources of materials.*$/gm, '')
    .replace(/^.*All Rights Reserved.*$/gm, '')
    .replace(/^.*Not to be taken away.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractPassage(content, part) {
  const partMatch = content.match(new RegExp(`(?:^|\\n)PART\\s+${part}\\b`, 'i'));
  if (!partMatch) return content;
  let passage = content.slice(partMatch.index);
  const endRegex = /END\s+OF\s+(?:READING\s+)?PASSAGE(?:S)?\b/i;
  let endMatch = passage.match(endRegex);
  if (!endMatch) {
    endMatch = passage.match(new RegExp(`END\\s+OF\\s+PART\\s+${part}\\b`, 'i'));
  }
  if (endMatch) passage = passage.slice(0, endMatch.index);

  const textMatch = passage.match(/(?:^|\n)Text\s*\d+\s*\n/i);
  if (textMatch) {
    passage = passage.slice(textMatch.index);
    if (/^Text\s*\d+\s+and\s+answer\b/i.test(passage)) {
      const tm2 = passage.match(/\nText\s*\d+\s*\n/i);
      if (tm2) passage = passage.slice(tm2.index + 1);
    }
    return stripPassageFooter(passage);
  }

  const HEADER = /^(PART|Reading\s+Passages?|INSTRUCTIONS|GENERAL|Refer\s+to|Not\s+to\s+be|After\s+the|Candidates|All\s+candidates|Write\s+your|Read\s+Text)/i;
  const TIME = /^\d{1,2}[:.]\d{2}\s/;
  const BOTH = /^\(?(?:for\s+both|both)\s+Parts?\b/i;
  const NUMPG = /^\d+\s+(?:Reading\s+)?Passages?\b/i;
  const NUMIN = /^\(\d+\)\s/;
  const MARK = /^(ONE|TWO)\s+(mark|question|answer)\b/i;
  const NUMPAR = /^\d+\s+\(/;

  const lines = passage.split('\n');
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l || HEADER.test(l) || TIME.test(l) || BOTH.test(l) || NUMPG.test(l) || NUMIN.test(l) || MARK.test(l) || NUMPAR.test(l)) {
      start = i + 1;
    } else break;
  }
  passage = lines.slice(start).join('\n');
  return stripPassageFooter(passage);
}

function addParagraphTags(text) {
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (/^<(p|h[1-6]|div|ul|ol|li|table)/i.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, ' ')}</p>`;
    })
    .join('\n');
}

const KNOWN_OCR_FIXES = [
  [/Tomadays/gi, 'nowadays'],
  [/\bperhour\b/gi, 'per hour'],
  [/\bIsaw\b/g, 'I saw'],
  [/\bInoticed\b/g, 'I noticed'],
  [/\bIbelieve\b/g, 'I believe'],
  [/\bIreplied\b/g, 'I replied'],
  [/\bIthink\b/g, 'I think'],
  [/\bItwas\b/g, 'It was'],
  [/\bcarerist\b/gi, 'careerist'],
  [/\bemployable\b/gi, 'employable'],
  [/\bheadhunter\b/gi, 'headhunter'],
  [/\brecruiter\b/gi, 'recruiter'],
  [/\bentrepr?eneurl?\b/gi, 'entrepreneur'],
  [/\bself[-\s]proclaim/gi, 'self-proclaimed'],
  [/\bportfolio\s+carer/gi, 'portfolio career'],
  [/\bmultimedia\b/gi, 'multi-media'],
  // 2017 passage specific
  [/\bVe\b/g, 'We'],
  [/\bWil?enn?ials?\b/gi, 'Millennials'],
  [/\bHILLENNIAL\b/g, 'MILLENNIAL'],
  [/\bfingartie\b/gi, 'fingertips'],
  [/\bdort\b/gi, "don't"],
  [/\bwat\b(?=\s+to\b|\s+own\b)/g, 'want'],
  [/\bsignifican't\b/g, 'significant'],
  [/\brg\b(?=\s+(not|going|the|a|in|on))/g, 're'],
  [/\bshi\b/g, 'she'],
  [/\bali\b/g, 'all'],
  [/\beconomie\b/gi, 'economy'],
  [/\blifestile\b/gi, 'lifestyle'],
  [/\bpropert[yie]\b/gi, 'property'],
  [/\bcompan[yie]s?\b/gi, 'companies'],
  [/\btechnolog[yie]\b/gi, 'technology'],
  [/\bretail\b/gi, 'retail'],
  [/\binformation\b/gi, 'information'],
  [/\bpredecessors?\b/gi, 'predecessors'],
  [/\bgov(?:em)?ment\b/gi, 'government'],
  [/\bdemo?crati[cs]\b/gi, 'democratic'],
  [/\bimpor?tan?t\b/gi, 'important'],
  [/\bope?ortunit[yie]s?\b/gi, 'opportunities'],
  [/\bfamili?e?s\b/gi, 'families'],
  [/\beduca?tion\b/gi, 'education'],
  [/\bemploymen?t\b/gi, 'employment'],
  // 2023 passage specific
  [/\bSnookhom\b/g, 'Snookhorn'],
  [/\bSnookhor\b/g, 'Snookhorn'],
  [/\blitle\b(?=\s+did\b|\s+had\b)/g, 'little'],
  [/\bwide-cyed\b/g, 'wide-eyed'],
];

function cleanOCRA(text) {
  let cleaned = text;

  // Fix common OCR contraction errors (before other replacements)
  const contractions = [
    [/doesnt\b/gi, "doesn't"], [/dont\b/gi, "don't"], [/isnt\b/gi, "isn't"],
    [/wont\b/gi, "won't"], [/couldnt\b/gi, "couldn't"], [/wouldnt\b/gi, "wouldn't"],
    [/shouldnt\b/gi, "shouldn't"], [/havent\b/gi, "haven't"], [/hasnt\b/gi, "hasn't"],
    [/hadnt\b/gi, "hadn't"], [/didnt\b/gi, "didn't"], [/wasnt\b/gi, "wasn't"],
    [/werent\b/gi, "weren't"], [/cant\b/gi, "can't"],
  ];
  for (const [re, replacement] of contractions) {
    cleaned = cleaned.replace(re, replacement);
  }

  // Remove OCR noise characters before word-level fixes
  cleaned = cleaned
    .replace(/~~+/g, '')           // double tilde marks (em-dash OCR noise)
    .replace(/^J\s+/gm, '')        // leading "J " at line starts (misread quote)
    .replace(/---+/g, ' \u2014 ')   // normalize dashes
    .replace(/\u2013/g, '\u2014')  // en-dash → em-dash
    .replace(/\u2018|\u2019/g, "'") // smart single quotes → straight
    .replace(/\u201c|\u201d/g, '"') // smart double quotes → straight
    .replace(/\u2026/g, '...');    // ellipsis → ...

  // Fix known OCR patterns
  for (const [re, replacement] of KNOWN_OCR_FIXES) {
    cleaned = cleaned.replace(re, replacement);
  }

  // Context-aware pipe replacement: | → I only if surrounded by letters (OCR artifact)
  cleaned = cleaned.replace(/([a-zA-Z])[|]([a-zA-Z])/g, '$1I$2');
  // Also replace standalone | that appears to be I (before/after spaces or at word boundaries)
  cleaned = cleaned.replace(/(?<=[a-zA-Z])[|](?=\s|[.,!?;:]|$)/g, 'I');
  cleaned = cleaned.replace(/(?<=^|\s)[|](?=[a-zA-Z])/g, 'I');

  // Replace digit 1 that looks like I before letters (but NOT within numbers like 2012)
  cleaned = cleaned.replace(/(?<=^|\s)1(?=[a-z])/g, 'I');
  // Standalone i → I
  cleaned = cleaned.replace(/(?<=^|\s)i(?=[.,!?;:\s]|$)/g, 'I');

  // Fix missing spaces after punctuation
  cleaned = cleaned.replace(/([.!?])([A-Z])/g, '$1 $2');
  // Fix missing space after comma
  cleaned = cleaned.replace(/,([a-zA-Z])/g, ', $1');

  // Remove stray brackets but keep meaningful parentheses
  cleaned = cleaned.replace(/[\[\]{}]/g, '');
  // Keep parentheses for numbered items and answer choices

  // Normalize whitespace
  cleaned = cleaned
    .replace(/[|\\]/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/^ +/gm, '')
    .replace(/ +$/gm, '');

  // Split into lines for smart filtering
  let lines = cleaned.split('\n');
  let filteredLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { filteredLines.push(''); continue; }

    const words = trimmed.split(/\s+/).filter(Boolean);
    const alphaCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
    const digitCount = (trimmed.match(/\d/g) || []).length;
    const alphaRatio = alphaCount / Math.max(trimmed.length, 1);

    // Keep lines that:
    // (1) Are normal text (high alpha ratio)
    // (2) Have substantial digits (numbers, dates, years)
    // (3) Are short but meaningful (headers like "Text 1", job titles)
    // (4) Match DSE exam patterns (numbered items, job ads)
    const isDSEHeader = /^(Text\s+\d+|PART\s+[AB]\d?|Section\s+[AB]\d?|Job\s+[A-D]|-\s*\d+\s*-)/i.test(trimmed);
    const isNumberedItem = /^\s*(?:\d+[.)]|[A-D][.)]|\([a-z]\))\s/.test(trimmed);
    const isBulletItem = /^\s*[•·\-]\s/.test(trimmed);
    const isJobAd = /^(Job|Company|Position|Salary|Requirements|Diploma|Higher\s+diploma|Experience|Benefits|Contract)/i.test(trimmed);
    const isCommentLike = /^\s*(craftsman|girlantisan|bellanil|\w+\s*-\s*\d+\s+\w+\s+\d{4})/i.test(trimmed);

    // Skip reader comments (not part of exam)
    if (isCommentLike && alphaCount < 20) continue;

    if (words.length >= 3 && alphaRatio >= 0.35) {
      filteredLines.push(trimmed);
    } else if (words.length === 2 && (isDSEHeader || isJobAd)) {
      filteredLines.push(trimmed);
    } else if (isNumberedItem || isBulletItem) {
      filteredLines.push(trimmed);
    } else if (digitCount >= 4 && alphaRatio >= 0.2) {
      // Lines with substantial digits (years, percentages, scores)
      filteredLines.push(trimmed);
    } else if (words.length === 1 && alphaCount >= 4) {
      // Single strong word (e.g., "COMMENTS", "Answers")
      filteredLines.push(trimmed);
    }
  }

  let result = filteredLines.join('\n');

  // Detect and wrap reader comments section (craftsman, girlantisan, bellanil
  // or username - date patterns) — these are NOT part of exam content
  const commentSectionMatch = result.match(/\nCOMMENTS?\s*\n[\s\S]*$/i);
  if (commentSectionMatch) {
    result = result.slice(0, commentSectionMatch.index);
  }
  // Also strip if comments already embedded differently
  result = result.replace(/\n\d+\s*(craftsman|girlantisan|bellanil)\s*-.*(?:\n.*)*$/i, '');

  // Normalize whitespace
  result = result
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();

  // Wrap in HTML paragraphs for proper display (if not already HTML)
  if (!/^</.test(result) && !/<[a-z]/.test(result.slice(0, 100))) {
    result = addParagraphTags(result);
  }

  return result;
}

async function generatePassageFromReference(reference, callAI, difficulty = 'medium') {
  const stripped = reference.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim();
  if (stripped.length < 100) return null;

  const part = difficultyToPart[difficulty] || 'A';
  const target = WORD_COUNT_TARGETS[part] || WORD_COUNT_TARGETS.A;

  const prompt = `You are a DSE English Paper 1 passage writer. Write a NEW original passage on a DIFFERENT topic from the reference below.

OUTPUT FORMAT — CRITICAL (follow exactly):
- Each text MUST have an <h2> title. Multi-text passages MUST use <h3>Text N</h3> before each text's content.
- Each paragraph MUST be wrapped in <p> tags.
- Output ONLY valid HTML. No explanations, no commentary, no markdown, no word counts, no metadata.
- STOP immediately after the final </p>. Do NOT append anything after the HTML.
- Word count: ${target.min}–${target.max} words strictly. Do NOT exceed ${target.max}.

REQUIREMENTS:
- DIFFERENT topic from the reference, same genre and difficulty. If reference is a news feature with quotes, write a news feature with quotes. Do not default to persuasive essay.
- Use short paragraphs (1–3 sentences). Limit explicit transition words (Furthermore, Moreover, However) to at most 1 per 3 paragraphs; use implicit thematic transitions.
- Mix formal academic vocabulary with colloquial register (idioms, phrasal verbs). Direct factual language — no extended metaphors or literary flourishes.
- Limit named sources to 2–3 people per text. Keep argument structure straightforward — at most one counterargument layer per paragraph.
- If including characters: subtext over exposition (no direct theme-stating), elevated stakes (cannot be trivially resolved), emotional pivot.
- Use generic role descriptions ('a local resident') rather than fabricated names (max 1 named person per text). Ground in a specific HK community.
- Avoid round percentages — use precise numbers (63.4%, nearly three-quarters). No fabricated research institutes.
- COMPLETELY ORIGINAL — do not copy sentences, phrases, or facts from the reference.
- Multi-text: match reference's text count (do not create extra texts).

${difficulty === 'hard' ? `- MEDIUM/EASY — SUPPLEMENTARY:
  INFORMATIONAL TRIAD: Ground text in concrete factual anchors, qualitative human perspectives, and structural/systemic frameworks.
  COGNITIVE AMBIVALENCE: Revolve around a central paradox with no perfect resolution. Avoid absolute moral resolutions.
  TEXTUAL GAP: Shift temporal settings or emotional registers without explicit transition markers.` : `- HARD (B2-ADVANCED) — SUPPLEMENTARY:
  Internal Dialectics: Each text establishes a thesis, presents a radical subversion, then fails to cleanly resolve.
  Asymmetrical Text Matching: Texts must NOT share a one-to-one thematic relationship. Intersect obliquely.
  Multi-Layered Attribution: Separate narrator belief, cited expert argument, and anecdotal subject experience.`}

REFERENCE PASSAGE (for style analysis only — write about a DIFFERENT topic):
${stripped.slice(0, 6000)}`;

  const systemMsg = 'You are a DSE English Paper 1 passage writer.\n\n' +
    STRUCTURAL_CONSTRAINTS + '\n' + ARGUMENTATION_FLOW + '\n\n' +
    'Output ONLY valid passage HTML (<h2> titles, <h3>Text N</h3> headers, <p> paragraphs). No markdown, no metadata, no word counts.';
  const raw = await callAI(prompt, { system: systemMsg, temperature: 0.7, maxTokens: getMaxTokensForPart(part), timeout: 180000 });
  if (!raw) return null;

  let cleaned = raw.replace(/```(?:html)?\s*/gi, '').replace(/\s*```/g, '').trim();

  // Strip known footer patterns only (word counts, metadata, separator lines)
  cleaned = cleaned.replace(/\n---+\s*[\s\S]*$/, '');
  cleaned = cleaned.replace(/\n\*\*\*+\s*[\s\S]*$/, '');
  cleaned = cleaned.replace(/\n\d+\s*words?\s*.*$/i, '');
  cleaned = cleaned.replace(/\n(?:AI-generated|Generated by|Note:|Word count).*$/gi, '');

  const wc = cleaned.split(/\s+/).filter(Boolean).length;

  // Detect truncation: unclosed tags, mid-sentence cutoff, ends with ellipsis, or ends mid-word
  const hasUnclosedTags = /<[a-z][^>]*$/.test(cleaned) || (cleaned.match(/<p>/g) || []).length > (cleaned.match(/<\/p>/g) || []).length;
  const endsWithEllipsis = /\.{3,}$/.test(cleaned) || /…$/.test(cleaned);
  const endsMidWord = /[a-z]+–$/.test(cleaned) || /[a-z]+\n$/.test(cleaned);
  // Fixed: Check if the last paragraph's CONTENT (inside </p>) ends without punctuation,
  // not whether the raw string ends with a letter after stripping the closing tag.
  const lastParagraphMatch = cleaned.match(/<p>([\s\S]*?)<\/p>\s*$/);
  const lastParaContent = lastParagraphMatch ? lastParagraphMatch[1].trim() : '';
  const endsNoPunctuation = lastParaContent.length > 0 && /[a-z0-9]$/i.test(lastParaContent) && !/[,;:!?)\]>}$]/.test(lastParaContent.slice(-1));
  let wasTruncated = wc > target.max || hasUnclosedTags || endsWithEllipsis || endsMidWord || endsNoPunctuation;

  // Minimum paragraph count check
  const paraCount = (cleaned.match(/<p>/g) || []).length;
  const minParas = Math.max(4, Math.floor(target.max / 100));
  if (paraCount > 0 && paraCount < minParas) {
    wasTruncated = true;
  }

  // Last paragraph sentence count check
  const lastParaMatch = cleaned.match(/<p>([^<]+)<\/p>\s*$/);
  if (lastParaMatch) {
    const sentences = lastParaMatch[1].split(/[.!?]\s+/).filter(Boolean);
    if (sentences.length < 3) {
      wasTruncated = true;
    }
  }

  // Only retry on genuine truncation signals, not word count overflow or false positives
  const genuineTruncation = hasUnclosedTags || endsWithEllipsis || endsMidWord;
  if (genuineTruncation) {
    console.warn(`[DSE] Passage truncated (${wc}w). Retrying.`);
    const retryPrompt = prompt + '\n\nCRITICAL: Your previous output was cut off. Write a COMPLETE ' + target.min + '-' + target.max + ' word passage. Each paragraph in <p> tags. STOP after the final </p>.';
    const retryRaw = await callAI(retryPrompt, { system: systemMsg, temperature: 0.5, maxTokens: getMaxTokensForPart(part), timeout: 180000 });
    if (retryRaw) {
      let retryCleaned = retryRaw.replace(/```(?:html)?\s*/gi, '').replace(/\s*```/g, '').trim();
      retryCleaned = retryCleaned.replace(/\n---+\s*[\s\S]*$/, '');
      retryCleaned = retryCleaned.replace(/\n\*\*\*+\s*[\s\S]*$/, '');
      const retryWc = retryCleaned.split(/\s+/).filter(Boolean).length;
      if (retryWc >= target.min && retryWc <= target.max) {
        cleaned = retryCleaned;
      }
    }
  }

  if (wc < target.min) {
    console.warn(`[DSE] AI generated passage too short: ${wc}w`);
    return null;
  }
  if (wc > target.max) {
    console.warn(`[DSE] AI generated passage too long: ${wc}w — truncating to ${target.max}`);
    const words = cleaned.split(/\s+/);
    cleaned = words.slice(0, target.max - 20).join(' ') + '</p>';
  }

  if (!/^</.test(cleaned) && !/<[a-z]/.test(cleaned.slice(0, 100))) {
    cleaned = addParagraphTags(cleaned);
  }

  return { content: cleaned, truncated: wasTruncated, aiWordCount: wc, originalWordCount: stripped.split(/\s+/).filter(Boolean).length };
}

const difficultyToPart = { easy: 'B1', medium: 'A', hard: 'B2' };
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const PAPER_TYPES = ['reading', 'writing', 'listening', 'speaking'];

async function generatePassageFromRAG(fragments, callAI, difficulty = 'medium') {
  const part = difficultyToPart[difficulty] || 'A';
  const target = WORD_COUNT_TARGETS[part] || WORD_COUNT_TARGETS.A;
  const firstSource = fragments[0] || {};

  const fragmentsSection = fragments.map((f, i) =>
    `[FRAGMENT ${i + 1}] Source: ${f.sourceName || 'Unknown'}, ${f.sourceDate || 'Date unknown'}\n${f.text}`
  ).join('\n\n');

  const prompt = `You are a DSE English Paper 1 passage writer. Write an original passage based on the source fragments below.

OUTPUT FORMAT — CRITICAL (follow exactly):
- Each text MUST have an <h2> title. Multi-text passages MUST use <h3>Text N</h3> before each text's content.
- Each paragraph MUST be wrapped in <p> tags.
- Output ONLY valid HTML. No explanations, no commentary, no markdown, no word counts, no metadata.
- STOP immediately after the final </p>. Do NOT append anything after the HTML.
- Word count: ${target.min}–${target.max} words strictly. Do NOT exceed ${target.max}.

CRITICAL BLENDING INSTRUCTIONS:
- Use facts and statistics from the fragments as the factual backbone
- Do NOT copy any sentence verbatim
- Create original characters, quotes, and narrative framing
- The passage must read as an original composition, not a summary

REQUIREMENTS:
- Use short paragraphs (1–3 sentences). Limit explicit transition words (Furthermore, Moreover, However) to at most 1 per 3 paragraphs; use implicit thematic transitions.
- Mix formal academic vocabulary with colloquial register (idioms, phrasal verbs). Direct factual language — no extended metaphors or literary flourishes.
- Limit named sources to 2–3 people per text.
- Use generic role descriptions ('a local resident') rather than fabricated names.
- Avoid round percentages — use precise numbers (63.4%, nearly three-quarters). No fabricated research institutes.
- COMPLETELY ORIGINAL — do not copy sentences, phrases, or facts verbatim from fragments.

${difficulty === 'hard' ? `- MEDIUM/EASY — SUPPLEMENTARY:
  INFORMATIONAL TRIAD: Ground text in concrete factual anchors, qualitative human perspectives, and structural/systemic frameworks.
  COGNITIVE AMBIVALENCE: Revolve around a central paradox with no perfect resolution. Avoid absolute moral resolutions.
  TEXTUAL GAP: Shift temporal settings or emotional registers without explicit transition markers.` : `- HARD (B2-ADVANCED) — SUPPLEMENTARY:
  Internal Dialectics: Each text establishes a thesis, presents a radical subversion, then fails to cleanly resolve.
  Asymmetrical Text Matching: Texts must NOT share a one-to-one thematic relationship. Intersect obliquely.
  Multi-Layered Attribution: Separate narrator belief, cited expert argument, and anecdotal subject experience.`}

SOURCE FRAGMENTS:
${fragmentsSection}`;

  const systemMsg = 'You are a DSE English Paper 1 passage writer.\n\n' +
    STRUCTURAL_CONSTRAINTS + '\n' + ARGUMENTATION_FLOW + '\n\n' +
    'Output ONLY valid passage HTML (<h2> titles, <h3>Text N</h3> headers, <p> paragraphs). No markdown, no metadata, no word counts.';
  const raw = await callAI(prompt, { system: systemMsg, temperature: 0.7, maxTokens: getMaxTokensForPart(part), timeout: 180000 });
  if (!raw) return null;

  let cleaned = raw.replace(/```(?:html)?\s*/gi, '').replace(/\s*```/g, '').trim();
  cleaned = cleaned.replace(/\n---+\s*[\s\S]*$/, '');
  cleaned = cleaned.replace(/\n\*\*\*+\s*[\s\S]*$/, '');
  cleaned = cleaned.replace(/\n\d+\s*words?\s*.*$/i, '');
  cleaned = cleaned.replace(/\n(?:AI-generated|Generated by|Note:|Word count).*$/gi, '');

  const wc = cleaned.split(/\s+/).filter(Boolean).length;

  const hasUnclosedTags = /<[a-z][^>]*$/.test(cleaned) || (cleaned.match(/<p>/g) || []).length > (cleaned.match(/<\/p>/g) || []).length;
  const endsWithEllipsis = /\.{3,}$/.test(cleaned) || /…$/.test(cleaned);
  const endsMidWord = /[a-z]+–$/.test(cleaned) || /[a-z]+\n$/.test(cleaned);
  const lastParagraphMatch = cleaned.match(/<p>([\s\S]*?)<\/p>\s*$/);
  const lastParaContent = lastParagraphMatch ? lastParagraphMatch[1].trim() : '';
  const endsNoPunctuation = lastParaContent.length > 0 && /[a-z0-9]$/i.test(lastParaContent) && !/[,;:!?)\]>}$]/.test(lastParaContent.slice(-1));
  let wasTruncated = wc > target.max || hasUnclosedTags || endsWithEllipsis || endsMidWord || endsNoPunctuation;

  // Minimum paragraph count check
  const paraCount = (cleaned.match(/<p>/g) || []).length;
  const minParas = Math.max(4, Math.floor(target.max / 100));
  if (paraCount > 0 && paraCount < minParas) {
    wasTruncated = true;
  }

  // Only retry on genuine truncation signals, not word count overflow or false positives
  const genuineTruncation = hasUnclosedTags || endsWithEllipsis || endsMidWord;
  if (genuineTruncation) {
    console.warn(`[DSE] RAG passage truncated (${wc}w). Retrying.`);
    const retryPrompt = prompt + '\n\nCRITICAL: Your previous output was cut off. Write a COMPLETE passage. Each paragraph in <p> tags. STOP after the final </p>.';
    const retryRaw = await callAI(retryPrompt, { system: systemMsg, temperature: 0.5, maxTokens: getMaxTokensForPart(part), timeout: 180000 });
    if (retryRaw) {
      let retryCleaned = retryRaw.replace(/```(?:html)?\s*/gi, '').replace(/\s*```/g, '').trim();
      retryCleaned = retryCleaned.replace(/\n---+\s*[\s\S]*$/, '');
      retryCleaned = retryCleaned.replace(/\n\*\*\*+\s*[\s\S]*$/, '');
      const retryWc = retryCleaned.split(/\s+/).filter(Boolean).length;
      if (retryWc >= target.min && retryWc <= target.max) {
        cleaned = retryCleaned;
      }
    }
  }

  if (wc < target.min) {
    console.warn(`[DSE] RAG passage too short: ${wc}w`);
    return null;
  }
  if (wc > target.max) {
    console.warn(`[DSE] RAG passage too long: ${wc}w — truncating`);
    const words = cleaned.split(/\s+/);
    cleaned = words.slice(0, target.max - 20).join(' ') + '</p>';
  }

  if (!/^</.test(cleaned) && !/<[a-z]/.test(cleaned.slice(0, 100))) {
    cleaned = addParagraphTags(cleaned);
  }

  return {
    content: cleaned,
    truncated: wasTruncated,
    aiWordCount: wc,
    sourceName: firstSource.sourceName || null,
    sourceDate: firstSource.sourceDate || null,
  };
}

async function generatePureAIPassage(callAI, difficulty = 'medium') {
  const part = difficultyToPart[difficulty] || 'A';
  const target = WORD_COUNT_TARGETS[part] || WORD_COUNT_TARGETS.A;
  const textTypes = TEXT_TYPE_REQUIREMENTS[part] || TEXT_TYPE_REQUIREMENTS.A;

  const typesStr = textTypes.types.join(', ');
  const typePick = textTypes.types[Math.floor(Math.random() * textTypes.types.length)];

  const prompt = `You are a DSE English Paper 1 passage writer. Write an original passage.

OUTPUT FORMAT — CRITICAL (follow exactly):
- Each text MUST have an <h2> title. Multi-text passages MUST use <h3>Text N</h3> before each text's content.
- Each paragraph MUST be wrapped in <p> tags.
- Output ONLY valid HTML. No explanations, no commentary, no markdown, no word counts, no metadata.
- STOP immediately after the final </p>. Do NOT append anything after the HTML.
- Word count: ${target.min}–${target.max} words strictly. Do NOT exceed ${target.max}.

TEXT TYPE: ${typePick}
Available text types for this difficulty: ${typesStr}

REQUIREMENTS:
${STRUCTURAL_CONSTRAINTS}
${ARGUMENTATION_FLOW}
- Use short paragraphs (1–3 sentences). Limit explicit transition words (Furthermore, Moreover, However) to at most 1 per 3 paragraphs; use implicit thematic transitions.
- Mix formal academic vocabulary with colloquial register (idioms, phrasal verbs). Direct factual language — no extended metaphors or literary flourishes.
- Use generic role descriptions ('a local resident') rather than fabricated names (max 1 named person per text).
- Avoid round percentages — use precise numbers (63.4%, nearly three-quarters). No fabricated research institutes.
- COMPLETELY ORIGINAL — create all content from scratch.

${difficulty === 'hard' ? `- MEDIUM/EASY — SUPPLEMENTARY:
  INFORMATIONAL TRIAD: Ground text in concrete factual anchors, qualitative human perspectives, and structural/systemic frameworks.
  COGNITIVE AMBIVALENCE: Revolve around a central paradox with no perfect resolution.
  TEXTUAL GAP: Shift temporal settings or emotional registers without explicit transition markers.` : `- HARD (B2-ADVANCED) — SUPPLEMENTARY:
  Internal Dialectics: Each text establishes a thesis, presents a radical subversion, then fails to cleanly resolve.
  Asymmetrical Text Matching: Texts must NOT share a one-to-one thematic relationship.
  Multi-Layered Attribution: Separate narrator belief, cited expert argument, and anecdotal subject experience.`}`;

  const systemMsg = 'You are a DSE English Paper 1 passage writer.\n\n' +
    STRUCTURAL_CONSTRAINTS + '\n' + ARGUMENTATION_FLOW + '\n\n' +
    'Output ONLY valid passage HTML (<h2> titles, <h3>Text N</h3> headers, <p> paragraphs). No markdown, no metadata, no word counts.';
  const raw = await callAI(prompt, { system: systemMsg, temperature: 0.7, maxTokens: getMaxTokensForPart(part), timeout: 180000 });
  if (!raw) return null;

  let cleaned = raw.replace(/```(?:html)?\s*/gi, '').replace(/\s*```/g, '').trim();
  cleaned = cleaned.replace(/\n---+\s*[\s\S]*$/, '');
  cleaned = cleaned.replace(/\n\*\*\*+\s*[\s\S]*$/, '');
  cleaned = cleaned.replace(/\n\d+\s*words?\s*.*$/i, '');
  cleaned = cleaned.replace(/\n(?:AI-generated|Generated by|Note:|Word count).*$/gi, '');

  const wc = cleaned.split(/\s+/).filter(Boolean).length;

  const hasUnclosedTags = /<[a-z][^>]*$/.test(cleaned) || (cleaned.match(/<p>/g) || []).length > (cleaned.match(/<\/p>/g) || []).length;
  const endsWithEllipsis = /\.{3,}$/.test(cleaned) || /…$/.test(cleaned);
  const endsMidWord = /[a-z]+–$/.test(cleaned) || /[a-z]+\n$/.test(cleaned);
  const lastParagraphMatch = cleaned.match(/<p>([\s\S]*?)<\/p>\s*$/);
  const lastParaContent = lastParagraphMatch ? lastParagraphMatch[1].trim() : '';
  const endsNoPunctuation = lastParaContent.length > 0 && /[a-z0-9]$/i.test(lastParaContent) && !/[,;:!?)\]>}$]/.test(lastParaContent.slice(-1));
  let wasTruncated = wc > target.max || hasUnclosedTags || endsWithEllipsis || endsMidWord || endsNoPunctuation;

  // Minimum paragraph count check
  const paraCount = (cleaned.match(/<p>/g) || []).length;
  const minParas = Math.max(4, Math.floor(target.max / 100));
  if (paraCount > 0 && paraCount < minParas) {
    wasTruncated = true;
  }

  // Retry on quality gate failures (not just truncation)
  if (wasTruncated || wc < target.min || wc > target.max) {
    console.warn(`[DSE] Pure AI passage failed quality gates (wc=${wc}, truncated=${wasTruncated}). Retrying.`);
    const retryPrompt = prompt + '\n\nCRITICAL: Your previous output failed quality checks. Write a COMPLETE passage with ' + target.min + '-' + target.max + ' words, short paragraphs (1-3 sentences each), and NO moralizing ending. End on a concrete image or unresolved action.';
    const retryRaw = await callAI(retryPrompt, { system: systemMsg, temperature: 0.5, maxTokens: getMaxTokensForPart(part), timeout: 180000 });
    if (retryRaw) {
      let retryCleaned = retryRaw.replace(/```(?:html)?\s*/gi, '').replace(/\s*```/g, '').trim();
      retryCleaned = retryCleaned.replace(/\n---+\s*[\s\S]*$/, '');
      retryCleaned = retryCleaned.replace(/\n\*\*\*+\s*[\s\S]*$/, '');
      retryCleaned = retryCleaned.replace(/\n\d+\s*words?\s*.*$/i, '');
      retryCleaned = retryCleaned.replace(/\n(?:AI-generated|Generated by|Note:|Word count).*$/gi, '');
      const retryWc = retryCleaned.split(/\s+/).filter(Boolean).length;
      if (retryWc >= target.min && retryWc <= target.max) {
        cleaned = retryCleaned;
        wasTruncated = false;
      }
    }
  }

  if (wc < target.min) {
    console.warn(`[DSE] Pure AI passage too short: ${wc}w`);
    return null;
  }
  if (wc > target.max) {
    console.warn(`[DSE] Pure AI passage too long: ${wc}w — truncating`);
    const words = cleaned.split(/\s+/);
    cleaned = words.slice(0, target.max - 20).join(' ') + '</p>';
  }

  if (!/^</.test(cleaned) && !/<[a-z]/.test(cleaned.slice(0, 100))) {
    cleaned = addParagraphTags(cleaned);
  }

  return { content: cleaned, truncated: wasTruncated, aiWordCount: wc };
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function useDSEPapers() {
  const { getItem, setItem } = useIndexedDB();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const bundled = bundledContent;

  const getCachedPapers = useCallback(async (type) => {
    try {
      const all = await getItem('crescendo-dse-papers');
      if (!all) return [];
      return all.filter(p => p.type === type);
    } catch { return []; }
  }, [getItem]);

  const cachePapers = useCallback(async (papers) => {
    try {
      await setItem('crescendo-dse-papers', papers);
    } catch { /* silent */ }
  }, [setItem]);

  const getPaper = useCallback(async (type, options = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const { difficulty, topic, paperId } = options;

      if (paperId) {
        const cached = await getCachedPapers(type);
        const found = cached.find(p => p.id === paperId);
        if (found) return found;
      }

      const cached = await getCachedPapers(type);
      let candidates = cached;

      if (difficulty) {
        candidates = candidates.filter(p => p.difficulty === difficulty);
      }
      if (topic) {
        candidates = candidates.filter(p =>
          (p.metadata?.topics || []).some(t => t.toLowerCase().includes(topic.toLowerCase())) ||
          (p.passages || []).some(pg => pg.title?.toLowerCase().includes(topic.toLowerCase()))
        );
      }

      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        return pick;
      }

      const bundledCandidates = bundled.filter(p => p.type === type);
      if (difficulty) {
        const filtered = bundledCandidates.filter(p => p.difficulty === difficulty);
        if (filtered.length > 0) {
          return filtered[Math.floor(Math.random() * filtered.length)];
        }
      }
      if (bundledCandidates.length > 0) {
        return bundledCandidates[Math.floor(Math.random() * bundledCandidates.length)];
      }

      return null;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getCachedPapers, bundled]);

  const generateReadingSession = useCallback(async (options = {}, callAI) => {
    setIsLoading(true);
    setError(null);
    try {
      const { difficulty = 'medium' } = options;

      const partMap = { easy: 'B1', medium: 'A', hard: 'B2' };
      const part = partMap[difficulty] || 'A';

      let finalTitle, finalContent, finalSource, finalQuestions;
      let yearInfo = null;
      let passageReconstructed = false;
      let passageTruncated = false;
      let ragFlowSourceName = null;
      let ragFlowSourceDate = null;
      let pureAiAttempted = false;

      // Step 0: Hybrid RAG-AI generation — try backend fragments first
      let ragFlowSuccess = false;
      try {
        const healthRes = await fetch('/api/health');
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          if (healthData.embeddings > 0) {
            const fragRes = await fetch('/api/rag/fragments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ topic: TEXT_TYPE_REQUIREMENTS[difficultyToPart[difficulty]]?.types[0] || 'feature', difficulty, count: 3 })
            });
            if (fragRes.ok) {
              const fragData = await fragRes.json();
              if (fragData.fragments?.length > 0 && callAI) {
                const generated = await generatePassageFromRAG(fragData.fragments, callAI, difficulty);
                if (generated?.content) {
                  finalContent = generated.content;
                  passageReconstructed = true;
                  passageTruncated = generated.truncated;
                  finalSource = 'dse';
                  const h2Match = generated.content.match(/<h2[^>]*>([^<]+)<\/h2>/);
                  if (h2Match) finalTitle = h2Match[1].trim();
                  yearInfo = { year: null, part: part };
                  finalQuestions = null;
                  ragFlowSourceName = generated.sourceName || null;
                  ragFlowSourceDate = generated.sourceDate || null;
                  ragFlowSuccess = true;
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('[DSE] RAG hybrid path failed, falling to DSE OCR:', e?.message || e);
      }

      // If RAG succeeded, generate questions from the passage
      if (ragFlowSuccess && finalContent) {
        const passagePreview = finalContent.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').slice(0, 4000);
        if (passagePreview.length > 200) {
          const numQuestions = difficulty === 'easy' ? 15 : difficulty === 'hard' ? 25 : 20;
          const qPrompt = `You are a DSE English Paper 1 examiner. Below is a reading passage for comprehension assessment.

TASK: Create ${numQuestions} original comprehension questions. Each must be answerable solely from the passage.

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

TYPE DIVERSITY: You MUST use at least 4 different question types. A good distribution for ${numQuestions} questions is: roughly 4–5 mcq, 3–4 tfng, 2–3 gap-fill, 2–3 short-answer, 1–2 open-ended, 1 matching, 1 pronoun-ref, 1 semantic-connect, 1 summary-cloze. Include at least 1 of the 3 advanced types (summary-cloze, pronoun-ref, semantic-connect).

SKILL TESTED — The "skillTested" field is SEPARATE from type. Choose one per question:
- mainIdea: understanding the overall argument/purpose
- detail: recalling specific facts
- inference: reading between the lines
- vocabInContext: word meaning from context
- tone: identifying the author's attitude
- purpose: why something is mentioned

TFNG RULES (Binary Overhaul):
- The stem MUST be a declarative STATEMENT ending with a period (.) — NOT a question.
- The correctAnswer must be exactly "T", "F", or "NG" (single letter).
- FALSE requires explicit, verifiable contradiction in the text. The statement must directly conflict with a specific sentence, not merely differ from the overall implication.
- NOT GIVEN applies when a statement is highly plausible and aligns with common sense, but simply cannot be verified from the text. Create NG items by:
  * Inserting an unmentioned comparison (e.g., stating X is "more effective" than Y when the text only says both are effective).
  * Inserting an unverified motive (e.g., stating a character did X "because of" Y when the text mentions the action but not the rationale).
- CRITICAL: Do NOT treat "False" and "Not Given" interchangeably. An NG answer must be a statement the passage neither confirms nor contradicts — not one it contradicts.
- If you include 4+ TFNG questions, at least 2 MUST be "NG". If 2–3 TFNG, at least 1 MUST be "NG".

MCQ & DISTRACTOR DESIGN (The Distractor Engine):
- The stem MUST be a QUESTION ending with a question mark (?) — NOT a statement. Statements should use "tfng" type instead.
- Only ONE option can be correct. The other three must be "plausible but partial" — 100% true from a different section of the text, but incorrect for this specific question.
- Design each distractor as one of these cognitive traps:
  * OVER-GENERALIZATION: Take a narrow sentiment from one character and frame it as the systemic consensus.
  * TEMPORAL/CAUSAL FLIP: Reverse the cause-and-effect relationship from a complex sentence.
  * KEYWORD BAIT: Use exact, highly visible phrases from the text but alter the syntax to change the meaning entirely.
- Each distractor must share FEWER THAN HALF of its words with any other option.
- Do NOT use negations of the correct answer as a distractor.

OPEN-ENDED & SHORT-ANSWER DESIGN (The Open-Ended Paradigm):
- These must NOT be answerable by copying a single line. Target synthesis across structural gaps.
- Force candidates to locate two competing forces within the text, bridge them, and articulate the tension.
- Focus stems on paradox, irony, and divergence:
  * Instead of asking what a character's plan is, ask why their plan contradicts their stated values.
  * Instead of asking for a definition, ask how different stakeholders interpret the same term differently.
- Use "Justification" prompts that require evidence for both perspectives before concluding.
- For these questions, the rubric field is REQUIRED for marks ≥2 — list evidence demands in requiredPoints and shallow responses in unacceptableAnswers.

COHERENCE & STRUCTURAL DESIGN (The Structural Shift):
- Shift question targets from what the text says to why the author chose to say it this way at this specific moment.
- Implement items targeting macro-coherence:
  * FUNCTIONAL TRANSITION: Ask about the relationship between two adjacent paragraphs where the transition marker has been omitted.
  * STRUCTURAL METAPHOR: Target opening hooks or closing imagery, asking how they mirror the psychological or systemic themes of the entire piece.
  * PERSPECTIVE SHIFT: Ask how the introduction of a new voice (e.g., an academic report following a personal narrative) alters the validity of previous arguments.
- These suit open-ended, short-answer, or tfng types — use the rubric field to capture the two competing elements the student must bridge.

DISTRIBUTION RULES: Distribute questions evenly across the entire passage — use the paragraphRef field to indicate which paragraph each question targets. At least 30% of questions must target the second half of the passage.

PARAPHRASE RULES: Do NOT copy exact sentences from the passage into question stems, TFNG statements, or gap-fill context. Paraphrase and rephrase to test comprehension, not visual pattern-matching. For gap-fill, the blank word must NOT appear verbatim in the immediately adjacent text — the student must understand meaning, not spot the word.

TRUNCATION RULES: The words "truncated", "cut off", "incomplete", "missing", "not shown", "not included", "before the passage", "after the passage" are BANNED in stems and explanations. If any of these words appear, the question is automatically rejected. The passage is COMPLETE and fully visible — every question must be answerable from the provided text.

For questions with marks ≥2, include a "rubric" field:
"rubric": {
  "requiredPoints": ["answer point 1", "answer point 2"],
  "unacceptableAnswers": ["wrong answer", "common mistake"]
}

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

CONCISENESS RULE (CRITICAL): Keep each question extremely short. Each question object must average ≤500 characters total. Explanations: max 1 sentence. Option texts: max 8 words each. Marks: omit rubric for 1-mark questions. Tight stems only — no fluff.

PASSAGE:
${passagePreview}`;

          async function tryRAGQuestions(basePrompt, maxRetries = 2) {
            const systemMsg = 'You are a DSE English Paper 1 examiner creating original comprehension questions. Return ONLY valid JSON array.';
            let lastQualityWarnings = [];
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              let prompt = basePrompt;
              if (attempt > 1) {
                await new Promise(r => setTimeout(r, (attempt - 1) * 1500));
                let retryMsg = '\n\nCRITICAL — Your previous output had the following issues that MUST be fixed:';
                if (lastQualityWarnings.length > 0) {
                  retryMsg += '\n- ' + lastQualityWarnings.join('\n- ');
                } else {
                  retryMsg += '\n- JSON syntax error. Keep each question short (≤500 chars).';
                }
                retryMsg += '\n\nReview each issue carefully and produce a corrected output.';
                prompt = basePrompt + retryMsg;
              }
              try {
                const raw = await callAI(prompt, { system: systemMsg, temperature: attempt === 1 ? 0.3 : 0.2, maxTokens: 4000, timeout: 300000 });
                if (!raw) continue;
                const jsonStr = raw.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
                const m = jsonStr.match(/\[[\s\S]*\]/);
                let parsed;
                try {
                  parsed = m ? JSON.parse(m[0]) : parseJSONArray(jsonStr);
                } catch (e) {
                  console.warn(`[DSE] RAG Q parse attempt ${attempt} failed:`, e?.message);
                  lastQualityWarnings = [];
                  continue;
                }
                if (parsed?.length >= 3) {
                  const normalized = parsed.map((q, i) => normalizeQuestion({ ...q, id: i + 1, part, marks: q.marks || 1 }));
                  const fixed = normalized.map(q => fixQuestionTypes(q));
                  const validated = fixed.map(q => validateQuestionAnswer(q)).filter(Boolean);
                  const invalid = normalized.length - validated.length;
                  const unknown = validated.filter(q => q.answerUnknown).length;
                  if (invalid > 0 || unknown > 0) {
                    console.warn(`[DSE] RAG: ${invalid} garbage + ${unknown} unknown (${normalized.length}→${validated.length} kept)`);
                  }
                  if (validated.length >= 3) {
                    const enriched = ensureNGCount(validated);
                    const quality = validateQuestions(enriched, passagePreview);
                    lastQualityWarnings = quality.warnings;
                    if (quality.valid) {
                      console.log(`[DSE] RAG AI generated ${validated.length} clean questions (attempt ${attempt})`);
                      return validated;
                    }
                    const minorPattern = /Missing rubric|Low type diversity|Need ≥2 NG/;
                    const majorWarnings = quality.warnings.filter(w => !minorPattern.test(w));
                    if (attempt >= 2 && majorWarnings.length === 0) {
                      console.log(`[DSE] RAG accepting ${validated.length} questions with minor warnings (attempt ${attempt})`);
                      return validated;
                    }
                    console.warn(`[DSE] RAG quality issues on attempt ${attempt}:`, quality.warnings.join('; '));
                    if (attempt < maxRetries) continue;
                    console.log(`[DSE] RAG accepting ${validated.length} questions with quality warnings (final attempt)`);
                    return validated;
                  }
                }
              } catch (e) {
                console.warn(`[DSE] RAG AI call attempt ${attempt} failed:`, e?.message);
                lastQualityWarnings = [];
              }
            }
            return null;
          }

          const ragQuestions = await tryRAGQuestions(qPrompt);
          if (ragQuestions) {
            finalQuestions = ragQuestions;
          } else {
            // Fall back to local AI
            await new Promise(r => setTimeout(r, 2000));
            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                const localPrompt = attempt === 1 ? qPrompt : qPrompt + '\n\nYour previous JSON was invalid. Return ONLY a valid JSON array.';
                const res = await fetch('/api/ai/chat/completions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    model: 'opencode/deepseek-v4-flash-free',
                    messages: [
                      { role: 'system', content: 'You are a DSE English Paper 1 examiner creating original comprehension questions. Return ONLY valid JSON array.' },
                      { role: 'user', content: localPrompt }
                    ],
                    max_tokens: 4000,
                    temperature: 0.3,
                  }),
                });
                if (res.ok) {
                  const data = await res.json();
                  const raw = data.choices?.[0]?.message?.content?.trim();
                  if (raw) {
                    const jsonStr = raw.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
                    const m = jsonStr.match(/\[[\s\S]*\]/);
                    let parsed;
                    try {
                      parsed = m ? JSON.parse(m[0]) : parseJSONArray(jsonStr);
                    } catch (e) {
                      console.warn(`[DSE] RAG local parse attempt ${attempt} failed:`, e?.message);
                      continue;
                    }
                    if (parsed?.length >= 3) {
                      const normalized = parsed.map((q, i) => normalizeQuestion({ ...q, id: i + 1, part, marks: q.marks || 1 }));
                      const fixed = normalized.map(q => fixQuestionTypes(q));
                      const validated = fixed.map(q => validateQuestionAnswer(q)).filter(Boolean);
                      if (validated.length >= 3) {
                        console.log(`[DSE] RAG local AI generated ${validated.length} questions (attempt ${attempt})`);
                        finalQuestions = validated;
                        break;
                      }
                    }
                  }
                }
              } catch (localErr) {
                console.warn(`[DSE] RAG local AI attempt ${attempt} failed:`, localErr?.message);
              }
            }
          }
        }
        if (!finalQuestions?.length) {
          console.warn('[DSE] RAG could not generate questions, falling to DSE OCR path');
        }
      }

      // Step 1: Try random DSE paper from backend (only if RAG didn't produce a passage)
      if (!ragFlowSuccess || !finalQuestions?.length) {
        try {
        const listRes = await fetch('/api/rag/content');
        if (listRes.ok) {
          const data = await listRes.json();
          const allPapers = data.dsePastPapers || [];
          const papers = allPapers.filter(p => /dse-ocr-20\d{2}-p1/.test(p.id));
          if (papers.length > 0) {
            const pick = papers[Math.floor(Math.random() * papers.length)];
            const fullRes = await fetch(`/api/rag/article/${pick.id}`);
            if (fullRes.ok) {
              const fullData = await fullRes.json();
              if (fullData?.content) {
                const passage = extractPassage(fullData.content, part);
                const cleaned = cleanOCRA(passage || fullData.content);
                const wc = cleaned.split(/\s+/).filter(Boolean).length;
                if (wc >= 150) {
                  const year = pick.year || fullData.date?.slice(0, 4) || '';
                  console.log(`[DSE] Using "${fullData.title || pick.id}" Part ${part} (${wc}w)`);
                  console.log(`[DSE] RAW OCR PASSAGE:`, cleaned);
                  yearInfo = { year, part };
                  finalTitle = fullData.title || `DSE Paper 1 Part ${part}`;
                  finalContent = cleaned;
                  finalSource = 'dse';
                  // Step 1.5: AI passage generation — learns from reference, creates new original passage
                  if (callAI && cleaned.length > 200) {
                    try {
                      const generated = await generatePassageFromReference(cleaned, callAI, difficulty);
                      if (generated?.content) {
                        finalContent = generated.content;
                        passageReconstructed = true;
                        passageTruncated = generated.truncated;
                        // Extract title from AI passage's <h2> tag
                        const h2Match = generated.content.match(/<h2[^>]*>([^<]+)<\/h2>/);
                        if (h2Match) finalTitle = h2Match[1].trim();
                        console.log(`[DSE] AI generated passage (${generated.aiWordCount}w, truncated: ${generated.truncated})`);
                      }
                    } catch (e) {
                      console.warn('[DSE] AI passage generation failed:', e?.message);
                    }
                  }
                  // Ensure raw text has basic HTML paragraph formatting
                  if (finalContent && !/<[a-z]>/i.test(finalContent.slice(0, 300))) {
                    finalContent = addParagraphTags(finalContent);
                  }
                  // RAG approach: AI generates original questions from the passage
                  if ((finalContent || cleaned).length > 200) {
                    const passagePreview = (finalContent || cleaned).replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').slice(0, 4000);
                    const numQuestions = difficulty === 'easy' ? 15 : difficulty === 'hard' ? 25 : 20;
                    const qPrompt = `You are a DSE English Paper 1 examiner. Below is a reading passage for comprehension assessment.

TASK: Create ${numQuestions} original comprehension questions. Each must be answerable solely from the passage.

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

TYPE DIVERSITY: You MUST use at least 4 different question types. A good distribution for ${numQuestions} questions is: roughly 4–5 mcq, 3–4 tfng, 2–3 gap-fill, 2–3 short-answer, 1–2 open-ended, 1 matching, 1 pronoun-ref, 1 semantic-connect, 1 summary-cloze. Include at least 1 of the 3 advanced types (summary-cloze, pronoun-ref, semantic-connect).

SKILL TESTED — The "skillTested" field is SEPARATE from type. Choose one per question:
- mainIdea: understanding the overall argument/purpose
- detail: recalling specific facts
- inference: reading between the lines
- vocabInContext: word meaning from context
- tone: identifying the author's attitude
- purpose: why something is mentioned

TFNG RULES (Binary Overhaul):
- The stem MUST be a declarative STATEMENT ending with a period (.) — NOT a question.
- The correctAnswer must be exactly "T", "F", or "NG" (single letter).
- FALSE requires explicit, verifiable contradiction in the text. The statement must directly conflict with a specific sentence, not merely differ from the overall implication.
- NOT GIVEN applies when a statement is highly plausible and aligns with common sense, but simply cannot be verified from the text. Create NG items by:
  * Inserting an unmentioned comparison (e.g., stating X is "more effective" than Y when the text only says both are effective).
  * Inserting an unverified motive (e.g., stating a character did X "because of" Y when the text mentions the action but not the rationale).
- CRITICAL: Do NOT treat "False" and "Not Given" interchangeably. An NG answer must be a statement the passage neither confirms nor contradicts — not one it contradicts.
- If you include 4+ TFNG questions, at least 2 MUST be "NG". If 2–3 TFNG, at least 1 MUST be "NG".

MCQ & DISTRACTOR DESIGN (The Distractor Engine):
- The stem MUST be a QUESTION ending with a question mark (?) — NOT a statement. Statements should use "tfng" type instead.
- Only ONE option can be correct. The other three must be "plausible but partial" — 100% true from a different section of the text, but incorrect for this specific question.
- Design each distractor as one of these cognitive traps:
  * OVER-GENERALIZATION: Take a narrow sentiment from one character and frame it as the systemic consensus.
  * TEMPORAL/CAUSAL FLIP: Reverse the cause-and-effect relationship from a complex sentence.
  * KEYWORD BAIT: Use exact, highly visible phrases from the text but alter the syntax to change the meaning entirely.
- Each distractor must share FEWER THAN HALF of its words with any other option.
- Do NOT use negations of the correct answer as a distractor.

OPEN-ENDED & SHORT-ANSWER DESIGN (The Open-Ended Paradigm):
- These must NOT be answerable by copying a single line. Target synthesis across structural gaps.
- Force candidates to locate two competing forces within the text, bridge them, and articulate the tension.
- Focus stems on paradox, irony, and divergence:
  * Instead of asking what a character's plan is, ask why their plan contradicts their stated values.
  * Instead of asking for a definition, ask how different stakeholders interpret the same term differently.
- Use "Justification" prompts that require evidence for both perspectives before concluding.
- For these questions, the rubric field is REQUIRED for marks ≥2 — list evidence demands in requiredPoints and shallow responses in unacceptableAnswers.

COHERENCE & STRUCTURAL DESIGN (The Structural Shift):
- Shift question targets from what the text says to why the author chose to say it this way at this specific moment.
- Implement items targeting macro-coherence:
  * FUNCTIONAL TRANSITION: Ask about the relationship between two adjacent paragraphs where the transition marker has been omitted.
  * STRUCTURAL METAPHOR: Target opening hooks or closing imagery, asking how they mirror the psychological or systemic themes of the entire piece.
  * PERSPECTIVE SHIFT: Ask how the introduction of a new voice (e.g., an academic report following a personal narrative) alters the validity of previous arguments.
- These suit open-ended, short-answer, or tfng types — use the rubric field to capture the two competing elements the student must bridge.

DISTRIBUTION RULES: Distribute questions evenly across the entire passage — use the paragraphRef field to indicate which paragraph each question targets. At least 30% of questions must target the second half of the passage.

PARAPHRASE RULES: Do NOT copy exact sentences from the passage into question stems, TFNG statements, or gap-fill context. Paraphrase and rephrase to test comprehension, not visual pattern-matching. For gap-fill, the blank word must NOT appear verbatim in the immediately adjacent text — the student must understand meaning, not spot the word.

TRUNCATION RULES: The words "truncated", "cut off", "incomplete", "missing", "not shown", "not included", "before the passage", "after the passage" are BANNED in stems and explanations. If any of these words appear, the question is automatically rejected. The passage is COMPLETE and fully visible — every question must be answerable from the provided text.

For questions with marks ≥2, include a "rubric" field:
"rubric": {
  "requiredPoints": ["answer point 1", "answer point 2"],
  "unacceptableAnswers": ["wrong answer", "common mistake"]
}

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

CONCISENESS RULE (CRITICAL): Keep each question extremely short. Each question object must average ≤500 characters total. Explanations: max 1 sentence. Option texts: max 8 words each. Marks: omit rubric for 1-mark questions. Tight stems only — no fluff.

PASSAGE:
${passagePreview}`;

                      async function tryGenerateQuestions(basePrompt, maxRetries = 2) {
                       const systemMsg = 'You are a DSE English Paper 1 examiner creating original comprehension questions. Return ONLY valid JSON array.';
                       let lastQualityWarnings = [];
                       for (let attempt = 1; attempt <= maxRetries; attempt++) {
                         let prompt = basePrompt;
                         if (attempt > 1) {
                           // Exponential backoff
                           await new Promise(r => setTimeout(r, (attempt - 1) * 1500));
                            let retryMsg = '\n\nCRITICAL — Your previous output had the following issues that MUST be fixed:';
                           if (lastQualityWarnings.length > 0) {
                             retryMsg += '\n- ' + lastQualityWarnings.join('\n- ');
                           } else {
                             retryMsg += '\n- JSON syntax error — Your output was too verbose and got truncated. Keep each question extremely short (≤500 chars per question). Tight stems, 1-sentence explanations, short options.';
                           }
                          retryMsg += '\n\nReview each issue carefully and produce a corrected output.';
                          prompt = basePrompt + retryMsg;
                        }
                        try {
                          const raw = await callAI(prompt, { system: systemMsg, temperature: attempt === 1 ? 0.3 : 0.2, maxTokens: 4000, timeout: 300000 });
                          if (!raw) continue;
                          const jsonStr = raw.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
                          const m = jsonStr.match(/\[[\s\S]*\]/);
                          let parsed;
                          try {
                            parsed = m ? JSON.parse(m[0]) : parseJSONArray(jsonStr);
                          } catch (e) {
                            console.warn(`[DSE] Parse attempt ${attempt} failed:`, e?.message);
                            lastQualityWarnings = [];
                            continue;
                          }
                          if (parsed?.length >= 3) {
                            const normalized = parsed.map((q, i) => normalizeQuestion({ ...q, id: i + 1, part, marks: q.marks || 1 }));
                            const fixed = normalized.map(q => fixQuestionTypes(q));
                            const validated = fixed.map(q => validateQuestionAnswer(q)).filter(Boolean);
                            const invalid = normalized.length - validated.length;
                            const unknown = validated.filter(q => q.answerUnknown).length;
                            if (invalid > 0 || unknown > 0) {
                              console.warn(`[DSE] ${invalid} garbage + ${unknown} answer-unknown (${normalized.length}→${validated.length} kept)`);
                            }
                            if (validated.length >= 3) {
                              const enriched = ensureNGCount(validated);
                              const quality = validateQuestions(enriched, passagePreview);
                              lastQualityWarnings = quality.warnings;
                              if (quality.valid) {
                                console.log(`[DSE] AI generated ${validated.length} clean questions (attempt ${attempt})`);
                                return validated;
                              }
                              // On attempt 2+, accept if only minor warnings (rubric/type diversity)
                              const minorPattern = /Missing rubric|Low type diversity|Need ≥2 NG/;
                              const majorWarnings = quality.warnings.filter(w => !minorPattern.test(w));
                              if (attempt >= 2 && majorWarnings.length === 0) {
                                console.log(`[DSE] Accepting ${validated.length} questions with minor warnings (attempt ${attempt})`);
                                return validated;
                              }
                              console.warn(`[DSE] Quality issues on attempt ${attempt}:`, quality.warnings.join('; '));
                              if (attempt < maxRetries) continue; // Retry with feedback
                              console.log(`[DSE] Accepting ${validated.length} questions with quality warnings (final attempt)`);
                              return validated;
                            }
                          }
                        } catch (e) {
                          console.warn(`[DSE] AI call attempt ${attempt} failed:`, e?.message);
                          lastQualityWarnings = [];
                        }
                      }
                      return null;
                    }

                    // Try external AI first, fall back to local opencode proxy
                    const external = await tryGenerateQuestions(qPrompt);
                    if (external) {
                      finalQuestions = external;
                    } else {
                      await new Promise(r => setTimeout(r, 2000));
                      for (let attempt = 1; attempt <= 2; attempt++) {
                        try {
                          const localPrompt = attempt === 1 ? qPrompt : qPrompt + '\n\nYour previous JSON was invalid. Fix it. Return ONLY a valid JSON array.';
                          const res = await fetch('/api/ai/chat/completions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              model: 'opencode/deepseek-v4-flash-free',
                               messages: [
                                 { role: 'system', content: 'You are a DSE English Paper 1 examiner creating original comprehension questions. Return ONLY valid JSON array.' },
                                { role: 'user', content: localPrompt }
                              ],
                              max_tokens: 4000,
                              temperature: 0.3,
                            }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const raw = data.choices?.[0]?.message?.content?.trim();
                            if (raw) {
                              const jsonStr = raw.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
                              const m = jsonStr.match(/\[[\s\S]*\]/);
                              let parsed;
                              try {
                                parsed = m ? JSON.parse(m[0]) : parseJSONArray(jsonStr);
                              } catch (e) {
                                console.warn(`[DSE] Local parse attempt ${attempt} failed:`, e?.message);
                                continue;
                              }
                              if (parsed?.length >= 3) {
                                const normalized = parsed.map((q, i) => normalizeQuestion({ ...q, id: i + 1, part, marks: q.marks || 1 }));
                                const fixed = normalized.map(q => fixQuestionTypes(q));
                                const validated = fixed.map(q => validateQuestionAnswer(q)).filter(Boolean);
                                const invalid = normalized.length - validated.length;
                                const unknown = validated.filter(q => q.answerUnknown).length;
                                if (invalid > 0 || unknown > 0) console.warn(`[DSE] Local: ${invalid} garbage + ${unknown} unknown (${normalized.length}→${validated.length})`);
                                if (validated.length >= 3) {
                                  const quality = validateQuestions(validated, passagePreview);
                                  if (!quality.valid) console.warn(`[DSE] Local quality issues:`, quality.warnings.join('; '));
                                  console.log(`[DSE] Local AI generated ${validated.length} questions (attempt ${attempt})`);
                                  finalQuestions = validated;
                                  break;
                                }
                              }
                            }
                          }
                        } catch (localErr) {
                          console.warn(`[DSE] Local AI attempt ${attempt} failed:`, localErr?.message);
                        }
                      }
                    }
                  } else {
                    console.warn('[DSE] Passage too short for question generation:', wc, 'words');
                  }
                  if (!finalQuestions?.length) {
                    console.warn('[DSE] Could not generate questions via AI, falling to bundled');
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('[DSE] Backend unavailable, falling to bundled:', e?.message || e);
      }
      } // end if(!ragFlowSuccess || !finalQuestions?.length)

      // Step 1.75: Pure AI fallback — generate entirely from AI when RAG and DSE OCR unavailable
      if (!finalContent && callAI) {
        pureAiAttempted = true;
        try {
          const pureAiResult = await generatePureAIPassage(callAI, difficulty);
          if (pureAiResult?.content) {
            finalContent = pureAiResult.content;
            passageReconstructed = true;
            passageTruncated = pureAiResult.truncated;
            finalSource = 'dse';
            const h2Match = pureAiResult.content.match(/<h2[^>]*>([^<]+)<\/h2>/);
            if (h2Match) finalTitle = h2Match[1].trim();
            yearInfo = { year: null, part: part };
            console.log(`[DSE] Pure AI passage generated (${pureAiResult.aiWordCount}w)`);
          }
        } catch (e) {
          console.warn('[DSE] Pure AI passage generation failed:', e?.message);
        }
      }

      // Step 2: Fallback to bundled if no content was generated at all
      if (!finalContent) {
        const candidates = bundled.filter(p => p.type === 'reading');
        let pick = null;
        if (difficulty) {
          const filtered = candidates.filter(p => p.difficulty === difficulty);
          if (filtered.length > 2) {
            pick = filtered[Math.floor(Math.random() * filtered.length)];
          }
        }
        if (!pick) pick = candidates[Math.floor(Math.random() * candidates.length)];
        if (pick) {
          const passageData = pick.passages?.[0];
          yearInfo = null;
          finalTitle = pick.title || passageData?.title || 'Reading Passage';
          finalContent = passageData?.content || '';
          finalSource = 'bundled';
          finalQuestions = (pick.questions || []).map((q, i) => ({
            ...q, id: i + 1, part: q.part || 'A', marks: q.marks || 1,
          }));
          console.log(`[RAG] Using bundled: "${finalTitle}"`);
        }
      }

      // Step 3: Build and return session
      if (!finalContent) return null;

      const readOnly = finalSource === 'dse' && !finalQuestions?.length && !pureAiAttempted;
      const wordCount = finalContent.split(/\s+/).filter(Boolean).length;
      const partLabel = yearInfo ? `${yearInfo.year} Part ${yearInfo.part}` : 'Part A';
      const partDifficulty = finalSource === 'dse' && yearInfo?.part
        ? { B1: 'easy', A: 'medium', B2: 'hard' }[yearInfo.part] || difficulty
        : difficulty;
      const combined = `<div class="reading__section-header reading__section-header--A">${partLabel}</div>\n${finalContent}`;
      const sections = {};
      for (const q of (finalQuestions || [])) {
        const s = q.part || 'A';
        if (!sections[s]) sections[s] = { questionCount: 0, marks: 0 };
        sections[s].questionCount++;
        sections[s].marks += q.marks || 1;
      }
      if (Object.keys(sections).length === 0) sections.A = { questionCount: 0, marks: 0 };

      const session = {
        id: `${finalSource}_${Date.now()}`,
        type: 'reading', source: finalSource === 'dse' ? 'ai-generated' : 'bundled',
        difficulty: partDifficulty, createdAt: new Date().toISOString(),
        title: finalTitle,
        passages: [{ id: 'p1', title: finalTitle, content: combined, wordCount }],
        questions: finalQuestions || [],
        sections,
        metadata: {
          topics: [yearInfo ? `${yearInfo.year} Part ${yearInfo.part}` : 'reading'],
          aiGenerated: finalSource === 'dse' && !ragFlowSourceName,
          ragGenerated: !!ragFlowSourceName,
          ragSource: ragFlowSourceName || (finalSource === 'dse' ? finalTitle : null),
          sourceName: ragFlowSourceName,
          sourceDate: ragFlowSourceDate,
          source: finalSource,
          timeLimit: (finalQuestions?.length || 6) * 90,
          year: yearInfo?.year || null,
          part: yearInfo?.part || null,
          readOnly,
          aiFailed: readOnly || undefined,
          passageReconstructed,
          passageTruncated,
        },
      };

      const existing = await getCachedPapers('reading') || [];
      await cachePapers([session, ...existing]);
      return session;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getCachedPapers, cachePapers, bundled]);

  const generateWritingPrompt = useCallback(async (options = {}, callAI) => {
    setIsLoading(true);
    setError(null);
    try {
      const { difficulty = 'medium', type = 'essay', topic = '' } = options;
      const notes = options.notes || [];

      const noteContexts = notes
        .filter(n => (n.content || '').length > 100)
        .slice(0, 5)
        .map(n => `[Note: ${n.title || 'Untitled'}]\n${n.content.replace(/<[^>]+>/g, '').slice(0, 1000)}`)
        .join('\n\n');

      const prompt = `Generate a HKDSE English Writing (Paper 2) prompt matching the official DSE format.

Type: ${type === 'essay' ? 'Argumentative / Discursive essay' : type === 'letter' ? 'Formal / Informal letter' : type === 'article' ? 'Magazine / Newspaper article' : 'Report / Proposal'}
Difficulty: ${difficulty}
Target word count: ${difficulty === 'easy' ? '300' : difficulty === 'medium' ? '400' : '500'} words (DSE Part B standard)

Requirements:
- The prompt must follow HKDSE Paper 2 format: role context + task description + guiding questions
- Part A task type: short task (200 words, e.g. letter, email, blog comment)
- Part B task type: long task (400-500 words) matching the specified type above
- Rubric categories: content (7 marks), organization (7 marks), language (7 marks) = 21 total (matching HKDSE)
- Lexical difficulty: IELTS band 7-9 vocabulary for DSE 5-5** level

${noteContexts ? `Student's notes for context:\n${noteContexts}\n\nUse these topics for inspiration in generating the prompt.` : ''}

Return as JSON:
{ "prompt": "the full prompt text including role, task, and guiding questions",
  "type": "${type}",
  "wordLimit": { "min": 400, "max": 500 },
  "difficulty": "${difficulty}",
  "rubricCategories": ["content", "organization", "language"],
  "rubricMaxMarks": { "content": 7, "organization": 7, "language": 7 },
  "suggestedPoints": ["point 1", "point 2", "point 3"] }`;

      const raw = await callAI(prompt, {
        system: 'You are an expert HKDSE English examiner (Paper 2 Writing). Target: IELTS band 7.24 = DSE 5** Writing. ' +
          'Generate a writing prompt in valid JSON format following official HKDSE Paper 2 format (role + task + guiding questions). Return ONLY valid JSON.\n\n' +
          `${STRUCTURAL_CONSTRAINTS}\n${ARGUMENTATION_FLOW}`,
        temperature: 0.8,
        maxTokens: 1000,
      });

      const parsed = parseJSONObject(raw);
      if (!parsed) throw new Error('AI returned invalid JSON');

      const session = {
        id: `ai_writing_${Date.now()}`,
        type: 'writing',
        source: 'ai-generated',
        difficulty,
        createdAt: new Date().toISOString(),
        prompt: parsed.prompt || '',
        metadata: {
          wordLimit: parsed.wordLimit || { min: 250, max: 350 },
          type: parsed.type || type,
          suggestedPoints: parsed.suggestedPoints || [],
          aiGenerated: true,
        },
      };

      const existing = await getCachedPapers('writing') || [];
      await cachePapers([session, ...existing]);

      return session;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getCachedPapers, cachePapers]);

  const getPapersBySource = useCallback(async (source) => {
    const all = await getCachedPapers('reading');
    const writing = await getCachedPapers('writing');
    return [...(all || []), ...(writing || [])].filter(p => p.source === source);
  }, [getCachedPapers]);

  const getAvailableSources = useCallback(() => {
    return ['bundled', 'ai-generated'];
  }, []);

  const getReadingHistory = useCallback(async () => {
    try {
      const all = await getItem('crescendo-reading-history');
      return all || [];
    } catch { return []; }
  }, [getItem]);

  const saveReadingSession = useCallback(async (session) => {
    try {
      const existing = await getReadingHistory();
      await setItem('crescendo-reading-history', [session, ...existing].slice(0, 50));
    } catch { /* silent */ }
  }, [getItem, setItem, getReadingHistory]);

function fixNotesHTML(content) {
  if (!content) return content;
  let html = content;
  // Convert markdown headings (## or ## ) to h2
  html = html.replace(/^#{1,3}\s+(.+)$/gm, '<h2>$1</h2>');
  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Convert *italic* to <em>
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Convert markdown tables to HTML tables
  html = html.replace(/^\|(.+)\|$/gm, (line) => {
    const cells = line.split('|').filter(Boolean).map(c => c.trim());
    if (cells.every(c => /^[-:\s]+$/.test(c))) return ''; // skip separator row
    return '<tr><td>' + cells.join('</td><td>') + '</td></tr>';
  });
  // Wrap consecutive <tr> in <table> if not already in one
  html = html.replace(/((?:<tr>.*?<\/tr>\s*)+)/g, '<table>$1</table>');
  // Convert horizontal rules
  html = html.replace(/^---+/gm, '<hr>');
  // Convert markdown links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  // Wrap consecutive lines in <p> if not already HTML
  const paragraphs = html.split(/\n\n+/);
  if (paragraphs.length > 1) {
    html = paragraphs.map(p => {
      const t = p.trim();
      if (!t || /^<[a-z]/.test(t) || /^<\/?[a-z]/.test(t)) return t;
      return `<p>${t}</p>`;
    }).join('\n');
  }
  return html;
}

const generateReadingNotes = useCallback(async (passage, questions, userAnswers, timers, callAI) => {
    const strippedPassage = passage.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').slice(0, 3000);
    const qaLines = questions.map((q, i) => {
      const ua = userAnswers[q.id];
      const correct = q.correctAnswer || '—';
      const userVal = ua !== null && ua !== undefined ? String(ua) : '(unanswered)';
      const status = userVal.toLowerCase().trim() === correct.toLowerCase().trim() ? '✓' : '✗';
      const time = timers?.[q.id] ? `${Math.round(timers[q.id] / 1000)}s` : '—';
      return `Q${i + 1} [${q.type}] ${status} Time:${time}
  Stem: ${q.stem}
  Correct: ${correct} | Your answer: ${userVal}
  ${q.options ? 'Options: ' + q.options.map(o => `${o.label}. ${o.text}`).join(' | ') : ''}
  ${q.explanation ? 'Explanation: ' + q.explanation : ''}`;
    }).join('\n\n');

    const prompt = `You are a DSE English tutor analyzing a student's reading exercise performance.

PASSAGE:
${strippedPassage}

QUESTIONS & ANSWERS:
${qaLines}

Generate comprehensive study notes in these sections. Use HTML formatting tags for readability — <h2> for section headings, <strong> for emphasis, <em> for italics, <table> for structured data, <ul>/<li> for lists.

<h2>📊 Performance Metrics</h2>
Break down accuracy by question type (Literal Retrieval, Inference, Tone & Attitude, etc.). Show percentages in a table. Include a time-dilation note: which questions took longest vs. quickest.

<h2>🎯 Distractor Deconstruction</h2>
For each MCQ the student got wrong, identify which cognitive trap was used (Over-generalization, Temporal/Causal Flip, or Keyword Bait) and explain why the distractor was plausible with text evidence.

<h2>🔍 TFNG Logic Matrix</h2>
For each TFNG the student got wrong, provide either: the Contradiction Proof (quote the exact contradicting line) for False answers, or the Boundary Proof (explain where the text stops and what the stem assumes) for Not Given answers.

<h2>🔬 Syntactic Breakdown</h2>
For any question involving a complex sentence from the passage, provide a sentence X-ray: isolate main subject+verb, bracket embedded clauses, highlight modifiers. Then give a plain English paraphrase.

<h2>💭 Ambivalence & Subtext Guide</h2>
For tone/metaphor questions, extract the linguistic clues (contrasting imagery, ironic juxtapositions) and map stakeholder perspectives if the text has multiple viewpoints.

<h2>📈 Next Steps</h2>
Give 2-3 concrete, specific recommendations for their next practice session based on their performance data.`;

    const systemMsg = 'You are a DSE English tutor. Output detailed study notes using HTML tags (<h2>, <strong>, <em>, <table>, <ul>, <li>). Do NOT use markdown syntax. No JSON.\n\n' + STRUCTURAL_CONSTRAINTS;
    try {
      const raw = await callAI(prompt, { system: systemMsg, temperature: 0.4, maxTokens: 2500, timeout: 45000 });
      return fixNotesHTML(raw) || '<p>Study notes could not be generated — the AI returned no output.</p>';
    } catch (e) {
      console.warn('[DSE] AI notes call failed:', e?.message || e);
      return `<h2>📊 Study Notes</h2><p>Analysis could not be generated. Score: ${questions.filter((q, i) => {
        const ua = userAnswers[q.id];
        const correct = q.correctAnswer || '';
        return String(ua || '').toLowerCase().trim() === correct.toLowerCase().trim();
      }).length}/${questions.length} correct.</p>`;
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await setItem('crescendo-dse-papers', []);
    } catch { /* silent */ }
  }, [setItem]);

  return useMemo(() => ({
    papers: bundled,
    isLoading,
    error,
    getPaper,
    generateReadingSession,
    generateWritingPrompt,
    getPapersBySource,
    getAvailableSources,
    getReadingHistory,
    saveReadingSession,
    generateReadingNotes,
    clearCache,
    bundled,
  }), [bundled, isLoading, error, getPaper, generateReadingSession, generateWritingPrompt, getPapersBySource, getAvailableSources, getReadingHistory, saveReadingSession, generateReadingNotes, clearCache]);
}
