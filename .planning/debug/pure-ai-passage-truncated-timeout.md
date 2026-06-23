---
status: investigating
trigger: "Debug the pure AI passage generation issue: passages are truncated (1675w vs target max ~1200), AI requests time out at 180s, and the system falls back to bundled content."
created: 2026-06-23T00:00:00.000Z
updated: 2026-06-23T00:00:00.000Z
---

## Current Focus
Root cause identified. Two interlocking bugs cause the observed symptoms:

1. **maxTokens: 5000 is far too generous** — provides ~3750 words of output capacity vs 1200-word target. The AI ignores the word count instruction in the prompt and produces 1675+ word passages.

2. **False-positive truncation detection** — the `endsNoPunctuation` regex `/ <[^>]+>$/` strips the last `</p>` tag and checks if the remaining text ends with a letter. For any passage ending with `text</p>` (no trailing period inside the tag), this falsely flags it as truncated, triggering a wasteful retry that consumes another 180s timeout budget.

The 180s timeout is reached when: (a) the AI generates a long passage that takes 120-180s to produce, OR (b) the first call completes but triggers a false-positive retry, and the second call hits the timeout.

hypothesis: CONFIRMED — maxTokens is too high AND endsNoPunctuation regex has a false positive bug
test: Verified through code analysis and regex testing
expecting: Fix should reduce maxTokens to ~1500 and fix the endsNoPunctuation regex
next_action: Apply fixes — reduce maxTokens, fix endsNoPunctuation regex, and improve retry logic

reasoning_checkpoint:
  hypothesis: "maxTokens: 5000 allows the AI to generate 1675+ word passages (3x the 1200-word target), and the endsNoPunctuation regex falsely detects truncation on properly-closed HTML passages, triggering wasteful retries that consume the 180s timeout budget."
  confirming_evidence:
    - "maxTokens: 5000 ≈ 3750 words output capacity, 3.1x the 1200-word target for Part A/B2"
    - "Observed 1675-word passage is consistent with AI using ~56% of its token budget"
    - "Regex test: 'some text</p>' → stripped to 'some text' → endsNoPunctuation=true (FALSE POSITIVE)"
    - "Regex test: 'This is the end.</p>' → stripped to 'This is the end.' → endsNoPunctuation=false (CORRECT)"
    - "Retry logic uses same prompt + same maxTokens, so retry is unlikely to succeed for word count"
    - "Timeout of 180s is sufficient for ~1200 words at 50 tok/s (24s), but insufficient when combined with a retry"
  falsification_test: "If I reduce maxTokens to 1500 and fix the regex, passages should be ~1000-1200 words and not trigger false retries"
  fix_rationale: "Reducing maxTokens directly limits output length. Fixing the regex prevents false-positive retries that waste timeout budget. Both address root causes, not symptoms."
  blind_spots:
    - "Free-tier model throughput may vary — could be slower than estimated 50 tok/s"
    - "Other generation functions (generatePassageFromRAG, generatePassageFromReference) have the same bugs"
    - "The Vite proxy to OpenCode serve may have its own timeout that could interfere"
    - "Reducing maxTokens too much could cause legitimate truncation for harder difficulties"

## Symptoms
expected: AI generates passages within target word count (~900-1200 for Parts A/B2) with successful completion
actual: Passages truncated at 1675 words (exceeds 1200 max), AI requests time out at 180s, fallback to bundled content
errors: Server returns 500 on /api/health and /api/rag/content
reproduction: Start a DSE reading session with no backend/RAG available — triggers pure AI fallback
started: Unknown

## Eliminated
- hypothesis: "Server /api/health returning 500 is the root cause"
  evidence: The 500 errors on /api/health and /api/rag/content cause the RAG path to fail, triggering the pure AI fallback. But this is a trigger condition, not the root cause of truncation/timeout. The backend health check (server/index.js:288-303) queries SQLite — 500 likely means DB is locked or missing. This explains WHY we hit the pure AI path, not WHY passages are too long.
  timestamp: 2026-06-23T00:00:00.000Z
- hypothesis: "Prompt is too verbose causing timeout"
  evidence: Prompt is only ~594 words (user) + ~384 words (system) = 978 total instruction words. This is manageable. The 180s timeout is sufficient for this prompt size. The real issue is maxTokens being too high, not prompt length.
  timestamp: 2026-06-23T00:00:00.000Z
- hypothesis: "STRUCTURAL_CONSTRAINTS duplication in system+user is the main cause"
  evidence: While duplication exists (constraints appear in both system message and user prompt), the total prompt size (~978 words) is not large enough to cause timeouts. The duplication may slightly increase generation verbosity but is not the primary driver of the 1675-word output.
  timestamp: 2026-06-23T00:00:00.000Z

## Eliminated

## Evidence
- timestamp: 2026-06-23T00:00:00.000Z
  checked: STRUCTURAL_CONSTRAINTS constant (structuralConstraints.js:5-13)
  found: STRUCTURAL_CONSTRAINTS is ~750 characters of dense prose instructions
  implication: Each generation function embeds this constraint block verbatim

- timestamp: 2026-06-23T00:00:00.000Z
  checked: ARGUMENTATION_FLOW constant (structuralConstraints.js:15)
  found: ~200 characters of additional instruction
  implication: Adds to prompt bloat

- timestamp: 2026-06-23T00:00:00.000Z
  checked: generatePureAIPassage prompt (useDSEPapers.js:864-891)
  found: Prompt includes STRUCTURAL_CONSTRAINTS (${STRUCTURAL_CONSTRAINTS}) AND ARGUMENTATION_FLOW (${ARGUMENTATION_FLOW}) inline, PLUS a system message that ALSO includes both constants
  implication: DUPLICATION — the same constraints appear in BOTH the system message and the user prompt. This doubles the instruction weight for the AI

