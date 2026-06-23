# Testing Patterns

**Analysis Date:** 2026-06-23

## Test Framework

**Status: No test framework is installed or configured.**

The project's `package.json` (at both root and `server/`) contains no testing dependencies. The document `AGENTS.md` explicitly states:

> *"No test/lint/typecheck scripts exist"*

There are:
- No Jest config (`jest.config.*`)
- No Vitest config (`vitest.config.*`)
- No Mocha, Jasmine, Ava, or other test runner
- No testing-library packages (`@testing-library/react`, `@testing-library/jest-dom`, etc.)
- No Cypress, Playwright, or Puppeteer for E2E tests
- No `test` or `spec` scripts in `package.json`

**No test files exist under `src/`.** A search for `*.test.*`, `*.spec.*`, and `__tests__/` directories yielded zero results within the project's own source code.

## Ad-Hoc Test Script

There is one standalone test script at the project root:

**File:** `test-extract-questions.mjs`

**Purpose:** Manually tests the `extractQuestionsBlock()` helper function against real DSE OCR data fetched from a running backend.

**Run command:**
```bash
node test-extract-questions.mjs
```

**Pattern (informal):**
```js
// Requires backend running at localhost:3001
async function main() {
  const years = [];
  for (let y = 2012; y <= 2023; y++) years.push(y);
  const parts = ['A', 'B1', 'B2'];
  let passed = 0;
  let failed = 0;

  for (const year of years) {
    const res = await fetch(`http://localhost:3001/api/rag/article/dse-ocr-${year}-p1`);
    if (!res.ok) { console.log(`[SKIP] ${year} — not found`); continue; }
    const block = extractQuestionsBlock(content, part);
    if (!block || block.length < 200) { failed++; continue; }
    // Count question numbers
    const qCount = (block.match(/\b\d{1,3}\.\s/g) || []).length;
    if (qCount < 3) failed++;
    else passed++;
  }
  console.log(`Results: ${passed} passed, ${failed} failed`);
}
main().catch(console.error);
```

This script is not integrated into any CI pipeline or npm script. It is run ad-hoc by developers.

## Test File Organization

**Not applicable** — no test organization exists.

**Recommended pattern if adding tests:**
```
src/
├── components/
│   ├── MCQQuestion.jsx
│   └── MCQQuestion.test.jsx     # co-located test
├── hooks/
│   ├── useNotes.js
│   └── useNotes.test.js         # co-located test
└── utils/
    ├── dseGrading.js
    └── dseGrading.test.js       # co-located test
```

## Test Structure

**Not applicable** — no tests exist. Based on the codebase patterns, the following conventions would be appropriate:

- **Framework:** Vitest (native ESM/JSX support, fast, compatible with Vite)
- **DOM testing:** `@testing-library/react` for component tests
- **Assertions:** `expect` (built into Vitest)

## Mocking

**Not applicable** — no mocking patterns exist.

**Key targets for mocks if adding tests:**
- `localStorage` — all persistent state flows through `useLocalStorage`, which reads from `localStorage`
- `window.speechSynthesis` — `useSpeech.js` and `useAudioRecorder.js` depend on Web Speech API
- `fetch` — `useAI.js` makes HTTP calls to AI endpoints
- `IndexedDB` — `useIndexedDB.js` wraps IndexedDB operations

## Fixtures and Factories

**Not applicable.** Example fixture pattern from the codebase (not for testing, but for bundled content):

**File:** `src/assets/bundled-content.json` — contains 5 offline reading passages with pre-built MCQs used when the backend is unavailable.

If writing tests, a factory function exists that could be reused — `createBlankNote()` in `src/hooks/useNotes.js`:
```js
function createBlankNote(overrides) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: 'Untitled',
    content: '',
    tags: [], color: '', position: null,
    createdAt: now, updatedAt: now,
    userEditedTitle: false, userEditedTags: false,
    aiGeneratedOnce: false,
    kind: '', kindOverridden: false, kindLastContentLength: 0,
    ...overrides,
  };
}
```

## Coverage

**Requirements:** None. No coverage tools are configured.

**View Coverage:** Not applicable.

## Test Types

**Unit Tests:**
- None exist.
- Highest-value candidates: `src/utils/dseGrading.js` (pure scoring/recommendation logic), `src/utils/noteParser.js` (string processing), `src/utils/corpusIndex.js` (content type detection)

**Integration Tests:**
- None exist.
- Highest-value candidates: `src/hooks/useAI.js` (AI API calls), `src/hooks/useNotes.js` (CRUD + localStorage)

**E2E Tests:**
- None exist.
- The application is a PWA with offline capabilities and could benefit from Playwright or Cypress for core user flows (create note, edit note, AI generation, DSE modules).

## Common Patterns

**Not applicable** — no test patterns established.

### Why This Matters

The absence of tests means:
1. No automated regression detection when refactoring
2. No confidence in edge cases (e.g., `dseGrading.js` boundary conditions with custom thresholds)
3. The DSE module scoring logic (`computeWeightedScore`, `isQuestionCorrect`, `scoreToDseLevel`) is untested — errors could produce incorrect grade calculations
4. `localStorage` error handling (`useLocalStorage.js`) has no test coverage for quota-exceeded or corrupted data scenarios
5. AI response parsing (`useDSEPapers.js` `parseJSONArray`, `fixAIJSON`) is complex string processing with no tests

---

*Testing analysis: 2026-06-23*
