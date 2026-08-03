---
id: 260803-umd-fix-crawler-silent-failures-dead-feeds-v
type: quick
date: 2026-08-03
title: Fix crawler — silent failures, dead feeds
goal: Make the daily crawler actually insert fresh content into Supabase and surface errors instead of silently succeeding.
---

## Diagnosis (evidence-verified)

- Site healthy (all 200s), so the app is fine. The problem is the crawler.
- All 10 GitHub Actions runs (Jul 25 → Aug 3) show `[SCMP] Fetching...` with **no "Inserted" line**, meaning the write to Supabase never happens — errors are swallowed by `Promise.allSettled` at `crawlers.mjs:113` because `crawlSCMP`/`crawlYoungPost` have no internal try/catch.
- Feed health (tested from sandbox):
  - SCMP `https://www.scmp.com/rss/91/feed` — **200, valid RSS** (keep)
  - Young Post `https://www.scmp.com/rss/3187/feed` — **404**; replacement attempts (`/yp/rss`, `/rss/yp/feed`, `/topics/young-post/rss`) all return HTML, not RSS → **no working Young Post feed exists**, remove source
  - BBC 6min `https://feeds.bbci.co.uk/learningenglish/features/6minuteenglish/rss.xml` — **404**; replacement `https://podcasts.files.bbci.co.uk/p02pc9tn.rss` — **200, valid RSS** (switch to it)
  - TED `https://feeds.feedburner.com/tedtalksaudio` — **200, valid XML** from sandbox but `fetch failed` on runner (8.4 MB feed; likely transient/too large) → keep but add retry + clear error logging
- Likely real-world trigger: Supabase free-tier project auto-paused after 7 days of no API activity. Cannot confirm from sandbox (DNS to `supabase.co` blocked). Crawler fixes will make a paused project visible via a 502 status log.

## Changes

### 1. `.github/workflows/crawlers.mjs`
- Wrap `crawlSCMP` body in try/catch that `console.error`s the message (do not rethrow — keep `Promise.allSettled`).
- **Remove** `crawlYoungPost` (dead source, no working RSS).
- Fix BBC feed URL to `https://podcasts.files.bbci.co.uk/p02pc9tn.rss`.
- Add 1 retry to podcast feed fetch on failure.
- Log `res.ok` and, on non-ok, include the response status/body snippet in every Inserted log.
- `main()` now calls only `crawlSCMP()` + `crawlPodcasts()`.

### 2. Push + verify
- Commit crawlers.mjs change to master, push (workflow file — PAT has workflow scope).
- Re-run workflow manually via API.
- Download run log → confirm `[SCMP] Inserted ... (status 2xx)` or a visible Supabase error (e.g. 502 = paused project).
- If Supabase paused: instruct user to click Restore in Supabase dashboard, then re-run.

## Step → Verify

1. Edit crawlers.mjs → build not applicable (plain Node), `node -c`-style syntax check via `node --check`.
2. Commit + push → push succeeds, `crawl.yml`/`crawlers.mjs` on origin/master.
3. Trigger workflow → new run appears with success.
4. Read run log → either "Inserted ... (status 201)" (fixed) or clear Supabase error (actionable).
5. Update `.planning/quick/.../SUMMARY.md` + STATE.md Quick Tasks table.
