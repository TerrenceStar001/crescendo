# Schema Reference

## evals.json

Test cases for a skill.

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt",
      "expected_output": "Description of expected result",
      "files": [],
      "assertions": [
        {
          "text": "Assertion description",
          "type": "programmatic"
        }
      ]
    }
  ]
}
```

## eval_metadata.json

Per-eval metadata (one per eval directory).

```json
{
  "eval_id": 0,
  "eval_name": "descriptive-name-here",
  "prompt": "The user's task prompt",
  "assertions": []
}
```

## grading.json

Grading results for a single eval.

```json
{
  "eval_id": 0,
  "expectations": [
    {
      "text": "Assertion description",
      "passed": true,
      "evidence": "Specific evidence for the pass/fail decision"
    }
  ]
}
```

**Required fields**: `text`, `passed`, `evidence`. Do not use variants like `name`/`met`/`details`.

## benchmark.json

Aggregated benchmark results.

```json
{
  "skill_name": "example-skill",
  "iterations": [
    {
      "iteration": 1,
      "configs": [
        {
          "name": "with_skill",
          "evals": [
            {
              "eval_name": "generate-report",
              "pass_rate": 1.0,
              "time_mean": 23.5,
              "time_stddev": 1.2,
              "tokens_mean": 85000,
              "tokens_stddev": 5000
            }
          ]
        },
        {
          "name": "without_skill",
          "evals": [...]
        }
      ],
      "delta": {
        "pass_rate": "+15%",
        "time": "-2s",
        "tokens": "-5000"
      }
    }
  ]
}
```

## timing.json

Timing data for a single run.

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3
}
```

## feedback.json

User feedback from the eval viewer.

```json
{
  "reviews": [
    {
      "run_id": "eval-0-generate-report-with_skill",
      "feedback": "Looks good!",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "status": "complete"
}
```

Empty feedback string means the user thought it was fine.
