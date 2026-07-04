import { useState, useCallback, useMemo } from 'react';
import { useIndexedDB } from './useIndexedDB';
import bundledContent from '../assets/bundled-content.json';
import { STRUCTURAL_CONSTRAINTS, ARGUMENTATION_FLOW, WORD_COUNT_TARGETS, TEXT_TYPE_REQUIREMENTS, getMaxTokensForPart, GENRE_TEMPLATES, PROMPT_ENFORCEMENT_RULES } from '../utils/structuralConstraints';
import { getAvailablePrompts, markPromptUsed, clearUsedPrompts, getDiversePrompts, getTopicDomains } from '../utils/writingPrompts';
import { getRandomPartAType, getRandomPartBType } from '../utils/textTypeDistribution';
import { scoreToDseLevel } from '../utils/dseGrading';
import { convertToHkeaa } from '../utils/ieltsToDseMap';
import { composeFullPrompt } from '../utils/questionGenerator';
import { validateQuestions as validateQuestionsNew } from '../utils/questionValidator';
import { QUESTION_TYPE_DISTRIBUTIONS, getTypeDistributionForPart } from '../utils/questionTypes';
import { checkRequiredElements, buildFormatPromptSection } from '../utils/formatConventions';

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

const VALID_TYPES = new Set(['mcq', 'tfng', 'gap-fill', 'short-answer', 'matching', 'open-ended', 'summary-cloze', 'pronoun-ref', 'semantic-connect']);
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
  if (ngCount >= 2) return [...questions];
  const needed = 2 - ngCount;
  let flipped = 0;
  return questions.map(q => {
    if (q.type !== 'tfng') return { ...q };
    if (flipped >= needed) return { ...q };
    if (/^ng$/i.test((q.correctAnswer || '').trim())) return { ...q };
    flipped++;
    return { ...q, correctAnswer: 'NG', explanation: (q.explanation || '') + ' [Not explicitly stated in the passage]' };
  });
}

// Legacy validator — kept for backward compatibility. New code uses questionValidator.js
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

  let prompt = `You are a DSE English Paper 1 passage writer. Write a NEW original passage on a DIFFERENT topic from the reference below.

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

  const genreInstructions = getGenreInstructions(difficulty, part);
  if (genreInstructions) {
    prompt += `\n\n${genreInstructions}`;
  }
  prompt += PROMPT_ENFORCEMENT_RULES;

  const systemMsg = 'You are a DSE English Paper 1 passage writer.\n\n' +
    STRUCTURAL_CONSTRAINTS + '\n' + ARGUMENTATION_FLOW + '\n' + PROMPT_ENFORCEMENT_RULES + '\n\n' +
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
    const plainText = cleaned.replace(/<[^>]+>/g, '');
    const words = plainText.split(/\s+/);
    cleaned = words.slice(0, target.max - 20).join(' ');
  }

  if (!/^</.test(cleaned) && !/<[a-z]/.test(cleaned.slice(0, 100))) {
    cleaned = addParagraphTags(cleaned);
  }

  return { content: cleaned, truncated: wasTruncated, aiWordCount: wc, originalWordCount: stripped.split(/\s+/).filter(Boolean).length };
}

const difficultyToPart = { easy: 'B1', medium: 'A', hard: 'B2' };
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const PAPER_TYPES = ['reading', 'writing', 'listening', 'speaking'];

function getGenreInstructions(difficulty, part) {
  const textTypes = TEXT_TYPE_REQUIREMENTS[part]?.types || ['news report'];
  const typePick = textTypes[Math.floor(Math.random() * textTypes.length)];
  const template = GENRE_TEMPLATES[typePick];
  if (!template) return '';
  return `TEXT TYPE: ${typePick}\nStructure: ${template.structure}\nVoice: ${template.voice}\nFeatures: ${template.features}`;
}

async function generatePassageFromRAG(fragments, callAI, difficulty = 'medium') {
  const part = difficultyToPart[difficulty] || 'A';
  const target = WORD_COUNT_TARGETS[part] || WORD_COUNT_TARGETS.A;
  const firstSource = fragments[0] || {};

  const fragmentsSection = fragments.map((f, i) =>
    `[FRAGMENT ${i + 1}] Source: ${f.sourceName || 'Unknown'}, ${f.sourceDate || 'Date unknown'}\n${f.text}`
  ).join('\n\n');

  let prompt = `You are a DSE English Paper 1 passage writer. Write an original passage based on the source fragments below.

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

  const genreInstructions = getGenreInstructions(difficulty, part);
  if (genreInstructions) {
    prompt += `\n\n${genreInstructions}`;
  }
  prompt += PROMPT_ENFORCEMENT_RULES;

  const systemMsg = 'You are a DSE English Paper 1 passage writer.\n\n' +
    STRUCTURAL_CONSTRAINTS + '\n' + ARGUMENTATION_FLOW + '\n' + PROMPT_ENFORCEMENT_RULES + '\n\n' +
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
    const plainText = cleaned.replace(/<[^>]+>/g, '');
    const words = plainText.split(/\s+/);
    cleaned = words.slice(0, target.max - 20).join(' ');
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

  let prompt = `You are a DSE English Paper 1 passage writer. Write an original passage.

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

  // Enhance with full genre template
  const genreTemplate = GENRE_TEMPLATES[typePick];
  if (genreTemplate) {
    prompt = prompt.replace(
      `TEXT TYPE: ${typePick}\nAvailable text types`,
      `TEXT TYPE: ${typePick}\nStructure: ${genreTemplate.structure}\nVoice: ${genreTemplate.voice}\nFeatures: ${genreTemplate.features}\nAvailable text types`
    );
  }
  prompt += PROMPT_ENFORCEMENT_RULES;

  const systemMsg = 'You are a DSE English Paper 1 passage writer.\n\n' +
    STRUCTURAL_CONSTRAINTS + '\n' + ARGUMENTATION_FLOW + '\n' + PROMPT_ENFORCEMENT_RULES + '\n\n' +
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
    const plainText = cleaned.replace(/<[^>]+>/g, '');
    const words = plainText.split(/\s+/);
    cleaned = words.slice(0, target.max - 20).join(' ');
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

// ─── Shared Quality Check Functions (exported for use by courseSchema.js) ───

export function isVerbatimRecall(question, answer, source) {
  const ans = String(answer).toLowerCase().trim();
  if (ans.length < 4 || ans.length > 120) return false;
  const src = source.toLowerCase();
  if (!src.includes(ans)) return false;
  const shortWords = ans.split(/\s+/);
  if (shortWords.length === 1 && src.includes(ans)) return true;
  if (shortWords.length <= 4 && src.includes(ans)) return true;
  return false;
}

export function estimateBloomDepth(stem) {
  const s = stem.toLowerCase();
  const recall = ['what is', 'what does', 'define', 'list', 'name', 'identify', 'when did', 'who wrote', 'according to', 'how many', 'what year', 'fill in the blank with'];
  const deep = ['compare', 'contrast', 'distinguish', 'differentiate', 'evaluate', 'judge', 'which is better', 'what is wrong', 'identify the problem', 'which strategy', 'diagnose', 'why does', 'what would happen', 'which best', 'most likely', 'which of the following best', 'choose the best'];
  for (const v of deep) if (s.includes(v)) return 4;
  for (const v of recall) if (s.startsWith(v) || s.includes(' ' + v) || s.includes(v)) return 1;
  return 3;
}

export function isFormulaQuestion(stem, answer) {
  const s = stem.toLowerCase();
  const prescriptiveCount = /how\s+(many|much)\s.*\b(should|typically|usually|must|does|do)\b/.test(s);
  if (prescriptiveCount) return true;
  if (/^\d+\s*[-–—to]+\s*\d+$/.test(String(answer).trim())) return true;
  if (/^\d+$/.test(String(answer).trim()) && parseInt(answer) > 1) return true;
  const entityCount = /\b(how many|how much)\b/.test(s);
  const structureEntity = /\b(sentences?|paragraphs?|words?|steps?|points?|stages?|phases?|parts?|sections?|marks?)\b/.test(s);
  const prescriptive = /\b(should|typically|usually|must|always|every)\b/.test(s);
  if (entityCount && structureEntity && prescriptive) return true;
  return false;
}

export function checkDistractors(options) {
  if (!Array.isArray(options) || options.length < 3) return ['need 4 options for MCQ'];
  const issues = [];
  const lens = options.map(o => String(o).length);
  const avgLen = lens.reduce((a, b) => a + b, 0) / lens.length;
  if (Math.max(...lens) > avgLen * 2.2) issues.push('one option is much longer than others — correct answer stands out');
  if (Math.min(...lens) < avgLen * 0.35) issues.push('one option is much shorter than others');
  return issues;
}

export function validateExercise(e, source) {
  const issues = [];
  if (!e.question || e.question.length < 15) issues.push('question too short (< 15 chars)');
  if (e.explanation && e.explanation.length < 35) issues.push('explanation too short (< 35 chars)');
  if (e.type === 'mcq' && e.answer && isVerbatimRecall(e.question, e.answer, source)) {
    issues.push('answer is a direct quote from source — rewrite to require reasoning, not recall');
  }
  if (isFormulaQuestion(e.question, e.answer)) {
    issues.push('question tests a memorized rule/formula (count, range, or prescription) — rewrite to require diagnosing/analyzing, not recalling a number');
  }
  const bloom = estimateBloomDepth(e.question || '');
  if (bloom <= 1) issues.push('question only tests recall (definitions, facts) — rewrite to require application, analysis, or evaluation');
  if (e.options) issues.push(...checkDistractors(e.options));
  return { passed: issues.length === 0, issues };
}

export function buildFeedback(failedItems) {
  return failedItems.map((e, i) => {
    const qShort = (e.question || '').substring(0, 60);
    return `Exercise ${i + 1} ("${qShort}..."):\n- ` + (e._issues || ['unknown issue']).join('\n- ');
  }).join('\n\n');
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
          const typeDist = getTypeDistributionForPart(part);
          const qPrompt = composeFullPrompt(passagePreview, numQuestions, part, typeDist);

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
                    // Also run new validator for enhanced type-specific checks
                    const newQuality = validateQuestionsNew(enriched, passagePreview);
                    const combined = [...quality.warnings];
                    if (!newQuality.valid) combined.push(...newQuality.warnings);
                    lastQualityWarnings = combined;
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
          const typeDist = getTypeDistributionForPart(part);
          const qPrompt = composeFullPrompt(passagePreview, numQuestions, part, typeDist);

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
                              // Also run new validator for enhanced type-specific checks
                              const newQuality = validateQuestionsNew(enriched, passagePreview);
                              const combined = [...quality.warnings];
                              if (!newQuality.valid) combined.push(...newQuality.warnings);
                              lastQualityWarnings = combined;
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

  const generateWritingSession = useCallback(async (options = {}, callAI) => {
    setIsLoading(true);
    setError(null);
    try {
      const { notes = [], forceAI = false } = options;
      const noteContexts = notes
        .filter(n => (n.content || '').length > 100)
        .slice(0, 5)
        .map(n => `[Note: ${n.title || 'Untitled'}]\n${n.content.replace(/<[^>]+>/g, '').slice(0, 1000)}`)
        .join('\n\n');

      let partA, partB;

      // Part A: try curated bank first
      if (!forceAI) {
        let partAPrompts = getAvailablePrompts('A', 1);
        if (partAPrompts.length === 0) {
          clearUsedPrompts();
          partAPrompts = getAvailablePrompts('A', 1);
        }
        if (partAPrompts.length > 0) {
          partA = { prompt: partAPrompts[0], source: 'curated' };
          markPromptUsed(partAPrompts[0].id);
        }
      }

      if (!partA) {
        const partAType = getRandomPartAType();
        const aiPrompt = `You are an expert HKDSE English examiner. Generate a realistic HKDSE Paper 2 Part A writing task.

