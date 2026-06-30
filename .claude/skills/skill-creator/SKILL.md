---
name: skill-creator
description: Create new skills from scratch and iterate on existing ones. Use when the user wants to turn a workflow, process, or repeated task into a Claude skill (.claude/skills/), convert something into a skill, or improve an existing skill's SKILL.md. Trigger whenever users mention creating, authoring, writing, or converting anything into a skill format. Also trigger when they say "turn this into a skill" or "make a skill for X".
---

# Skill Creator — Core

Create new skills and iterate on existing ones. This skill covers the **creation workflow** and **iteration loop**. For running evals/benchmarks, use `skill-evals`. For optimizing descriptions, use `skill-description-opt`. For packaging and distributing, use `skill-packaging`.

## The Creation Process

### 1. Capture Intent

Start by understanding the user's intent. If they say "turn this into a skill," extract answers from the conversation — the tools used, the sequence of steps, corrections they made, input/output formats observed.

Ask:
- What should this skill enable Claude to do?
- When should this skill trigger? (what user phrases/contexts)
- What's the expected output format?
- Should we set up test cases? Skills with objectively verifiable outputs (file transforms, data extraction, code generation) benefit from test cases. Skills with subjective outputs (writing style, art) often don't need them. Suggest the appropriate default based on the skill type, but let the user decide.

### 2. Interview and Research

Proactively ask questions about edge cases, input/output formats, example files, success criteria, and dependencies. Wait to write test prompts until you've got this part ironed out.

Check available MCPs — if useful for research (searching docs, finding similar skills, looking up best practices), research in parallel via subagents if available, otherwise inline. Come prepared with context to reduce burden on the user.

### 3. Write the SKILL.md

Based on the user interview, fill in these components:

- **name**: Skill identifier
- **description**: When to trigger, what it does. This is the primary triggering mechanism — include both what the skill does AND specific contexts for when to use it. All "when to use" info goes here, not in the body. Note: Claude has a tendency to "undertrigger" skills. To combat this, make the description a little bit "pushy" — include related phrases and contexts where the skill would be useful, even if the user doesn't explicitly name them.
- **compatibility**: Required tools, dependencies (optional, rarely needed)
- **the rest of the skill**: Step-by-step instructions, patterns, examples

## Skill Writing Guide

### Anatomy of a Skill

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic/repetitive tasks
    ├── references/ - Docs loaded into context as needed
    └── assets/     - Files used in output (templates, icons, fonts)
```

### Progressive Disclosure

Skills use a three-level loading system:
1. **Metadata** (name + description) — Always in context (~100 words)
2. **SKILL.md body** — In context whenever skill triggers (<500 lines ideal)
3. **Bundled resources** — As needed (unlimited, scripts can execute without loading)

**Key patterns:**
- Keep SKILL.md under 500 lines; if you're approaching this limit, add an additional layer of hierarchy along with clear pointers about where the model using the skill should go next to follow up.
- Reference files clearly from SKILL.md with guidance on when to read them
- For large reference files (>300 lines), include a table of contents

**Domain organization**: When a skill supports multiple domains/frameworks, organize by variant:
```
cloud-deploy/
├── SKILL.md (workflow + selection)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```
Claude reads only the relevant reference file.

### Principle of Lack of Surprise

Skills must not contain malware, exploit code, or any content that could compromise system security. A skill's contents should not surprise the user in their intent if described. Don't go along with requests to create misleading skills or skills designed to facilitate unauthorized access, data exfiltration, or other malicious activities. Roleplay skills are fine.

### Writing Patterns

Prefer using the imperative form in instructions.

**Defining output formats:**
```markdown
## Report structure
Use this exact template:
# [Title]
## Executive summary
## Key findings
## Recommendations
```

**Examples:**
```markdown
## Commit message format
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

### Writing Style

Explain the **why** behind everything. Use theory of mind and make the skill general, not super-narrow to specific examples. If you find yourself writing ALWAYS or NEVER in all caps, or using super rigid structures, that's a yellow flag — reframe and explain the reasoning so that the model understands why the thing is important. That's a more humane, powerful, and effective approach.

## Communicating with the User

Users vary widely in technical familiarity. Some are seasoned developers; others are plumbers who just opened their terminal for the first time. Pay attention to context cues:

- "evaluation" and "benchmark" are borderline, but OK
- For "JSON" and "assertion", see serious cues that the user knows those terms before using them without explaining

Briefly explain terms if you're in doubt. It's better to over-explain slightly than to confuse.

## The Iteration Loop

After writing a draft skill:

1. Come up with 2-3 realistic test prompts — the kind of thing a real user would actually say
2. Share them with the user: "Here are a few test cases I'd like to try. Do these look right, or do you want to add more?"
3. Run them using `skill-evals`
4. Evaluate results with the user (qualitative + quantitative)
5. Improve the skill based on feedback
6. Rerun test cases into a new iteration directory
7. Repeat until satisfied

After the skill is done, use `skill-description-opt` to optimize the triggering accuracy.

## Improving Existing Skills

When improving an existing skill (not creating from scratch):

1. **Preserve the original name** — use the skill's directory name and `name` frontmatter field unchanged
2. **Copy to a writeable location before editing** — the installed skill path may be read-only. Copy to `/tmp/skill-name/`, edit there, and package from the copy
3. **Snapshot the old version** — before editing, copy the skill to the workspace for baseline runs
4. **Generalize from feedback** — the goal is skills that work across thousands of prompts, not just the few examples you're testing. Avoid fiddly overfit changes or oppressive MUSTs
5. **Look for repeated work** — if all test cases resulted in the subagent writing a helper script, that's a strong signal the skill should bundle it in `scripts/`

Keep going until:
- The user says they're happy
- The feedback is all empty (everything looks good)
- You're not making meaningful progress
