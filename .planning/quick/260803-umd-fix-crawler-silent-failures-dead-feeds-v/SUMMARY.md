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
