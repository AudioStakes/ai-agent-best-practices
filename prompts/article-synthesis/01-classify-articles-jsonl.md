# 01 classify articles as JSONL

Use this prompt with the original ZIP of public articles.

```md
You are a research analyst specializing in AI agents, LLM systems, prompt engineering, evaluation, security, and production operations.

Your task is to analyze all article-like files contained in the attached ZIP file and convert them into structured, theme-level research data.

The goal is not to produce a narrative summary. The goal is to create machine-readable JSONL classification data that can later be used to write a comprehensive synthesis article about AI agent best practices.

# Input

The input is an attached ZIP file. It may contain Markdown, HTML, text files, article exports, metadata, images, CSS, JavaScript, or other assets.

# Tasks

1. Extract the ZIP file.
2. Inspect the file structure.
3. Identify all article-like files.
4. Ignore non-article assets unless they contain meaningful article text.
5. Read every article-like file.
6. Assign a unique `article_id` to each article, starting from `A001`.
7. For each article, extract article-level metadata.
8. Split each article into theme-level records.
9. Classify each theme using tags, claim types, maturity levels, and confidence levels.
10. Output all theme-level records as JSONL.

# Output language

Write all values in English.

# Output format

Return JSONL only. Each line must be one valid JSON object. Do not output a JSON array, YAML, Markdown fences, or commentary.

# Core rules

- Do not treat one article as one theme by default.
- If an article discusses multiple themes, create multiple JSONL records.
- Do not add generic advice unsupported by the article.
- If a field has no support, use `[]` for list fields or `"unknown"` for unknown scalar fields.
- Preserve traceability using `source_file_path`, `article_id`, and `topic_id`.
- If a file cannot be read, output a `skipped_file` record.
- If a file is duplicate or less complete, output a `duplicate_or_related_file` record.

# Allowed primary tags

Choose one `primary_tag` from:

- Agent Design
- Workflow Design
- Task Decomposition
- Tool Use
- Context Engineering
- Prompt Design
- Memory and State Management
- Human-in-the-loop
- Evaluation and Evals
- Testing
- Security
- Permission Management
- Sandboxing
- Logging and Observability
- Production Operations
- Cost Management
- Latency Management
- UX and User Experience
- Organizational Adoption
- Governance
- Case Study
- Other

Add useful `secondary_tags`. If no tag fits, set `primary_tag` to `Other` and add `new_tag_candidates`.

# claim_type options

Use one or more:

- principle
- practice
- anti_pattern
- tradeoff
- risk
- checklist
- case_study
- research_finding
- tool_guidance

# maturity_level options

- Level 1: Single-turn LLM usage
- Level 2: Workflow-based usage
- Level 3: Tool use and external system integration
- Level 4: Evaluation, monitoring, and iterative improvement
- Level 5: Production operations and organizational adoption

# JSONL schema

Each normal theme record must follow this schema:

{
  "record_type": "theme_record",
  "article_id": "A001",
  "topic_id": "A001-T01",
  "title": "",
  "title_inferred": false,
  "source": "",
  "url": "",
  "published_or_updated_date": "",
  "source_file_path": "",
  "article_type": [],
  "article_target_readers": [],
  "article_overall_summary": "",
  "primary_tag": "",
  "secondary_tags": [],
  "new_tag_candidates": [],
  "sub_topic": "",
  "claim_type": [],
  "maturity_level": "",
  "theme_target_readers": [],
  "summary": "",
  "key_claims": [],
  "best_practices": [],
  "anti_patterns": [],
  "implementation_notes": [],
  "operational_notes": [],
  "evaluation_notes": [],
  "security_notes": [],
  "human_in_the_loop_notes": [],
  "concrete_examples": [],
  "evidence_from_article": [],
  "implications_for_final_article": [],
  "related_terms": [],
  "confidence": "high | medium | low"
}

# Quality check

Before output, verify that every article-like file was considered, every JSONL line is valid JSON, themes are split at a useful granularity, and evidence supports the claims.
```
