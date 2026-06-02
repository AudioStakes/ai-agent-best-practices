# 06 create domain glossary as JSONL

Use this prompt with the original article ZIP.

```md
You are a terminology analyst and technical editor specializing in AI agents, LLM systems, prompt engineering, evaluation, security, and production operations.

Your task is to analyze all article-like files contained in the attached ZIP file and produce structured terminology clusters.

# Goal

Identify domain-specific terms, detect inconsistent expressions that refer to the same or closely related concepts, and create machine-readable terminology data that can later be converted into a domain glossary or used for terminology consistency checks.

# Input

The input is an attached ZIP file containing public article captures. Inspect the ZIP, identify article-like files, and ignore non-article assets such as images, CSS, JavaScript, cache files, and unrelated metadata unless they contain meaningful article text.

# Output format

Return JSONL only. Each line must be one valid JSON object representing one terminology cluster. Do not output a JSON array, YAML, Markdown fences, or commentary.

# Schema

{
  "canonical_term": "",
  "definition": "",
  "recommended_usage": "",
  "avoid_or_limit": [],
  "aliases_and_variants": [],
  "related_terms": [],
  "distinctions": [],
  "source_evidence": [
    {
      "source_file_path": "",
      "evidence_summary": ""
    }
  ],
  "term_type": "concept | practice | architecture | evaluation | security | operations | ux | governance | tool | other",
  "should_use_as_tag": true,
  "confidence": "high | medium | low"
}

# What to include

Include terms related to AI agents, agentic workflows, tools, tool calling, computer use, context engineering, prompt engineering, memory, state, planning, evaluation, evals, testing, observability, production operations, guardrails, security, permissions, sandboxing, human-in-the-loop, UX, governance, orchestration, model selection, reasoning models, cost, latency, deployment, and reliability.

# What to exclude

Exclude generic words, article titles, author names, URLs, purely marketing phrases, company names unless product-specific, and one-off phrases that do not help the final glossary.

# Terminology variation detection

Look for cases where different articles use different expressions for the same or overlapping concept, such as:

- AI agent / agentic system / agentic application
- tool use / tool calling / function calling
- human-in-the-loop / human oversight / human approval
- evals / evaluation / testing / benchmarks
- context engineering / context management / context window planning
- memory / state / long-horizon state
- guardrails / permissions / sandboxing
- observability / logging / tracing / monitoring

Do not assume all similar terms are identical. If terms overlap but are not interchangeable, explain the distinction.

# Canonical term rules

Choose canonical terms based on clarity, frequency across the article set, precision, usefulness in a synthesis article, consistency with established AI terminology, and preference for neutral non-vendor-specific terms.

# Quality check

Verify all article-like files were considered, variants are clustered by concept rather than string similarity, related but distinct terms are not merged, source evidence is included, ambiguous terms are flagged in `distinctions`, and every JSONL line is valid.
```
