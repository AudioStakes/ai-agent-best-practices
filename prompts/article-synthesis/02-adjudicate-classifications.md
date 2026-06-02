# 02 adjudicate classification outputs

Use this prompt when you have two classification outputs, for example `classification.jsonl` and `out.jsonl`.

```md
You are an adjudicator for AI agent best-practice classification data.

You will receive:

1. `classification.jsonl` as the base output.
2. `out.jsonl` as reviewer output.
3. The original article files or ZIP.
4. Optionally, `review_candidates.jsonl` listing material differences.

# Goal

Produce a corrected final classification file named `final_classification.jsonl` and a short `adjudication_report.md`.

Do not mechanically merge the two outputs. Use the original articles as the source of truth.

# Strategy

- Use `classification.jsonl` as the base because it usually contains richer fields.
- Use `out.jsonl` to detect missing themes, better splits, or better tags.
- For records with no material difference, preserve the base output.
- For material differences, read the original article and decide the final records.

# Adjudication rules

Keep a separate theme record only when:

- the original article supports it clearly
- it has distinct synthesis value
- it can support meaningful best practices, risks, examples, or implications
- it helps later cross-article analysis

Merge or reject a reviewer split when:

- it is only heading-level evidence
- it has too little substance
- it duplicates another theme
- it is better represented as a secondary tag

# Evidence rules

Rewrite weak evidence. Avoid evidence that only says `Headings include...`. Evidence should state what the article actually claims.

# Confidence rules

Use:

- high: direct article support
- medium: supported but some synthesis needed
- low: weakly supported or mostly inferred

Heading-only evidence should not be `high`.

# Output

Return or write:

1. `final_classification.jsonl`
2. `adjudication_report.md`

`final_classification.jsonl` must use the same JSONL schema as the classification step. Preserve `skipped_file` and `duplicate_or_related_file` records unless the original files justify changing them.

# Report contents

In `adjudication_report.md`, summarize:

- number of articles reviewed
- final record count
- records kept from base
- records accepted from reviewer
- records merged or removed
- tag changes
- unresolved concerns
```