TASK FORMAT: ${partAType.genre} (~200 words)

REALISTIC HONG KONG CONTEXT — The scenario must be grounded in a believable Hong Kong school or community situation. Examples: your school magazine, the Students' Association, a district council consultation, a local community centre, the Green Club, the English Society.

SPECIFIC ROLE — The student must have a clear role: "You are a Form 6 student who...", "You are the secretary of...", "You are a member of the Students' Association..."

TASK INSTRUCTION — Clear, specific instruction incorporating 2-3 things to cover. Do NOT present these as bullet-point hints — weave them into the task naturally.

HKEAA CONVENTIONS:
- Sign with "Chris Wong" (not your real name)
- Do NOT write addresses
- Word limit: ~200 words
- Use appropriate register for the text type

AVOID:
- Overly abstract or philosophical topics
- International contexts without Hong Kong grounding
- Topics requiring specialist knowledge
- Generic "discuss the pros and cons" without specific scenario

Student's notes for inspiration:
${noteContexts || 'No notes available.'}

Return EXACTLY this JSON format (no extra fields, no markdown):
{ "type": "${partAType.slug}",
  "title": "Short descriptive title",
  "context": "2-3 sentences setting up the realistic Hong Kong situation and the student's role",
  "task": "Clear task instruction incorporating 2-3 things to cover",
  "wordLimit": { "min": 180, "max": 250 },
  "instructions": "Exam-style instructions (e.g. 'Sign your name as Chris Wong. Do not write any addresses.')" }`;

        const raw = await callAI(aiPrompt, {
          system: 'You are an expert HKDSE English examiner. Generate a short Part A writing prompt in valid JSON. Return ONLY valid JSON. Do not include any text outside the JSON object.',
          temperature: 0.6,
          maxTokens: 800,
        });

        const parsed = parseJSONObject(raw);
        if (parsed) {
          partA = {
            prompt: { id: `ai_partA_${Date.now()}`, ...parsed, source: 'ai-generated' },
            source: 'ai-generated',
          };
        }
      }

      // Part A fallback: hardcoded prompt if everything failed
      if (!partA) {
        const fbType = getRandomPartAType();
        partA = {
          prompt: {
            id: 'fallback_partA',
            type: fbType.slug,
            title: 'Social Media Impact Survey',
            context: 'Your school is conducting a survey on how social media affects students\' study habits and well-being. As the head prefect, you have been asked to complete a questionnaire about your observations.',
            task: `Complete the questionnaire sections: (A) Describe three positive effects of social media on students. (B) Explain two negative impacts you have observed. (C) Suggest one way the school could help students use social media more responsibly.`,
            wordLimit: { min: 180, max: 250 },
            instructions: `Write about 200 words. Address all three sections.`,
            source: 'fallback',
          },
          source: 'fallback',
        };
      }

      // Part B: try curated bank first (get 3)
      if (!forceAI) {
        let partBPrompts = getDiversePrompts('B', 3);
        if (partBPrompts.length < 3) {
          clearUsedPrompts();
          partBPrompts = getDiversePrompts('B', 3);
        }
        if (partBPrompts.length >= 3) {
          partB = { options: partBPrompts.slice(0, 3), source: 'curated' };
          partBPrompts.slice(0, 3).forEach(p => markPromptUsed(p.id));
        }
      }

      if (!partB) {
        const type1 = getRandomPartBType();
        const type2 = getRandomPartBType();
        const type3 = getRandomPartBType();
        const aiPrompt = `Generate 3 distinct HKDSE English Paper 2 Part B writing prompts.

TEXT TYPES REQUIRED:
1. ${type1.label} (${type1.genre})
2. ${type2.label} (${type2.genre})
3. ${type3.label} (${type3.genre})

TOPIC DOMAINS — Each prompt must cover a DIFFERENT topic domain from this list: health, environment, technology, education, social issues, culture, career, sports, media, family. Do NOT repeat domains across the 3 prompts.

