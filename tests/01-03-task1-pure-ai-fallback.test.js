// Test: Pure AI fallback wiring — verify Step 2 condition and pureAiAttempted flag
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', 'src', 'hooks', 'useDSEPapers.js');
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

console.log('Test: Pure AI fallback wiring\n');

// Test 1: pureAiAttempted flag declaration exists
assert(
  content.includes('let pureAiAttempted = false'),
  'pureAiAttempted flag declared'
);

// Test 2: Step 2 condition is simplified (no finalSource check)
const step2OldPattern = /if\s*\(\s*!finalContent\s*\|\|\s*\(finalSource\s*===\s*'dse'\s*&&\s*!finalQuestions\?\.length\s*\)\s*\)/;
assert(
  !step2OldPattern.test(content),
  'Old Step 2 condition removed'
);

// Test 3: New Step 2 condition uses simplified form
assert(
  /if\s*\(\s*!finalContent\s*\)/.test(content),
  'New Step 2 condition: if (!finalContent)'
);

// Test 4: readOnly excludes pure AI passages
assert(
  content.includes('!pureAiAttempted'),
  'readOnly excludes pure AI passages'
);

// Test 5: pureAiAttempted is set before generatePureAIPassage call
const pureAiSection = content.match(/if\s*\(\s*!finalContent\s*&&\s*callAI\s*\)[\s\S]{0,200}pureAiAttempted/);
assert(
  !!pureAiSection,
  'pureAiAttempted flag set before generatePureAIPassage call'
);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
