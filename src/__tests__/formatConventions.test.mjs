// TDD: RED phase tests — formatConventions.js behavior verification
import assert from 'node:assert/strict';

let checkRequiredElements, buildFormatPromptSection, PART_A_FORMAT_RULES;

try {
  const mod = await import('../utils/formatConventions.js');
  checkRequiredElements = mod.checkRequiredElements;
  buildFormatPromptSection = mod.buildFormatPromptSection;
  PART_A_FORMAT_RULES = mod.PART_A_FORMAT_RULES;
} catch (e) {
  console.error('FAIL: Could not import formatConventions.js —', e.message);
  process.exit(1);
}

// Test 1: Letter with salutation
{
  const text = 'Dear Mr. Smith,\n\nI am writing to express my concern about the recent changes to the school library hours. As a regular user of the facility, I believe this will negatively impact many students.\n\nI hope you will reconsider this decision.\n\nYours sincerely,\nJohn Wong';
  const result = checkRequiredElements(text, 'letter');
  assert.equal(result.valid, true, 'Test 1a: letter with all elements should be valid');
  assert.equal(result.checks.hasSalutation, true, 'Test 1b: hasSalutation should be true');
  assert.equal(result.checks.hasClosing, true, 'Test 1c: hasClosing should be true');
  assert.equal(result.checks.hasSignature, true, 'Test 1d: hasSignature should be true');
  console.log('✓ Test 1 passed: Letter format detection');
}

// Test 2: Unknown text type returns pass-through
{
  const result = checkRequiredElements('', 'unknown_type');
  assert.equal(result.valid, true, 'Test 2a: unknown type should be valid');
  assert.deepEqual(result.checks, {}, 'Test 2b: checks should be empty object');
  assert.deepEqual(result.issues, [], 'Test 2c: issues should be empty array');
  console.log('✓ Test 2 passed: Unknown type passthrough');
}

// Test 3: Email with subject line, salutation, closing
{
  const text = 'Subject: Meeting Tomorrow\nHi there,\n\nJust a quick reminder about our meeting tomorrow at 3pm.\n\nCheers\nJohn';
  const result = checkRequiredElements(text, 'email');
  assert.equal(result.checks.hasSubject, true, 'Test 3a: hasSubject should be true');
  assert.equal(result.checks.hasSalutation, true, 'Test 3b: hasSalutation should be true');
  assert.equal(result.checks.hasClosing, true, 'Test 3c: hasClosing should be true');
  console.log('✓ Test 3 passed: Email format detection');
}

// Test 4: Proposal with title
{
  const text = 'Proposal: Improving Campus WiFi\n\nIntroduction\nThe current WiFi infrastructure is inadequate.\n\nRecommendations\nWe recommend upgrading to fibre optic.\n\nConclusion\nThis will greatly benefit all students.';
  const result = checkRequiredElements(text, 'proposal');
  assert.equal(result.checks.hasTitle, true, 'Test 4a: hasTitle should be true');
  console.log('✓ Test 4 passed: Proposal format detection');
}

// Test 5: buildFormatPromptSection returns correct string for known type
{
  const section = buildFormatPromptSection('letter');
  assert.match(section, /FORMAT CHECK \(Part A — letter\)/, 'Test 5a: contains FORMAT CHECK header');
  assert.match(section, /salutation, opening_purpose, body_points, closing_formula, signature/, 'Test 5b: contains required elements');
  assert.match(section, /formal or semi-formal/, 'Test 5c: contains register info');
  console.log('✓ Test 5 passed: buildFormatPromptSection for letter');
}

// Test 6: buildFormatPromptSection returns empty string for unknown type
{
  const section = buildFormatPromptSection('nonexistent_type');
  assert.equal(section, '', 'Test 6: unknown type returns empty string');
  console.log('✓ Test 6 passed: buildFormatPromptSection empty for unknown type');
}

// Test 7: PART_A_FORMAT_RULES contains all required text types
{
  const requiredTypes = ['letter', 'email', 'proposal', 'speech', 'article', 'report', 'blog', 'blog comment', 'questionnaire response'];
  for (const type of requiredTypes) {
    assert.ok(PART_A_FORMAT_RULES[type], `Test 7: ${type} should exist in PART_A_FORMAT_RULES`);
    assert.ok(Array.isArray(PART_A_FORMAT_RULES[type].requiredElements), `${type} should have requiredElements array`);
    assert.ok(typeof PART_A_FORMAT_RULES[type].register === 'string', `${type} should have register string`);
    assert.ok(Array.isArray(PART_A_FORMAT_RULES[type].commonErrors), `${type} should have commonErrors array`);
  }
  console.log('✓ Test 7 passed: All 9 text types present');
}

console.log('\n=== ALL TESTS PASSED ===');
