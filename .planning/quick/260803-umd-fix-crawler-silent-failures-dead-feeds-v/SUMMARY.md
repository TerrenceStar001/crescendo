---
id: 260803-umd-fix-crawler-silent-failures-dead-feeds-v
type: quick
date: 2026-08-03
title: Fix crawler — silent failures, dead feeds
status: complete
---

## Summary

Root cause of "nothing worked after 7 days": the **`SUPABASE_URL` GitHub secret pointed to `supabase.com`** (marketing host) instead of **`supabase.co`** (API host). Every crawler write to Supabase hit `ENOTFOUND`, and `Promise.allSettled` swallowed the errors silently — so the crawler "succeeded" 10 days straight without inserting anything, and the free-tier project went 7 days with zero API activity (matching the pause symptom).

## What was fixed

1. **`.github/workflows/crawlers.mjs`**
   - Wrapped `crawlSCMP` in try/catch so failures are logged (was silently swallowed)
   - Removed dead Young Post source (`/rss/3187/feed` → 404, no replacement RSS exists)
   - Fixed BBC 6 Minute English feed → `https://podcasts.files.bbci.co.uk/p02pc9tn.rss` (old URL 404s)
   - Added retry to podcast feed fetches + non-ok status/body in insert logs
2. **`src/utils/supabaseClient.js`** — rotated hardcoded anon key to the current valid key (old key was invalid, frontend was silently falling back to bundled content)
3. **`.github/workflows/crawl.yml`** — removed temporary push trigger + connectivity diagnostics (kept schedule + workflow_dispatch)

## Verification

- Crawler run `5eb248b9` (after secret fix): `[SCMP] Inserted 5 items (status 201)`, `[Podcast] Inserted 10 episodes (status 201)` ×2
- New anon key reads `articles` + `podcasts` from Supabase REST directly
- Live site serves new bundle `index-N6lom0lz.js` (contains valid key), all 9 URLs return 200
- Source pushed to `master` (`01175f05`), deploy on `gh-pages` (`0aebe38`)

## User actions taken

- Corrected `SUPABASE_URL` secret: `https://yfxqelscyupzqpsskzat.supabase.co` (.co, not .com)
- Provided current Supabase anon key (updated in frontend)

## Follow-ups

- Schedule runs daily at 3AM UTC — next automated run should insert fresh content
- Optional later: add RLS policies + enable RLS on content tables

## AI on GitHub Pages (follow-on fix, commit `03bbfcb3`)

Deployed site console showed `405` for `/api/ai/chat/completions`, `/api/ai/external-proxy`, and `http://127.0.0.1:4010/v1/chat/completions` when opening an auto-generated course → reading. GitHub Pages is static-only — it rejects POST to any `/api/*` route.

**Fix**: `src/utils/aiConstants.js` `doFetch` now POSTs OpenAI-compatible endpoints **directly from the browser** (with `Authorization: Bearer <key>`), instead of routing external calls through the dead `/api/ai/external-proxy` backend route. Dev-only fallback tiers (dev proxy `/api/ai/chat/completions`, local OpenCode `127.0.0.1:4010`) are unchanged and still work under `npm run dev`.

- Result: a key + endpoint configured in **Settings → AI** now works on the deployed site (no server needed). If no key is configured, AI gracefully falls back to bundled content (`[RAG] Using bundled: ...`) as before.
- Deployed: new bundle `index-C54h8wZg.js` (old `index-N6lom0lz.js` 404s), gh-pages `ba59612`, master `03bbfcb3`.
- User note: hard-refresh (Ctrl/Cmd+Shift+R) to bypass the stale service worker cache.

### Test-connection fix (`77b477cf`)

Settings → AI "Test connection" reported `Connected — Unexpected response` even though the connection worked. Cause: `useAI.js` testConnection sent `maxTokens: 5`, but reasoning models (Agnes `agnes-2.0-flash` uses ~13 reasoning tokens, `reasoning_content` field) consume the whole output budget before emitting `content` → `content` came back empty → "Unexpected response" branch.

**Fix**: raised test `maxTokens` 5 → 200 (`useAI.js:71`). Verified with raw fetch: Agnes returns standard OpenAI shape with `choices[0].message.content = "OK"`. User's Settings → AI test now passes.

- Agnes provider verified: endpoint `https://apihub.agnes-ai.com/v1/chat/completions`, model `agnes-2.0-flash`, key valid, CORS `access-control-allow-origin: *` (browser direct fetch OK), free tier.
- Deployed: bundle `index-B6_5118B.js`, gh-pages `5abeb40`, master `77b477cf`.