HONG KONG CONTEXT — Each prompt must be grounded in a realistic Hong Kong scenario. Use HK-specific institutions (School Management, District Council, HKSAR Government, South China Morning Post, Students' Association, Green Club, etc.), locations (Causeway Bay, Sham Shui Po, Tai O, etc.), and cultural references.

REALISTIC SCENARIOS — Ground each prompt in a concrete situation:
- A school committee meeting
- A community consultation
- A newspaper/magazine submission
- A government policy proposal
- A student-led initiative
- A local cultural event

FORMAT RULES:
- Each prompt has: context (1-2 sentences setting the situation), title, task (clear instruction), wordLimit (min:380, max:450), instructions
- Do NOT include suggested points or bullet hints — real HKDSE Part B gives NO hints
- Do NOT make topics require specialist knowledge
- Do NOT use overly abstract or philosophical topics
- Each prompt must discriminate between ability levels (accessible to all but allowing top candidates to excel)

Student's notes for inspiration:
${noteContexts || 'No notes available.'}

Return as a JSON array of exactly 3 objects:
[{"type":"...","title":"...","context":"...","task":"...","wordLimit":{"min":380,"max":450},"instructions":"..."},{"type":"...","title":"...","context":"...","task":"...","wordLimit":{"min":380,"max":450},"instructions":"..."},{"type":"...","title":"...","context":"...","task":"...","wordLimit":{"min":380,"max":450},"instructions":"..."}]`;

        const raw = await callAI(aiPrompt, {
          system: 'You are an expert HKDSE English examiner. Generate 3 distinct Part B writing prompts as a JSON array. Return ONLY valid JSON. Do not include any text outside the JSON array.',
          temperature: 0.7,
          maxTokens: 2000,
        });

        const parsed = parseJSONArray(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          partB = {
            options: parsed.slice(0, 3).map(p => ({ id: `ai_partB_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ...p, source: 'ai-generated' })),
            source: 'ai-generated',
          };
        }
      }

      // Part B fallback if everything failed
      if (!partB) {
        const fbTypes = [getRandomPartBType(), getRandomPartBType(), getRandomPartBType()];
        const fbTasks = [
          { title: 'Future of Online Learning', context: 'Your school is considering adopting a blended learning model with both online and in-person classes.', task: 'Write an article for your school magazine discussing the potential benefits and drawbacks.' },
          { title: 'Banning Single-Use Plastics', context: 'Your local district council is considering a ban on single-use plastics in all food outlets. Residents have been invited to submit their views.', task: 'Write a letter to the district council expressing your opinion on the proposed ban.' },
          { title: 'Youth Volunteering', context: 'Your school is launching a mandatory community service programme for all Form 5 and 6 students. Some students have expressed concerns.', task: 'Write a speech to be delivered at the next school assembly, addressing these concerns and encouraging participation.' },
        ];
        partB = {
          options: fbTypes.map((t, i) => ({
            id: `fallback_partB_${i + 1}`,
            type: t.slug,
            title: fbTasks[i].title,
            context: fbTasks[i].context,
            task: fbTasks[i].task,
            wordLimit: { min: 380, max: 450 },
            source: 'fallback',
          })),
          source: 'fallback',
        };
      }

      const session = {
        partA,
        partB,
        duration: 7200,
      };

      return session;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getCachedPapers, cachePapers]);

  /**
   * generateCourseExercises — AI-generates exercises from a lesson's reference content.
   * Takes the reference content and lesson topic, generates 3-5 exercises in the specified types.
   * Uses the course exercise schema (question, type, answer, explanation, options, difficulty).
   * Falls back to empty array if AI fails.
   */
  const generateCourseExercises = useCallback(async (referenceContent, lessonTitle, exerciseTypes, callAI, maxRetries = 2) => {
    if (!referenceContent || !lessonTitle) return [];

    const types = exerciseTypes || ['mcq', 'gap-fill', 'short-answer'];
    const typeSpecs = types.map(t => {
      switch (t) {
        case 'mcq': return 'mcq (multiple-choice with 4 options A-D, one correct)';
        case 'gap-fill': return 'gap-fill (fill in the blank — tests understanding of terminology/concepts)';
        case 'short-answer': return 'short-answer (requires 1-2 sentence written response explaining why/how, not what)';
        case 'sentence-rewrite': return 'sentence-rewrite (rewrite the sentence using the given word/phrase)';
        case 'matching': return 'matching (match 3-5 terms to their definitions — tests conceptual relationships)';
        case 'cloze': return 'cloze (fill in blanks with context-appropriate words)';
        case 'reordering': return 'reordering (arrange words/phrases in correct order)';
        default: return 'mcq';
      }
    }).join(', ');

    // Use module-level quality check functions (imported via closure)
    const buildFeedback = (failedItems) => {
      return failedItems.map((e, i) => {
        const qShort = (e.question || '').substring(0, 60);
        return `Exercise ${i + 1} ("${qShort}..."):\n- ` + (e._issues || ['unknown issue']).join('\n- ');
      }).join('\n\n');
    };

    const fewShotExamples = `Here are examples of the DEPTH expected — and what to avoid:

EXAMPLE GOOD (Analyze):
The passage discusses the 3C Strategy (Copy, Change, Create) for summary cloze. The instruction says a word "requires modification." Which C strategy should you use?
A) Copy  B) Change  C) Create
Answer: B
Why this is deep: Tests APPLICATION of a rule. The student must understand what "modification" means in context and map it to the correct strategy — not recall the definition of each C.

EXAMPLE GOOD (Evaluate):
A student writes a formal complaint letter: "Dear mate, I wanna tell you about a problem with your service." What register errors can you identify?
A) None — the tone matches a complaint  B) "mate" is too informal for a formal letter
C) The sentence is too short  D) "wanna" is a contraction not used in formal writing
Answer: B and D
Why this is deep: Requires DIAGNOSING register mismatch. The student must know what "formal register" means AND be able to spot violations in context.

EXAMPLE BAD (shallow formula — DO NOT copy):
BAD: "A 7/7 paragraph should typically contain how many sentences?"
Answer: "4-6"
Why this is bad: Tests memorization of a number, not understanding of what each sentence must DO. The student can answer correctly by remembering "4-6" without understanding paragraph development.`;

const formulaWarning = `\n
CRITICAL: Do NOT generate "how many X should Y contain?" questions. 
These test formula recall, not understanding. 
Instead, give the student a concrete example of student work and ask them to diagnose what's wrong.`;

    const buildPrompt = (feedback) => {
      const parts = [
        `You are a DSE English examiner writing questions for the lesson "${lessonTitle}".`,
        '',
        'LESSON CONTENT:',
        referenceContent,
        '',
        'First, analyze the lesson to identify:',
        '1. The CORE SKILL or CONCEPT being taught (not just facts)',
        '2. What students commonly misunderstand about this concept',
        '3. How a student would APPLY or MISAPPLY this concept in an exam scenario',
        '',
        `Then, generate EXACTLY 4 exercises of these types: ${typeSpecs}`,
        '',
        fewShotExamples,
        formulaWarning,
        '',
        'REQUIREMENTS for ALL exercises:',
        '1. Must test UNDERSTANDING or APPLICATION — NOT recall of a fact or direct quote',
        '2. The correct answer must NOT appear word-for-word as a short phrase in the lesson content',
        '3. For MCQ: exactly 4 options. Each distractor must be PLAUSIBLE (a real mistake a student might make)',
        '4. For gap-fill: the blank requires understanding the concept, not copying a word from the text',
        '5. For short-answer: requires explaining WHY or HOW, not just WHAT (1-2 sentences)',
        '6. Each explanation must explain the REASONING behind the answer (40+ chars)',
        '7. Difficulty: mix of medium (3) and hard (4-5)',
        '',
        'ANTI-PATTERNS — Do NOT generate:',
        '- "What is X?" or "What does X mean?" questions (pure definition recall)',
        '- Questions answerable by scanning for a single word or number',
        '- "How many X should Y contain?" questions (tests formula recall, not understanding)',
        '- Questions with numeric ranges as answers (tests memorized counts)',
        '- Distractors that are obviously wrong (absurd, comical, unrelated to topic)',
        '- Questions about minor details that don\'t test understanding of the core concept',
        '- Questions answerable without reading the reference content',
      ];

      if (feedback) {
        parts.push('', 'PREVIOUS ATTEMPT HAD THESE ISSUES — fix them:', feedback);
      }

      parts.push('', 'Return ONLY this JSON array (no markdown, no extra text):');
      parts.push('[',
        '  {',
        '    "question": "Exercise question",',
        '    "type": "mcq|gap-fill|short-answer|sentence-rewrite|matching|cloze|reordering",',
        '    "answer": "Correct answer",',
        '    "explanation": "Why correct (40+ chars)",',
        '    "difficulty": 3,',
        '    "options": ["A", "B", "C", "D"]',
        '  }',
        ']');

      return parts.join('\n');
    };

    let lastResult = null;
    let bestPassedCount = 0;
    let feedback = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const prompt = buildPrompt(feedback);
        const raw = await callAI(prompt, {
          system: 'You are a DSE English examiner generating deep comprehension exercises. Return ONLY valid JSON, no extra text.',
          temperature: 0.3,
          maxTokens: 2500,
        });
        const parsed = parseJSONArray(raw);
        if (!Array.isArray(parsed) || parsed.length < 3) {
          feedback = 'Returned invalid or incomplete JSON. Output must be a JSON array of 4 exercise objects.';
          continue;
        }
        const withValidation = parsed.slice(0, 5).map(e => {
          const { passed, issues } = validateExercise(e, referenceContent);
          return { ...e, _passed: passed, _issues: issues };
        });
        let passed = withValidation.filter(e => e._passed);
        let failed = withValidation.filter(e => !e._passed);

        // LLM-as-judge: evaluate passed exercises for depth
        if (passed.length >= 1) {
          try {
            const judgePrompt = `Rate each exercise's DEPTH on a scale of 1-4:
1 = FORMULA/MEMORIZED RULE (answerable by recalling a number, count, or prescription; e.g. "A 7/7 paragraph should contain how many sentences?")
2 = SURFACE RECALL (answerable by scanning for a fact or definition; e.g. "What is the 3C Strategy?")
3 = UNDERSTANDING (student must comprehend the concept to answer; e.g. "Which C strategy applies when a word needs modification?")
4 = REASONING (requires application, analysis, or evaluation; e.g. "Identify the register errors in this student's writing.")

${passed.map((e, i) => `Exercise ${i + 1}: "${(e.question || '').substring(0, 80)}"`).join('\n')}

Return ONLY valid JSON: { "scores": [3, 4, 2, 1], "reasons": ["why 3", "why 4", "why 2", "why 1"] }
scores length must be ${passed.length}.`;

            const judgeRaw = await callAI(judgePrompt, {
              system: 'You evaluate exercise depth. Return ONLY valid JSON.',
              temperature: 0.2,
              maxTokens: 800,
            });
            const judgeObj = tryParseJSON(judgeRaw);
            const judgeScores = judgeObj?.scores;

            if (Array.isArray(judgeScores) && judgeScores.length === passed.length) {
              const shallowFromJudge = [];
              const deepFromJudge = [];
              passed.forEach((e, i) => {
                const score = judgeScores[i];
                const scoreVal = typeof score === 'object' && score !== null ? score.score : score;
                if (typeof scoreVal === 'number' && scoreVal <= 2) {
                  shallowFromJudge.push({ ...e, _passed: false, _issues: [...(e._issues || []), `judge depth score ${scoreVal}/4 — surface-level, does not require genuine understanding`] });
                } else {
                  deepFromJudge.push(e);
                }
              });
              passed = deepFromJudge;
              failed = [...failed, ...shallowFromJudge];
            }
          } catch (e) {
            console.warn('[exercises] Judge failed, using heuristic depth filter:', e.message);
            passed = passed.filter(e => (estimateBloomDepth(e.question || '') || 3) >= 2);
          }
        }

        if (passed.length >= 3) {
          const clean = passed.map(e => {
            const { _passed, _issues, ...rest } = e;
            return rest;
          });
          lastResult = clean.slice(0, 5);
          break;
        }

        feedback = buildFeedback(failed);
        if (passed.length > bestPassedCount) {
          bestPassedCount = passed.length;
          const clean = passed.map(e => {
            const { _passed, _issues, ...rest } = e;
            return rest;
          });
          lastResult = clean.slice(0, 5);
        }
      } catch (e) {
        if (attempt === maxRetries) break;
        feedback = `Error: ${e.message}. Please try again with valid JSON output.`;
      }
    }

    return lastResult || [];
  }, []);

  const buildCorrectionPrompt = useCallback((part, essayData, selfAssessment) => {
    const { text, prompt: promptInfo } = essayData || {};
    const essayWords = (text || '').split(/\s+/).length;
    const expectedWords = promptInfo?.wordLimit || (part === 'A' ? 200 : 400);
    const wordCountNote = essayWords < expectedWords * 0.7
      ? `⚠️ UNDER-LENGTH: ~${essayWords} words (expected ~${expectedWords}). This likely harms content development and task fulfilment.`
      : essayWords > expectedWords * 1.5
        ? `⚠️ OVER-LENGTH: ~${essayWords} words (expected ~${expectedWords}). Quality may suffer from lack of proofreading.`
        : `Word count: ~${essayWords} words (appropriate for expected ~${expectedWords}).`;

    const noPromptWarning = !promptInfo?.task
      ? '⚠️ NO PROMPT PROVIDED — The original exam question was NOT available. You CANNOT verify task-fulfilment. Treat this as a general English proficiency assessment without task verification. CAP Content at 5/7 (you cannot confirm relevance to an unknown task). Mention this limitation clearly in your feedback.'
      : '';

    // Build dynamic format prompt section for Part A text types
    const formatPromptSection = part === 'A' && promptInfo?.type
      ? buildFormatPromptSection(promptInfo.type)
      : '';

    return `You are a strict HKDSE English examiner (Paper 2 Writing). You have marked thousands of real HKDSE scripts. Your feedback must be **honest, critical, and diagnostic**.

GRADING CALIBRATION — READ THIS FIRST:
- 9/9 should be EXTREMELY RARE — virtually flawless, sophisticated, insightful.
- 8/9 means excellent but with a specific identifiable weakness.
- 7/9 means good — competent, meets requirements, but has clear room for improvement.
- 5/9 means adequate — basic requirements met, notable weaknesses.
- Real IELTS examiners DO NOT inflate scores. Be honest and critical. A script that is "pretty good" should get 5/9, not 7/9.

TASK TO EVALUATE (Part ${part}):
---PROMPT---
Context: ${promptInfo?.context || ''}
Task: ${promptInfo?.task || ''}
Text type: ${promptInfo?.type || 'essay'}
${wordCountNote}
${noPromptWarning}
---END PROMPT---

---STUDENT'S ESSAY---
${text || ''}
---END ESSAY---

${selfAssessment?.length > 0 ? `The student is unsure about: ${selfAssessment.join(', ')}. Pay special attention to these areas.` : ''}

CRITICAL SCORING RULES:
1. TASK-FULFILMENT CHECK (MOST IMPORTANT): Compare the student's essay to the prompt BEFORE scoring.
   - Did the student write the CORRECT text type? (e.g., if prompt asks for a letter, a story scores TA 0-1)
   - Is the essay ON TOPIC? (e.g., if prompt asks about smartphones, a story about a mahjong shop is off-topic)
   - If the response is off-topic or wrong text type: Task Achievement = 0-1. Do NOT reward language quality in an off-topic response.
   - A partially relevant response scores TA 2-3, not 5-7.
   - For argumentative/persuasive tasks: assess argument quality — are claims supported by specific evidence, examples, or reasoning? Are counter-arguments considered? Mere assertion without evidence caps TA at 5/9.

2. FORMAT CHECK (Part A only):
${formatPromptSection || `Explicitly verify format elements:
   - Letters: salutation + subject line must be on SEPARATE lines, closing formula (Yours sincerely/faithfully), signature
   - Emails: subject line, appropriate sign-off, professional tone
   - Proposals: headed sections, formal structure, clear recommendations
   - Speeches: audience greeting, spoken register (rhetorical questions, direct address, varied sentence length for oral impact), concluding remarks with call to action
   - Articles: headline/title, engaging opening hook, appropriate register`}
   - Missing format elements reduce Coherence & Cohesion score by 1-2 bands.
   Note: Structural format elements (salutation, closing, signature) are checked by code separately. Your task is to evaluate how APPROPRIATELY these elements are USED — register, tone, and genre fit — not just whether they exist.

3. COHERENCE & COHESION includes genre conventions. A story written as a letter fails genre conventions entirely.
   - Speeches MUST show speech-specific features (audience address, rhetorical devices, oral rhythm), not just essay structure with a greeting tacked on.
   - Mechanical signposting ("First of all... Secondly... Finally") is NOT sophisticated cohesion. It is adequate (5/9) at best.

4. LEXICAL RESOURCE & GRAMMATICAL RANGE include register, sentence variety, and vocabulary precision.
   - Count sentence structure types: simple, compound, complex, compound-complex, inversion, fronting, participle clauses, conditionals.
   - If fewer than 4 distinct structure types are used, GRA should be at most 5/9.
   - "Adequate range" (5/9) does NOT mean "some errors but okay" — it means limited structural variety AND some errors.
   - "Good range" (6-7/9) requires at least 4-5 distinct structure types used naturally.

5. CONSISTENCY RULES:
   - If errors array is empty, GRA must be 9/9. If GRA ≤ 8, there MUST be at least 1 genuine error listed.
   - Task Achievement score and errors: if TA is 7-9, errors should be minor. If TA is 3-4, errors can be major.
   - Ensure pitfallsAvoided does not contradict vocabularySuggestions.

6. ERROR LISTING: Only list ACTUAL errors. Never include "no error found" entries or placeholders.
   - Identify error PATTERNS, not just individual mistakes. If the same error type (e.g., article usage) appears multiple times, flag it as a pattern.

7. VOCABULARY UPGRADES:
   - Never suggest C2 vocabulary that sounds unnatural in a DSE context.
   - Avoid redundant collocations.
   - Every suggestion must show the full sentence context.
   - Ensure upgrades match the register of the task (e.g., formal letter upgrades should maintain formality).

8. SECTION BREAKDOWN: Do NOT assign identical scores across sections. If all sections score the same, the breakdown provides no diagnostic value. Vary scores to reflect real paragraph-level quality differences.

9. MEMORISED PHRASE DETECTION: Identify over-reliance on memorised/template phrases.
   - If the essay reads like a standardised template with generic fill-in-the-blank content (e.g., "In this modern world...", "It goes without saying that...", "Last but not least...", "To conclude, it is imperative that...", "With the development of society..."), cap Task Achievement at 5/9.
   - Flag specific memorised phrases in errors/warnings section with type="style" and severity="Major".
   - Label each flagged phrase as "[MEMORISED PHRASE]" in the explanation.

IELTS WRITING BAND DESCRIPTORS (TA/CC/LR/GRA 0-9):

Task Achievement (TA):
- 9: Fully satisfies all criteria; well-developed, fully relevant, clearly positioned position, sustained argument
- 8: Addresses all requirements; well-developed, relevant, clear position throughout, few minor gaps
- 7: Addresses requirements; relevant main ideas extended, clear position, some minor irrelevancies
- 6: Addresses requirements; main ideas present but may be inadequately developed/unclear position
- 5: Addresses requirements only partially; some main ideas but insufficient development
- 4: Responds only in part; ideas relevant but poorly developed or repetitive
- 3: Does not adequately respond; barely addresses task, ideas largely irrelevant
- 2: Responds to nothing; completely off-topic or only lists points
- 1: Does not address the task at all

Coherence & Cohesion (CC):
- 9: Sequencing and cohesion are fully flexible and skillfully managed; paragraphing is skillful
- 8: Organises information and ideas logically; manages paragraphing skillfully; good range of cohesive devices
- 7: Organises ideas logically; uses paragraphing; uses a range of cohesive devices effectively
- 6: Arranges information coherently; uses cohesive devices effectively but may be mechanical; adequate paragraphing
- 5: Presents information with some organisation; basic cohesive devices used repetitively; limited paragraphing
- 4: Presents information with little organisation; limited range of cohesive devices; poor paragraphing
- 3: Makes little or no logical organisation of information; few cohesive devices; no paragraphing
- 2: Cannot organise ideas logically; minimal cohesive devices
- 1: No organisation whatsoever

Lexical Resource (LR):
- 9: Full flexibility; precise; rare incidental errors; wide range natural and sophisticated
- 8: Wide range; frequent precise vocabulary; rare minor errors; good range of less common lexical items
- 7: Sufficient range for clarity; some less common words; occasional errors; good flexibility
- 6: Adequate range; some errors in word choice; mixes simple and complex vocabulary
- 5: Limited range; frequent errors in word choice; basic vocabulary adequate for familiar situations
- 4: Minimal range; errors impede meaning; very limited range of simple words
- 3: Very limited vocabulary; severe errors; communication breaks down frequently
- 2: Barely intelligible; extremely limited range
- 1: Cannot convey even basic meaning

Grammatical Range & Accuracy (GRA):
- 9: Wide range; full flexibility; rare errors; predominantly error-free sentences
- 8: Wide range of structures; frequent error-free sentences; good control of grammar and punctuation
- 7: Variety of complex structures; frequent error-free sentences; good grammar control
- 6: Mix of simple and complex forms; some errors but they rarely impede communication
- 5: Limited range of structures; frequent errors; errors may cause some difficulty for reader
- 4: Limited range; frequent grammatical errors; errors may cause comprehension difficulties
- 3: Very limited range; errors predominate; communication difficult
- 2: Very few basic structures attempted; severe errors
- 1: No more than a few isolated errors; cannot convey meaning

FEEDBACK RULES:
1. FOR EACH rubric (TA, CC, LR, GRA): state a STRENGTH (quote exact phrase) and a SPECIFIC WEAKNESS (quote exact phrase) with a concrete suggestion.
2. Overall narrativeSummary: Be specific — reference the essay content. Name the text type and judge how well it meets genre conventions. If off-topic, state this clearly.
3. errors: Every error must include the EXACT original text, a correction, and a clear explanation. Only list ACTUAL errors — never include "no error found" entries or placeholders.
4. vocabularySuggestions: Map every suggestion to the specific sentence context. Suggest words at least one CEFR level higher. Do NOT suggest C2 vocabulary that sounds unnatural in a DSE context. Avoid redundant collocations.
5. targetedImprovements: Add 2-3 specific, actionable steps with full examples.
6. pitfallsAvoided: Only list genuine pitfalls avoided. Ensure these don't contradict your vocabulary suggestions.
7. goodLanguage: Highlight genuine strong phrases from the essay.

STRUCTURED FEEDBACK FORMAT:
- Your narrativeSummary must follow: OPENING → FINDINGS → CONCLUSION.
  Opening: State the purpose of the assessment and your overall position in one sentence. Example: "This assessment evaluates the student's ability to write a [text type] on [topic]. Overall, the response demonstrates [strength] but struggles with [weakness]."
  Findings: Discuss each rubric area (TA, CC, LR, GRA) in order. For each: state a finding, quote exact text as evidence, explain the grading impact, give a concrete suggestion.
  Conclusion: Restate the main finding in one sentence and give a brief recommendation.
- Every feedback comment must follow: FINDING → EVIDENCE → IMPACT → SUGGESTION. Never just state a problem — explain the mechanism. Example: "The student intends to [what they tried], but the phrase '[QUOTE]' shows [what actually happened], which reduces [specific grade criterion]. To fix this, they should [concrete step with example]."
- Use varied logical connectors naturally: "According to the rubric," "As a result," "This suggests that," "By contrast," "In addition," "Consequently." Avoid mechanical repetition of "also" or "but."
- Reference precisely: Quote exact text from the student's work. Never say "your writing has issues" — say "In the second paragraph, the phrase '[QUOTE]' demonstrates [specific problem]."
- Cover ALL parts of the prompt: If the task asks for X, Y, and Z, verify each is addressed. Note which parts are missing or underdeveloped.
- Keep feedback tightly linked to the task: Do not give generic advice about broad topics — focus on how the student's response meets or fails the specific prompt requirements. Grade based on the actual text, not assumed intent.

Return ONLY valid JSON with this exact schema:
{
  "ielts": {
    "taskAchievement": { "score": 0-9, "feedback": "Strength: [quote]. Weakness: [quote]. Suggestion: [advice]" },
    "coherenceCohesion": { "score": 0-9, "feedback": "Strength: [quote]. Weakness: [quote]. Suggestion: [advice]" },
    "lexicalResource": { "score": 0-9, "feedback": "Strength: [quote]. Weakness: [quote]. Suggestion: [advice]" },
    "grammaticalRangeAccuracy": { "score": 0-9, "feedback": "Strength: [quote]. Weakness: [quote]. Suggestion: [advice]" }
  },
  "overall": { "total": 0, "maxTotal": 36, "percentage": 0, "narrativeSummary": "Specific, essay-referenced feedback. State if off-topic/wrong text type." },
  "sectionBreakdown": {
    "introduction": { "score": 0-7, "feedback": "Specific feedback about the intro paragraph" },
    "body1": { "score": 0-7, "feedback": "..." },
    "body2": { "score": 0-7, "feedback": "..." },
    "conclusion": { "score": 0-7, "feedback": "..." }
  },
  "targetedImprovements": [
    { "area": "issue area", "currentWeakness": "student's actual mistake", "concreteFix": "full example of how to fix it" }
  ],
  "errors": [
    { "original": "exact text from essay", "correction": "corrected version", "explanation": "why this is wrong — name the grammar rule", "type": "grammar|vocabulary|structure|style|punctuation|spelling|content", "severity": "Critical|Major|Minor", "location": { "paragraph": 1, "line": 2 } }
  ],
  "goodLanguage": [ { "phrase": "exact quote from essay", "comment": "why this works well — specific to the context" } ],
  "vocabularySuggestions": [ { "original": "word from essay", "suggestion": "upgraded word (at least 1 CEFR level higher)", "cefrLevel": "B2|C1|C2", "context": "the full sentence where this word appears" } ],
  "pitfallsAvoided": [ "specific common DSE mistake this student successfully avoided" ],
  "inlineAnnotations": [ { "text": "exact text to annotate", "replacement": "corrected version", "type": "grammar", "color": "#ef5350" } ]
}`;
  }, []);

  const parseCorrectionResponse = useCallback((rawText) => {
    if (!rawText) return null;
    const cleaned = rawText.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
    let parsed = null;
    try { parsed = JSON.parse(cleaned); } catch {
      // Try to find a valid JSON object by searching for balanced braces
      let braceCount = 0;
      let startIdx = -1;
      for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] === '{') {
          if (startIdx === -1) startIdx = i;
          braceCount++;
        } else if (cleaned[i] === '}') {
          braceCount--;
          if (braceCount === 0 && startIdx !== -1) {
            try {
              const candidate = cleaned.slice(startIdx, i + 1);
              parsed = JSON.parse(candidate);
              break;
            } catch {}
          }
        }
      }
      // Last resort: try to close unclosed braces/strings
      if (!parsed) {
        try {
          const fixed = cleaned.replace(/,\s*([}\]])/g, '$1')
            .replace(/:\s*"([^"]*)$/gm, ': "$1"}')
            .replace(/:\s*([0-9]+)$/gm, ': $1}');
          parsed = JSON.parse(fixed);
        } catch {}
      }
    }
    if (!parsed) return null;

    // Schema guard: ensure ielts field exists
    if (!parsed.ielts) parsed.ielts = {};

    // Default missing IELTS sub-scores to 0 and normalize to 0.5 increments
    ['taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammaticalRangeAccuracy'].forEach(key => {
      if (!parsed.ielts[key] || typeof parsed.ielts[key].score !== 'number') {
        parsed.ielts[key] = { score: 0, feedback: '' };
      } else {
        parsed.ielts[key].score = Math.max(0, Math.min(9, Math.round(parsed.ielts[key].score * 2) / 2));
      }
    });

    // Convert IELTS scores to HKEAA Content/Organisation/Language via mapping
    try {
      const hkeaaScores = convertToHkeaa({
        ta: parsed.ielts.taskAchievement.score,
        cc: parsed.ielts.coherenceCohesion.score,
        lr: parsed.ielts.lexicalResource.score,
        gra: parsed.ielts.grammaticalRangeAccuracy.score,
      });
      parsed.content = { score: hkeaaScores.content, feedback: parsed.ielts.taskAchievement.feedback };
      parsed.organization = { score: hkeaaScores.organization, feedback: parsed.ielts.coherenceCohesion.feedback };
      parsed.language = { score: hkeaaScores.language, feedback: (parsed.ielts.lexicalResource.feedback || '') + (parsed.ielts.grammaticalRangeAccuracy.feedback ? '; ' + parsed.ielts.grammaticalRangeAccuracy.feedback : '') };
    } catch {
      // Fallback: default HKEAA scores to 0 if conversion fails
      parsed.content = { score: 0, feedback: '' };
      parsed.organization = { score: 0, feedback: '' };
      parsed.language = { score: 0, feedback: '' };
    }

    // Score clamping for backward compatibility
    ['content', 'organization', 'language'].forEach(cat => {
      if (parsed[cat]) {
        parsed[cat].score = typeof parsed[cat].score === 'number' ? Math.max(0, Math.min(7, Math.round(parsed[cat].score))) : 0;
      }
    });
    if (!parsed.overall) parsed.overall = {};
    if (!parsed.errors || !Array.isArray(parsed.errors)) parsed.errors = [];
    if (!parsed.vocabularySuggestions || !Array.isArray(parsed.vocabularySuggestions)) parsed.vocabularySuggestions = [];
    if (!parsed.goodLanguage || !Array.isArray(parsed.goodLanguage)) parsed.goodLanguage = [];
    if (!parsed.sectionBreakdown) parsed.sectionBreakdown = {};
    if (!parsed.targetedImprovements || !Array.isArray(parsed.targetedImprovements)) parsed.targetedImprovements = [];
    if (!parsed.pitfallsAvoided || !Array.isArray(parsed.pitfallsAvoided)) parsed.pitfallsAvoided = [];
    if (!parsed.inlineAnnotations || !Array.isArray(parsed.inlineAnnotations)) parsed.inlineAnnotations = [];
    return parsed;
  }, []);

  // --- Text-type verification (pre-scoring check) ---
  // Local helper: strip HTML to plain text
  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, '').replace(/\u00a0/g, ' ').trim();
  };

  const detectTextType = useCallback((text) => {
    if (!text) return 'unknown';
    const plain = stripHtml(text).toLowerCase();
    
    // Story/narrative indicators
    if (/once upon|he said|she said|narrat|story|fiction|plot|character|protagonist/i.test(plain) ||
        plain.split(/\s+/).length > 50 && /\b(he|she|they|we)\s+(said|thought|walked|ran|went|looked)\b/i.test(plain)) {
      return 'story';
    }
    // Letter indicators
    if (/dear\s|yours\s+(sincerely|faithfully)|to\s+whom|signature/i.test(plain) ||
        /^dear\s/i.test(plain.trim())) {
      return 'letter';
    }
    // Email indicators
    if (/subject:|best\s+(regards|regards)|kind\s+regards|cheers|sent\s+from/i.test(plain)) {
      return 'email';
    }
    // Speech indicators
    if (/ladies\s+and\s+gentlemen|honourable|distinguished|thank\s+you\s+for/i.test(plain) ||
        /^good\s+(morning|afternoon|evening)/i.test(plain.trim())) {
      return 'speech';
    }
    // Article indicators
    if (/headline|by\s+\w|in\s+my\s+opinion|as\s+someone/i.test(plain) ||
        plain.split(/\s+/).length > 100 && !/^dear\s/i.test(plain.trim()) && !/once\s+upon/i.test(plain)) {
      return 'article';
    }
    // Proposal/report indicators
    if (/propose|recommendation|objective|budget|resource|implementation/i.test(plain)) {
      return 'proposal';
    }
    // Review indicators
    if (/rate|recommend|worth|rating|review|critique|verdict/i.test(plain)) {
      return 'review';
    }
    
    return 'essay';
  }, []);

  const checkTextTypeMatch = useCallback((expectedType, essayText) => {
    const detected = detectTextType(essayText);
    const expectedLower = expectedType.toLowerCase();
    const detectedLower = detected.toLowerCase();
    
    if (expectedLower === detectedLower) return { match: true, detected };
    if ((expectedLower === 'letter' && detectedLower === 'email') ||
        (expectedLower === 'email' && detectedLower === 'letter')) {
      return { match: 'partial', detected, note: 'Similar format but different conventions' };
    }
    return { match: false, detected, note: `Expected: ${expectedType}, detected: ${detected}` };
  }, [detectTextType]);

  // --- Part A format checker ---
  const checkPartAFormat = useCallback((essayHTML, textType) => {
    const result = checkRequiredElements(essayHTML, textType || '');
    // Maintain backward compatibility with existing return shape
    const checks = result.checks || {};
    return {
      hasSalutation: checks.hasSalutation || false,
      hasClosingFormula: checks.hasClosing || false,
      hasSignature: checks.hasSignature || false,
      issues: result.issues,
    };
  }, []);

  // --- Output validation (post-AI correction) ---
  const validateCorrectionOutput = useCallback((result) => {
    const issues = [];
    
    if (result.errors && Array.isArray(result.errors)) {
      result.errors.forEach((err, i) => {
        if (err.explanation?.toLowerCase().includes('no error') || 
            err.original === err.correction ||
            !err.original || !err.correction) {
          issues.push(`Error entry #${i+1} appears to be a placeholder or hallucination`);
        }
      });
    }

    // Score-vs-errors consistency: if errors array is empty, Language must be 7
    const langScore = result.language?.score;
    const errorCount = result.errors?.length || 0;
    if (errorCount === 0 && langScore !== undefined && langScore < 7) {
      issues.push(`Inconsistency: Language score ${langScore}/7 but zero errors listed — if no errors, Language should be 7/7`);
    }
    if (errorCount > 0 && langScore === 7) {
      issues.push(`Inconsistency: Language score 7/7 but ${errorCount} error(s) listed — score should be 6/7 max with errors present`);
    }

    // Score-vs-severity check: if any Critical errors exist, Content/Language should be ≤5
    const hasCritical = result.errors?.some(e => e.severity === 'Critical');
    if (hasCritical && (result.content?.score || 0) > 5) {
      issues.push(`Inconsistency: Content score ${result.content.score}/7 but Critical errors present — Content should be ≤5`);
    }

    if (result.pitfallsAvoided && result.vocabularySuggestions) {
      const avoidsAdverbs = result.pitfallsAvoided.some(p => p.toLowerCase().includes('adverb'));
      const hasAdverbUpgrades = result.vocabularySuggestions.some(v => 
        v.suggestion && /\w+ly\b/.test(v.suggestion)
      );
      if (avoidsAdverbs && hasAdverbUpgrades) {
        issues.push('Inconsistency: claims student avoided adverbs but suggests adverb-heavy upgrades');
      }
    }

    // Check for suspicious uniform section scores
    if (result.sectionBreakdown) {
      const scores = Object.values(result.sectionBreakdown).map(s => s.score).filter(s => s !== undefined);
      if (scores.length >= 3 && new Set(scores).size === 1) {
        issues.push('Suspicious: all section scores are identical — AI may not have genuinely evaluated each paragraph');
      }
    }

    ['content', 'organization', 'language'].forEach(cat => {
      if (result[cat]?.score !== undefined && (result[cat].score < 0 || result[cat].score > 7)) {
        issues.push(`${cat} score ${result[cat].score} is out of range 0-7`);
      }
    });

    return { valid: issues.length === 0, issues };
  }, []);

  const combineCorrections = useCallback((partAResult, partBResult) => {
    // Real DSE weighting: Part A is 10% of subject, Part B is 15%. So Part B = 1.5x Part A.
    const WEIGHT_A = 2;
    const WEIGHT_B = 3;
    const TOTAL_WEIGHT = WEIGHT_A + WEIGHT_B;

    const weightedAvg = (a, b) => Math.round(((a || 0) * WEIGHT_A + (b || 0) * WEIGHT_B) / TOTAL_WEIGHT);

    const contentScore = weightedAvg(partAResult?.content?.score, partBResult?.content?.score);
    const orgScore = weightedAvg(partAResult?.organization?.score, partBResult?.organization?.score);
    const langScore = weightedAvg(partAResult?.language?.score, partBResult?.language?.score);
    const totalA = (partAResult?.content?.score || 0) + (partAResult?.organization?.score || 0) + (partAResult?.language?.score || 0);
    const totalB = (partBResult?.content?.score || 0) + (partBResult?.organization?.score || 0) + (partBResult?.language?.score || 0);
    // Weighted total out of 42: (A*2 + B*3) / 5 * 42 / 21... simpler: weighted pct
    const weightedPct = Math.round(((totalA * WEIGHT_A + totalB * WEIGHT_B) / (21 * TOTAL_WEIGHT)) * 100);
    const dseLevel = scoreToDseLevel(weightedPct, 'writing').level;

    // Average IELTS scores across parts
    const avgIelts = (a, b) => Math.round(((a || 0) * WEIGHT_A + (b || 0) * WEIGHT_B) / TOTAL_WEIGHT * 2) / 2;
    const combinedIelts = {};
    ['taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammaticalRangeAccuracy'].forEach(key => {
      const aVal = partAResult?.ielts?.[key]?.score;
      const bVal = partBResult?.ielts?.[key]?.score;
      if (aVal !== undefined || bVal !== undefined) {
        combinedIelts[key] = { score: avgIelts(aVal, bVal), feedback: 'Combined feedback' };
      }
    });

    return {
      content: { score: contentScore, feedback: [partAResult?.content?.feedback, partBResult?.content?.feedback].filter(Boolean).join(' ') },
      organization: { score: orgScore, feedback: [partAResult?.organization?.feedback, partBResult?.organization?.feedback].filter(Boolean).join(' ') },
      language: { score: langScore, feedback: [partAResult?.language?.feedback, partBResult?.language?.feedback].filter(Boolean).join(' ') },
      ielts: combinedIelts,
      overall: {
        total: totalA + totalB,
        maxTotal: 42,
        percentage: weightedPct,
        dseLevel,
        narrativeSummary: [partAResult?.overall?.narrativeSummary, partBResult?.overall?.narrativeSummary].filter(Boolean).join(' '),
      },
      errors: [...(partAResult?.errors || []), ...(partBResult?.errors || [])],
      vocabularySuggestions: [...(partAResult?.vocabularySuggestions || []), ...(partBResult?.vocabularySuggestions || [])],
      goodLanguage: [...(partAResult?.goodLanguage || []), ...(partBResult?.goodLanguage || [])],
      sectionBreakdown: { ...(partAResult?.sectionBreakdown || {}), ...(partBResult?.sectionBreakdown || {}) },
      pitfallsAvoided: [...(partAResult?.pitfallsAvoided || []), ...(partBResult?.pitfallsAvoided || [])],
      targetedImprovements: [...(partAResult?.targetedImprovements || []), ...(partBResult?.targetedImprovements || [])],
      inlineAnnotations: [...(partAResult?.inlineAnnotations || []), ...(partBResult?.inlineAnnotations || [])],
    };
  }, []);

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

  const writingSessionGet = useCallback(async () => {
    try {
      const all = await getItem('crescendo-writing-sessions');
      return all || [];
    } catch { return []; }
  }, [getItem]);

  const writingSessionSet = useCallback(async (sessions) => {
    try {
      await setItem('crescendo-writing-sessions', sessions);
    } catch { /* silent */ }
  }, [setItem]);

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

