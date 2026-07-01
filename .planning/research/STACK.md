# Technology Stack: Course Quality Polish

**Project:** Crescendo
**Researched:** 2026-07-01

## Assessment: No New Technology Required

All course fixes can be implemented within the existing stack. The problems are configuration, prompt engineering, validation logic, and content — not missing frameworks.

---

## Current Stack (unchanged)

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React 18 | ^18.2.0 | UI framework | Already used for all components |
| Vite 5 | ^5.0.0 | Build tool | Already configured |
| Express 4 | ^4.18.2 | Backend server | Course API endpoints |
| better-sqlite3 | ^11.0.0 | SQLite DB | Course storage |

### Frontend Libraries (existing)
| Library | Role in Courses | Why |
|---------|----------------|-----|
| `@xyflow/react` ^12.11.0 | Not used for courses | — |
| `vite-plugin-pwa` ^1.3.0 | Course offline caching | cacheCourseOffline uses Cache API |

### Backend Libraries (existing)
| Library | Role in Courses | Why |
|---------|----------------|-----|
| `pdfjs-dist` ^3.11.174 | PDF text extraction | extractPdfText() — primary extraction path |
| `tesseract.js` ^7.0.0 | PDF OCR fallback | extractPdfWithOCR() — scanned PDF fallback |
| `canvas` ^3.2.3 | PDF page rendering (for OCR) | Required by tesseract.js pipeline |

### AI Infrastructure (existing)
| Component | Role | Why |
|-----------|------|-----|
| OpenCode serve :4010 | AI proxy | All AI calls route through this |
| `opencode/deepseek-v4-flash-free` | Default AI model | Free tier model |

---

## Changes Required (Configuration Only)

### 1. Token Limit Increase

**Current:** 4000 `max_tokens` in `callAICourse()` (server/routes/courses.js line 173)
**Target:** 8192
**Rationale:** A full course with 3-5 topics, 2-4 lessons per topic, and 3-5 exercises per lesson plus reference content and final assessment needs ~6000-8000 tokens of output. Current 4000 limit forces the AI to truncate, producing shallow content.

**File:** `server/routes/courses.js` line 173
```javascript
// Change:
max_tokens: 4000,
// To:
max_tokens: 8192,
```

### 2. AI Prompt Temperature Adjustment

**Current:** 0.7 in `callAICourse()`
**Target:** 0.3-0.4
**Rationale:** For structured course generation (JSON output with specific fields), lower temperature produces more reliable output structure. Higher temperature causes the AI to invent fields or produce inconsistent JSON. The useAI frontend hook already uses 0.3 for title/tag generation — match that.

**File:** `server/routes/courses.js` line 173
```javascript
// Change:
temperature: 0.7,
// To:
temperature: 0.3,
```

### 3. Frontend Auto-Generate Timeout Increase

**Current:** 3000ms (3 second) timeout in `useCourses.js` line 423
**Target:** 30000ms (30 second) matching useAI.js pattern
**Rationale:** Course generation takes time. 3 seconds is aggressive — the backend needs 30-60 seconds to generate, structure, and validate a full course. The current 3s timeout means the frontend ALWAYS falls through to the offline template before the backend can return.

**File:** `src/hooks/useCourses.js` line 422-429
```javascript
// Note: the timeoutId at line 423 only applies to the backend fetch itself,
// but the Promise.race at line 484 also has a 3000ms timeout.
// Both need extending.
```

### 4. PDF Text Quality Threshold Increase

**Current:** 50 character minimum in `parsePdf()` (pdfParser.js line 109)
**Target:** 500 characters
**Rationale:** 50 characters is too low — virtually any non-empty PDF passes this test, including ones where only a header or page number was extracted. 500 characters ensures the PDF has actual content.

**File:** `server/crawlers/pdfParser.js` lines 108-110
```javascript
// Change:
if (textResult && textResult.length >= 50) {
// To:
if (textResult && textResult.length >= 500) {
```

### 5. Backend Auto-Generate Timeout Increase

**Current:** 120000ms in `callAICourse()` (server/routes/courses.js line 159)
**Target:** Keep at 120000ms (it's reasonable) but verify the AI aborts don't cascade
**Rationale:** 2 minutes for a full course generation is acceptable. The issue is that the frontend abandons the backend request after 3 seconds, so the backend work is wasted. Fix the frontend timeout first.

---

## What's NOT Changing

| Component | Reason |
|-----------|--------|
| No TypeScript | Course code is `.jsx`/`.js` — adding TS is out of scope |
| No state management library | Course state is component-local + IndexedDB |
| No new npm packages | All fixes use existing dependencies |
| No database migration | SQLite schema is adequate for courses |
| No new backend endpoints | Existing routes cover all needs |
| No test framework | Codebase has none; fix doesn't introduce one |

---

## Verification Approach

Each fix is independently verifiable:

| Fix | How to Verify |
|-----|---------------|
| Token limit increase | Generate a course via UI — count total exercises across all lessons (should be 15-25+). Currently 8-12. |
| Temperature reduction | Parse 5 AI responses — 0% should have malformed JSON. Currently ~10-20% failure rate. |
| Timeout extension | Upload a PDF with 20+ pages — pipeline should complete without frontend fallback to template. |
| Text threshold increase | Upload a PDF with only headers (intentionally low-content) — should fail with clear error message instead of producing garbage. |
| Seed courses | Fresh app launch → open Courses → see 8-10 cards in catalog immediately. |

---

## Sources

- **Existing codebase**: pdfParser.js, courses.js (server), useCourses.js, useAI.js — all examined for current config values
- **AI model documentation**: OpenCode serve defaults — `opencode/deepseek-v4-flash-free` model context window supports 8192+ output tokens but defaults to 4000
- **No external dependencies required** — all changes are in-project configuration and code
