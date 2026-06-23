// Test: Genre templates and prompt enforcement rules exports
const path = require('path');
const fs = require('fs');

const filePath = path.resolve(process.cwd(), 'src', 'utils', 'structuralConstraints.js');
const content = fs.readFileSync(filePath, 'utf8');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.log(`  ✗ ${msg}`);
  }
}

console.log('Test: Genre templates and enforcement rules\n');

// Test 1: GENRE_TEMPLATES export exists
assert(content.includes('export const GENRE_TEMPLATES'), 'GENRE_TEMPLATES exported');

// Test 2: PROMPT_ENFORCEMENT_RULES export exists
assert(content.includes('export const PROMPT_ENFORCEMENT_RULES'), 'PROMPT_ENFORCEMENT_RULES exported');

// Test 3: At least 10 genre templates
const genreMatches = content.match(/'([^']+)':\s*{/g);
const genreCount = genreMatches ? genreMatches.length : 0;
assert(genreCount >= 10, `At least 10 genre templates (got ${genreCount})`);

// Test 4: Specific genres exist
assert(content.includes("'report':"), 'Has report genre');
assert(content.includes("'news report':"), 'Has news report genre');
assert(content.includes("'literary excerpt':"), 'Has literary excerpt genre');
assert(content.includes("'feature article':"), 'Has feature article genre');
assert(content.includes("'blog post':"), 'Has blog post genre');

// Test 5: Each template has structure, voice, features fields
assert(content.includes('structure:') && content.includes('voice:') && content.includes('features:'), 'Templates have structure/voice/features fields');

// Test 6: PROMPT_ENFORCEMENT_RULES contains key enforcement sections
assert(content.includes('PARAGRAPH LENGTH ENFORCEMENT'), 'Enforcement rules include paragraph length');
assert(content.includes('COLLOQUIAL DIALOGUE ENFORCEMENT'), 'Enforcement rules include colloquial dialogue');
assert(content.includes('CONCRETE NOUN ENFORCEMENT'), 'Enforcement rules include concrete noun');
assert(content.includes('MORALIZING ENDING FORBIDDEN'), 'Enforcement rules include moralizing ending');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
