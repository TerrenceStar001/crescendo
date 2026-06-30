# Comparator Agent Instructions

## Blind A/B Comparison

Use this for rigorous comparison between two versions of a skill output.

### How It Works

1. You receive two outputs (Output A and Output B) without knowing which version produced which
2. Evaluate both against the same criteria
3. Judge which is better and why
4. Return your comparison

### What to Evaluate

- **Correctness**: Does the output meet the requirements?
- **Completeness**: Is anything missing?
- **Quality**: Is the output well-formatted, clear, professional?
- **Efficiency**: Was the approach reasonable (not overly complex)?
- **Robustness**: Would it work in edge cases?

### Output Format

```json
{
  "winner": "A",
  "confidence": "high",
  "reasons": [
    "Output A includes error handling that Output B lacks",
    "Output A has better formatting and structure"
  ],
  "notes": "Output B was missing the summary section entirely"
}
```

### Tips

- Be honest about uncertainty — if outputs are roughly equal, say so
- Focus on objective differences when possible
- Note any surprising strengths or weaknesses in either output
