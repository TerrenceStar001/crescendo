# Phase 1: Passage Quality & DSE Authenticity — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-23
**Phase:** 1-Passage Quality & DSE Authenticity
**Areas discussed:** Source strategy

---

## Source Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Pure AI generation | Improve existing prompt pipeline only | |
| RAG from real news | Retrieve real articles via crawlers, adapt into DSE passages | |
| Hybrid (prompt + RAG) | RAG when available, pure AI fallback offline | ✓ |

**User's choice:** Hybrid (prompt + RAG)
**Notes:** Selected as the primary approach.

### How should RAG content be used?
| Option | Description | Selected |
|--------|-------------|----------|
| Structural grounding only | RAG guides structure/topic but AI writes original text | |
| As adaptation source | Pull real articles and have AI rewrite them | |
| As passage fragments | Use RAG snippets as quotes, data points, excerpts | ✓ |

**User's choice:** As passage fragments

### Offline fallback strategy
| Option | Description | Selected |
|--------|-------------|----------|
| Fall back to pure AI pipeline | Generate via AI prompts alone | ✓ |
| Fall back to bundled content | Serve pre-validated bundled passages | |
| Both — AI generate + validate | Generate with AI, validate, fall back to bundled | |

**User's choice:** Fall back to pure AI pipeline

### Source attribution style
| Option | Description | Selected |
|--------|-------------|----------|
| Yes — fabricated source attribution | 'Adapted from SCMP, March 2024' style | |
| Yes — real RAG source attribution | Cite actual RAG source when used | ✓ |
| No attribution | Passages stand alone | |

**User's choice:** Yes — real RAG source attribution

---

## the agent's Discretion

- Exact RAG retrieval strategy (similarity threshold, fragment count, fragment length)
- Prompt engineering for the hybrid pipeline
- Quality gate specifics (metrics, thresholds, retry logic)

## Deferred Ideas

None — discussion stayed within phase scope.