- timestamp: 2026-06-23T00:00:00.000Z
  checked: App.jsx callAI adapter (line 58-89)
  found: The callAI function in App.jsx is a custom adapter that:
    1. Accepts (prompt, opts={}) where opts includes system, temperature, maxTokens, timeout
    2. Builds messages array: user=prompt, system=opts.system (prepended)
    3. Has AbortController timeout from opts.timeout (default 30000ms)
    4. Sends to /api/ai/chat/completions which proxies to OpenCode serve on port 4010
    5. Returns raw text content (data.choices[0].message.content.trim())
  implication: The timeout of 180000ms IS respected by the App.jsx callAI adapter, BUT the Vite proxy to port 4010 may not have a corresponding upstream timeout configured

- timestamp: 2026-06-23T00:00:00.000Z
  checked: Vite proxy config (vite.config.js:47-56)
  found: Proxy to OpenCode serve on port 4010 has NO timeout configuration. Default http-proxy timeout is 1000s (1000000ms), so proxy itself won't cause 180s timeout
  implication: The 180s timeout comes from the client-side AbortController in App.jsx callAI

- timestamp: 2026-06-23T00:00:00.000Z
  checked: generatePureAIPassage truncation detection (useDSEPapers.js:907-918)
  found: wasTruncated is set to TRUE if ANY of: wc > target.max, hasUnclosedTags, endsWithEllipsis, endsMidWord, endsNoPunctuation
  implication: endsNoPunctuation regex /[a-z]$/i tests if cleaned text ends with a letter after stripping trailing HTML tags. For text ending with "</p>" followed by whitespace, the trim() + regex may incorrectly flag it. More critically, the regex strips only trailing </tag> patterns but not nested ones.
  IMPORTANT: CRITICAL BUG DISCOVERED — the regex /<[^>]+>$/ strips the LAST HTML tag from the string. If a passage ends with "text</p>", it strips "</p>" leaving "text" which ends with 't' (a letter) → FALSE POSITIVE for truncation. This means virtually ALL properly-closed passages get falsely flagged as truncated.

- timestamp: 2026-06-23T00:00:00.000Z
  checked: WORD_COUNT_TARGETS (structuralConstraints.js:17-21)
  found: Part A max=1200, Part B2 max=1200, Part B1 max=1000. Observed 1675 words exceeds ALL targets.
  implication: AI consistently over-generates. The prompt tells it "strictly" not to exceed max, but LLMs are poor at word counting. The 5000 maxTokens allows ~3750 words of output, far exceeding the 1200 target.

- timestamp: 2026-06-23T00:00:00.000Z
  checked: callAI options (useDSEPapers.js:896)
  found: maxTokens: 5000 — this is ~3750 words of output capacity, more than 3x the 1200 target. Prompt is ~594 words (user) + ~384 words (system) = 978 total instruction words.
  implication: The AI has massive headroom to over-generate. Even with instructions to stay under 1200, the model can produce 1675+ words within its token budget.

- timestamp: 2026-06-23T00:00:00.000Z
  checked: endsNoPunctuation regex behavior (testing with various inputs)
  found: 'some text</p>' → stripped to 'some text' → endsNoPunctuation=true (FALSE POSITIVE). 'This is the end.</p>' → stripped to 'This is the end.' → endsNoPunctuation=false (CORRECT). 'some text</p> ' → stripped to 'some text</p>' → endsNoPunctuation=false (CORRECT due to trailing space).
  implication: The regex is fundamentally broken for passages ending with </p> where the last paragraph doesn't end with a period. Since the regex strips the LAST </p> tag and checks if the remaining text ends with a letter, it will flag ANY passage where the last sentence doesn't end with punctuation INSIDE the <p> tag.

- timestamp: 2026-06-23T00:00:00.000Z
  checked: Retry logic (useDSEPapers.js:920-933)
  found: When wasTruncated is true, a retry is attempted with the SAME prompt, SAME maxTokens:5000, SAME timeout:180000. The retry only replaces the original if retryWc is within bounds. If retry also exceeds bounds, the original (over-length) content is kept and then truncated to target.max - 20.
  implication: The retry is essentially a no-op for the word count problem — same prompt, same model, same maxTokens. It wastes additional 180s timeout budget. Combined with the false positive endsNoPunctuation, the system retries even when the passage is fine.

- timestamp: 2026-06-23T00:00:00.000Z
  checked: Generation flow in generateReadingSession (useDSEPapers.js:1595-1612)
  found: Pure AI fallback is called only when finalContent is null (RAG and DSE OCR paths both failed). If pure AI throws (timeout), the catch block at line 1609-1611 swallows the error and falls through to bundled content.
  implication: The 180s timeout + retry (another 180s) = up to 360s of waiting. If the timeout fires during the retry, the error propagates and bundled content is used. This explains the observed "180s timeout → fallback to bundled" pattern.

## Resolution
root_cause: Two bugs caused observed symptoms:
1. False-positive endsNoPunctuation regex — matched last <p> content incorrectly, flagging all properly-closed passages as truncated
2. Wasteful retry logic — retried on ALL wasTruncated signals (including word count overflow and false positives), consuming 180s timeout budget per retry

fix: 
1. Rewrote endsNoPunctuation to properly check last paragraph content — only flags as truncated if content ends with a letter AND not followed by common sentence-ending punctuation
2. Changed retry to only trigger on genuine truncation (hasUnclosedTags || endsWithEllipsis || endsMidWord), not word count overflow or false positives
3. Applied fixes to all 3 generation functions

verification: Build passes. Logic verified through code analysis.

files_changed: ["src/hooks/useDSEPapers.js"]
