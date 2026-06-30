---
name: skill-description-opt
description: Optimize skill descriptions for better triggering accuracy. Use when the user wants to improve how often a skill triggers, optimize a skill's description, generate trigger eval queries, or run the description optimization loop. Also trigger when users mention skill discovery, triggering, undertriggering, or want to test if a skill description catches the right intents.
---

# Skill Description Optimizer

Optimize skill descriptions for better triggering accuracy. The description field in SKILL.md frontmatter is the primary mechanism that determines whether Claude invokes a skill. Use this after creating or improving a skill.

## How Skill Triggering Works

Skills appear in Claude's `available_skills` list with their name + description. Claude decides whether to consult a skill based on that description. Important: Claude only consults skills for tasks it can't easily handle on its own — simple, one-step queries may not trigger a skill even if the description matches perfectly. Complex, multi-step, or specialized queries reliably trigger skills when the description matches.

This means your eval queries should be substantive enough that Claude would actually benefit from consulting a skill. Simple queries like "read file X" are poor test cases.

## Step 1: Generate Trigger Eval Queries

Create 20 eval queries — a mix of should-trigger and should-not-trigger. Save as JSON:

```json
[
  {"query": "the user prompt", "should_trigger": true},
  {"query": "another prompt", "should_trigger": false}
]
```

Queries must be **realistic** — something a real user would actually type. Include:
- File paths, personal context, column names, company names, URLs
- Backstory and detail
- Mix of formal and casual phrasing
- Some lowercase, abbreviations, typos, casual speech
- Edge cases rather than clear-cut examples

**Should-trigger queries (8-10):** Think about coverage. Different phrasings of the same intent — formal, casual. Include cases where the user doesn't explicitly name the skill but clearly needs it. Throw in uncommon use cases and cases where this skill competes with another but should win.

**Should-not-trigger queries (8-10):** The most valuable are **near-misses** — queries that share keywords or concepts with the skill but actually need something different. Think adjacent domains, ambiguous phrasing where a naive keyword match would trigger but shouldn't. Avoid obviously irrelevant queries — "Write a fibonacci function" as a negative test for a PDF skill is too easy.

Bad: `"Format this data"`, `"Extract text from PDF"`, `"Create a chart"`

Good: `"ok so my boss just sent me this xlsx file (its in my downloads, called something like 'Q4 sales final FINAL v2.xlsx') and she wants me to add a column that shows the profit margin as a percentage. The revenue is in column C and costs are in column D i think"`

## Step 2: Review with User

Present the eval set for review using the HTML template:

1. Read the template from `.claude/skills/skill-description-opt/assets/eval_review.html`
2. Replace placeholders:
   - `__EVAL_DATA_PLACEHOLDER__` → the JSON array of eval items (no quotes — it's a JS variable assignment)
   - `__SKILL_NAME_PLACEHOLDER__` → the skill's name
   - `__SKILL_DESCRIPTION_PLACEHOLDER__` → the skill's current description
3. Write to a temp file and open it
4. The user can edit queries, toggle should-trigger, add/remove entries, then click "Export Eval Set"
5. The file downloads to `~/Downloads/eval_set.json` — check for multiple versions (e.g., `eval_set (1).json`)

This step matters — bad eval queries lead to bad descriptions.

## Step 3: Run the Optimization Loop

Tell the user: "This will take some time — I'll run the optimization loop in the background and check on it periodically."

Save the eval set to the workspace, then run in the background:

```bash
python -m .claude/skills/skill-description-opt/scripts/run_loop \
  --eval-set <path-to-trigger-eval.json> \
  --skill-path <path-to-skill> \
  --model <model-id-powering-this-session> \
  --max-iterations 5 \
  --verbose
```

Use the model ID from your system prompt so the triggering test matches what the user actually experiences.

While it runs, periodically tail the output to give the user updates on which iteration it's on and what the scores look like.

This handles the full optimization loop automatically:
1. Splits eval set into 60% train and 40% held-out test
2. Evaluates current description (each query 3 times for reliability)
3. Calls Claude to propose improvements based on failures
4. Re-evaluates each new description on both train and test
5. Up to 5 iterations
6. Opens HTML report in browser, returns JSON with `best_description` (selected by test score, not train score, to avoid overfitting)

## Step 4: Apply the Result

Take `best_description` from the JSON output and update the skill's SKILL.md frontmatter. Show the user before/after and report the scores.
