# Phase 7: PDF Ingestion Pipeline Fix — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 7-PDF Ingestion Pipeline Fix
**Areas discussed:** PDF extraction approach, Quality check UX, Chunking strategy, Dual storage fix

---

## PDF Extraction Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Positional sort only | Keep pdfjs-dist, fix text ordering by sorting by Y/X coordinates — 20 lines, no new deps, fixes 80% | |
| Add pdf2md library | Use @opendocsg/pdf2md for layout-aware Markdown — better structure but adds a dependency | |
| Both | Positional sort as primary, pdf2md as fallback if output quality is bad | ✓ |
| Fix first, add lib if needed | Start with positional sort, evaluate quality, add pdf2md later if still needed | |

**User's choice:** Both
**Notes:** Positional sort is primary. pdf2md as fallback.

| Option | Description | Selected |
|--------|-------------|----------|
| Character count threshold | If extracted text < 500 chars or unusual character ratio → fallback to pdf2md | |
| English content detection | Check if extracted text has sufficient English words/characters — if gibberish (>30% non-alpha), fallback | |
| Both checks combined | Use character count AND English content detection as quality gates before fallback | ✓ |
| Always try both, pick best | Run both extractors, compare output quality, use the one with more readable content | |

**User's choice:** Both checks combined
**Notes:** Character count threshold AND English content detection as quality gates.

| Option | Description | Selected |
|--------|-------------|----------|
| OCR improvement in scope | Fix image preprocessing (deskew, binarize, denoise) in dseOcr.js for better OCR on scanned PDFs | ✓ |
| Not in this phase | Skip OCR improvements — focus only on text-based PDF extraction for now | |
| Depends on if user uploads scanned PDFs | Add a check: if pdfjs-dist returns no text, auto-route to OCR pipeline | |

**User's choice:** OCR improvement in scope

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect and route | If pdfjs-dist returns no text or very little, automatically route to OCR pipeline without user action | ✓ |
| Let user choose | Add a 'Scanned PDF?' toggle in the upload UI so users can choose OCR pipeline explicitly | |
| Both | Auto-detect text-based PDFs, but also let users manually switch to OCR if detection fails | |

**User's choice:** Auto-detect and route

---

## Quality Check UX

| Option | Description | Selected |
|--------|-------------|----------|
| Quality preview screen | Show a dedicated preview screen with per-page char counts, English content %, quality score, let user decide | ✓ |
| Quality badge only | Show a simple quality indicator (good/warning/bad), proceed automatically unless bad | |
| Embedded in upload progress | Show quality info inline, auto-proceed if good, stop if bad | |

**User's choice:** Quality preview screen
**Notes:** Dedicated preview screen before AI structuring.

| Option | Description | Selected |
|--------|-------------|----------|
| Block with clear error | Prevent proceeding, show why it failed, suggest fixes | ✓ |
| Block but offer manual override | Block by default but let advanced users force-proceed | |
| Warn and let user decide | Show quality warnings with details, let user choose | |

**User's choice:** Block with clear error
**Notes:** Show char count, English %, per-page breakdown, suggest fixes.

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated error state in UI | Replace catch {} with error states in upload form — red banner with retry button | |
| Toast notifications | Brief toast popups that auto-dismiss | |
| Both | Dedicated error state for upload/extraction failures, toasts for minor issues | ✓ |

**User's choice:** Both

---

## Chunking Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| By page | Each page becomes a course section — simplest | |
| By heading detection | Detect headings via font size/weight heuristics — natural sections | ✓ |
| By content length | Split into roughly equal-length chunks | |
| Hybrid | Try heading detection first, fall back to page, then content | |

**User's choice:** By heading detection

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back to page boundaries | If no headings detected, each page becomes a section | |
| Fall back to content-length chunks | Split into ~2000-char chunks | |
| Combine both | Try to merge adjacent low-content pages, split long pages | ✓ |

**User's choice:** Combine both

| Option | Description | Selected |
|--------|-------------|----------|
| One section = one lesson | Each content section becomes one lesson | ✓ |
| Sections become reference material | All sections as AI reference, not individual lessons | |
| Let AI decide structure | Pass all content to AI, let it figure out structure | |

**User's choice:** One section = one lesson

---

## Dual Storage Fix

| Option | Description | Selected |
|--------|-------------|----------|
| SQLite as source of truth | Server is authoritative, IndexedDB is cache | |
| IndexedDB as source of truth | Client is authoritative, server syncs | |
| SQLite source, IndexedDB as read cache | All writes go through server, IndexedDB is read-only cache synced from SQLite | ✓ |

**User's choice:** SQLite source, IndexedDB as read cache

| Option | Description | Selected |
|--------|-------------|----------|
| On every catalog load | Always fresh, always requires server | |
| On app start + manual refresh | Sync on load, then pull-to-refresh | |
| On app start + cache headers | Sync on load, use version/etag | |
| Only on explicit sync | User clicks 'Refresh courses' button | ✓ |

**User's choice:** Only on explicit sync

| Option | Description | Selected |
|--------|-------------|----------|
| Always serve from IndexedDB if available | Show cached courses even when offline | ✓ |
| Show cached but flag as offline | Show cached with 'offline' badge | |
| Prefer server, fall back to cache | Try server first, fall back to cached | |

**User's choice:** Always serve from IndexedDB if available

| Option | Description | Selected |
|--------|-------------|----------|
| 10MB (match current client) | Raise server to 10MB | ✓ |
| 20MB | Budget for very large PDFs | |
| 5MB (match current server) | Lower client to 5MB | |

**User's choice:** 10MB

---

## Deferred Ideas

None — discussion stayed within phase scope.