const generateWritingNotes = useCallback(async (correctionResult, partA, partB, partACorrection, partBCorrection, callAI) => {
    const buildSection = (corr, label) => {
      if (!corr) return '';
      const content = corr.content ? `${corr.content.score}/7` : '—';
      const org = corr.organization ? `${corr.organization.score}/7` : '—';
      const lang = corr.language ? `${corr.language.score}/7` : '—';
      const total = (corr.content?.score || 0) + (corr.organization?.score || 0) + (corr.language?.score || 0);
      const pct = Math.round((total / 21) * 100);
      let section = `<h2>${label}</h2>
<p><strong>Score:</strong> ${total}/21 (${pct}%)</p>
<p><strong>Content:</strong> ${content} | <strong>Organisation:</strong> ${org} | <strong>Language:</strong> ${lang}</p>`;
      if (corr.overall?.narrativeSummary) {
        section += `<p><em>${corr.overall.narrativeSummary.replace(/</g,'&lt;')}</em></p>`;
      }
      return section;
    };

    let prompt = `You are a DSE English tutor analyzing a student's writing performance. Generate comprehensive study notes using HTML tags (<h2>, <strong>, <em>, <ul>, <li>, <table>). No markdown. No JSON.

WRITING PERFORMANCE ANALYSIS`;

    // Add per-part sections when both available
    const hasBoth = partACorrection && partBCorrection;
    if (hasBoth) {
      prompt += `\n\n${buildSection(partACorrection, 'Part A Performance')}`;
      prompt += `\n\n${buildSection(partBCorrection, 'Part B Performance')}`;

      const totalA = (partACorrection.content?.score || 0) + (partACorrection.organization?.score || 0) + (partACorrection.language?.score || 0);
      const totalB = (partBCorrection.content?.score || 0) + (partBCorrection.organization?.score || 0) + (partBCorrection.language?.score || 0);
      const combinedPct = correctionResult?.overall?.percentage || Math.round(((totalA * 2 + totalB * 3) / (21 * 5)) * 100);
      prompt += `\n\n<h2>Combined Score</h2>
<p><strong>Weighted Total:</strong> ${correctionResult?.overall?.total || totalA + totalB}/42 (${combinedPct}%)</p>
<p><em>DSE weighting: Part A 40% + Part B 60%</em></p>`;
    } else {
      const corr = partACorrection || correctionResult;
      if (corr && (corr.content || corr.overall)) {
        prompt += `\n\n${buildSection(corr, 'Performance Summary')}`;
      }
    }

    // Determine which correction to pull structured data from (prefer combined when both, else single part)
    const dataSource = correctionResult?.errors?.length || correctionResult?.vocabularySuggestions?.length
      ? correctionResult
      : (partACorrection || correctionResult);

    const errorList = dataSource?.errors || [];
    const vocabList = dataSource?.vocabularySuggestions || [];
    const sectionBreakdown = dataSource?.sectionBreakdown || {};
    const pitfalls = dataSource?.pitfallsAvoided || [];
    const improvements = dataSource?.targetedImprovements || [];
    const goodLanguage = dataSource?.goodLanguage || [];
    const hasPrompt = partA?.prompt || partB?.prompt;

    prompt += `\n\n<h2>Error Analysis</h2>
${errorList.length > 0 ? '<table><tr><th>Type</th><th>Error</th><th>Correction</th></tr>' + errorList.slice(0, 15).map(e => `<tr><td>${e.type || 'general'}</td><td>${(e.error || '').replace(/</g,'&lt;')}</td><td>${(e.correction || '').replace(/</g,'&lt;')}</td></tr>`).join('') + '</table>' : '<p>No significant errors detected.</p>'}

<h2>Section-by-Section Breakdown</h2>
${Object.keys(sectionBreakdown).length > 0 ? Object.entries(sectionBreakdown).map(([key, val]) => `<p><strong>${key}:</strong> ${val.score || '—'}/7 ${val.feedback ? '- ' + val.feedback.replace(/</g,'&lt;') : ''}</p>`).join('') : '<p>Detailed section breakdown not available.</p>'}

<h2>Strong Language Use</h2>
${goodLanguage.length > 0 ? '<ul>' + goodLanguage.slice(0, 5).map(g => `<li>${g.replace(/</g,'&lt;')}</li>`).join('') + '</ul>' : '<p>Review the feedback above for strong language examples.</p>'}

<h2>Vocabulary Upgrades</h2>
${vocabList.length > 0 ? '<ul>' + vocabList.slice(0, 8).map(v => `<li><strong>${(v.original || '').replace(/</g,'&lt;')}</strong> → <em>${(v.suggestion || '').replace(/</g,'&lt;')}</em>${v.context ? '<br><small>Context: ' + v.context.replace(/</g,'&lt;') + '</small>' : ''}</li>`).join('') + '</ul>' : '<p>No vocabulary suggestions in this session.</p>'}

<h2>DSE Pitfalls</h2>
${pitfalls.length > 0 ? '<ul>' + pitfalls.map(p => `<li>${p.replace(/</g,'&lt;')}</li>`).join('') + '</ul>' : '<p>No specific pitfalls noted. Review the feedback for areas to watch.</p>'}

<h2>Targeted Improvements</h2>
${improvements.length > 0 ? '<ul>' + improvements.map(i => `<li>${i.replace(/</g,'&lt;')}</li>`).join('') + '</ul>' : '<p>Review the Next Steps section in your feedback for improvement suggestions.</p>'}

${!hasPrompt ? '\n<p><em>Note: This practice was completed without a prompt. Scores reflect general writing ability but may not fully represent exam performance.</em></p>' : ''}

Format the above data into well-structured study notes. Group related information. Use <h2> for main sections, <h3> for subsections.`;

    const systemMsg = 'You are a DSE English tutor. Output detailed study notes using HTML tags (<h2>, <h3>, <strong>, <em>, <ul>, <li>, <table>). Do NOT use markdown syntax. No JSON. Focus on actionable feedback the student can use to improve.';
    try {
      const raw = await callAI(prompt, { system: systemMsg, temperature: 0.4, maxTokens: 2500, timeout: 45000 });
      return fixNotesHTML(raw) || '<p>Study notes could not be generated — the AI returned no output.</p>';
    } catch (e) {
      console.warn('[DSE] Writing notes AI call failed:', e?.message || e);
      const errCount = dataSource?.errors?.length || 0;
      const totalScore = (correctionResult?.content?.score || 0) + (correctionResult?.organization?.score || 0) + (correctionResult?.language?.score || 0);
      const pct = correctionResult?.overall?.percentage || Math.round((totalScore / 21) * 100);
      return `<h2>Writing Analysis</h2><p>AI-powered study notes could not be generated.</p><p><strong>Score:</strong> ${totalScore}/21 (${pct}%) | <strong>Errors identified:</strong> ${errCount}</p>`;
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
    generateWritingSession,
    buildCorrectionPrompt,
    parseCorrectionResponse,
    detectTextType,
    checkTextTypeMatch,
    checkPartAFormat,
    validateCorrectionOutput,
    combineCorrections,
    getPapersBySource,
    getAvailableSources,
    getReadingHistory,
    saveReadingSession,
    generateReadingNotes,
    generateWritingNotes,
    clearCache,
    bundled,
    writingSessionGet,
    writingSessionSet,
    generateCourseExercises,
  }), [bundled, isLoading, error, getPaper, generateReadingSession, generateWritingSession, getPapersBySource, getAvailableSources, getReadingHistory, saveReadingSession, generateReadingNotes, generateWritingNotes, clearCache, writingSessionGet, writingSessionSet, buildCorrectionPrompt, parseCorrectionResponse, combineCorrections, detectTextType, checkTextTypeMatch, checkPartAFormat, validateCorrectionOutput, generateCourseExercises]);
}
