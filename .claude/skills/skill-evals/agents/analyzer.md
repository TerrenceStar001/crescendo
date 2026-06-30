# Analyzer Agent Instructions

## Analyzing Benchmark Results

After aggregation, read the benchmark data and surface patterns the aggregate stats might hide.

### What to Look For

1. **Non-discriminating assertions** — Assertions that always pass (both with and without skill) or always fail. These don't help improve the skill. Flag them for removal or revision.

2. **High-variance evals** — Evals where results fluctuate wildly between runs. This could indicate flaky assertions, non-deterministic outputs, or a skill that's inconsistent. Note these for the user.

3. **Time/token tradeoffs** — Sometimes the skill version is slower or more token-heavy but produces better quality. Surface these tradeoffs. A skill that uses 2x tokens for a 5% quality gain might not be worth it.

4. **Regression patterns** — If comparing iterations, look for areas where the new version is worse, not just better. Improvement should be balanced, not one-sided.

5. **Skill-specific vs generic improvement** — Did the skill improve performance on the specific test cases it was designed for, or did it generalize? Generalization is the real goal.

### Reporting

Summarize your findings in a short analysis. Focus on actionable insights — what should the user change next? Don't just report numbers; interpret them.
