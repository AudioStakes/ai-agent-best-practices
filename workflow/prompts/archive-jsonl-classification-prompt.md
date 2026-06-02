# Archive JSONL Classification Prompt

You are a research analyst specializing in AI agents, LLM systems, prompt engineering, and software engineering best practices.

Your task is to analyze all article-like files contained in the attached ZIP file and convert them into structured, theme-level research data.

The goal is not to produce a narrative summary.
The goal is to create machine-readable JSONL classification data that can later be used to write a comprehensive synthesis article about AI agent best practices.

# Input

The input is an attached ZIP file.

The ZIP file may contain multiple article files, such as Markdown, HTML, text files, or other readable article exports.

# Your Tasks

1. Extract the ZIP file.
2. Inspect the file structure.
3. Identify all article-like files.
4. Ignore non-article assets such as images, CSS, JavaScript, cache files, or unrelated metadata unless they contain meaningful article text.
5. Read every article-like file.
6. Assign a unique `article_id` to each article, starting from `A001`.
7. For each article, extract article-level metadata.
8. For each article, split the content into theme-level records.
9. Classify each theme using tags, claim types, maturity levels, and confidence levels.
10. Output all theme-level records as JSONL.

# Output Language

Write all values in English.

# Output Format

Return JSONL only.

Each line must be one valid JSON object.
Each JSON object represents exactly one theme-level record.

Do not wrap the output in Markdown.
Do not use a code block.
Do not output commentary before or after the JSONL.
Do not output a JSON array.
Do not output YAML.

# Core Principle

Do not treat one article as one theme by default.

If an article discusses multiple themes, split it into multiple JSONL records.

For example, if one article discusses tool use, evaluation, context engineering, and production monitoring, create separate JSONL records for those themes.

# Core Rules

- Analyze all article-like files in the ZIP.
- Do not skip articles unless they are unreadable or clearly not article content.
- Do not summarize the entire ZIP as one document.
- Do not summarize each article as only one theme unless the article truly covers only one theme.
- Do not add generic advice that is not supported by the article.
- Do not mix the article’s claims with your own opinions.
- If you infer something, clearly mark it as an inference.
- If a field has no supporting evidence in the article, use an empty list `[]` for list fields or `"unknown"` for unknown scalar fields.
- Lower the `confidence` value when evidence is indirect or weak.
- Preserve traceability from each theme back to the source article and file path.
- Each line must be independently useful without relying on previous lines.
- Use valid JSON strings. Escape quotes and line breaks properly.

# File Handling Rules

When processing the ZIP file:

- First inspect the file structure internally.
- Use the file path inside the ZIP as `source_file_path`.
- If the same article appears in multiple formats, choose the most complete readable version.
- If a file cannot be read, output one JSONL record with `record_type: "skipped_file"`.
- If article metadata such as title, source, URL, or publication date is unavailable, use `"unknown"`.
- If a title is not explicitly available, infer a title from the filename and set `title_inferred` to `true`.

# Allowed Tags

Choose one `primary_tag` from the following list.
Add multiple `secondary_tags` if useful.

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

If none of the existing tags fit well, set `primary_tag` to `"Other"` and add suggested new tags to `new_tag_candidates`.

# claim_type Options

Assign one or more `claim_type` values to each theme.

- principle: a design principle
- practice: a concrete best practice
- anti_pattern: something to avoid
- tradeoff: a tradeoff or design tension
- risk: a risk or failure mode
- checklist: checklist-style guidance
- case_study: an example or case study
- research_finding: a research or experimental finding
- tool_guidance: guidance about using tools

# maturity_level Options

Assign one maturity level to each theme.

- Level 1: Single-turn LLM usage
- Level 2: Workflow-based usage
- Level 3: Tool use and external system integration
- Level 4: Evaluation, monitoring, and iterative improvement
- Level 5: Production operations and organizational adoption

# confidence Criteria

Use the following criteria.

- high: the article provides clear and direct evidence
- medium: the point is reasonably supported by several parts of the article
- low: the point is only implied or weakly supported

# JSONL Schema

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
  "confidence": ""
}

# Skipped File Schema

If a file is skipped, output one JSONL line using this schema:

{
  "record_type": "skipped_file",
  "source_file_path": "",
  "reason": ""
}

# Duplicate or Related File Schema

If a file is a duplicate or less complete version of another article, output one JSONL line using this schema:

{
  "record_type": "duplicate_or_related_file",
  "source_file_path": "",
  "related_to_article_id": "",
  "note": ""
}

# ID Rules

Assign article IDs sequentially based on the sorted order of article-like files.

Examples:

- A001
- A002
- A003

For each article, assign topic IDs sequentially.

If `article_id` is `A001`, use:

- A001-T01
- A001-T02
- A001-T03

If `article_id` is `A002`, use:

- A002-T01
- A002-T02
- A002-T03

# Granularity Rules

Create records at a level that will be useful for comparison and synthesis later.

Good examples:

- Split tool input validation and tool permission control into separate records when both are discussed.
- Split offline evaluation and production monitoring into separate records when both are discussed.
- Split context selection and context compression into separate records when both are discussed.
- Split human approval checkpoints and exception escalation into separate records when both are discussed.
- Split cost control and latency optimization into separate records when both are discussed.

Bad examples:

- Compressing the entire article into one broad record such as “AI Agent Design.”
- Creating one record that includes unrelated topics.
- Splitting content so narrowly that a record contains only one minor sentence with no meaningful claim.
- Creating records that are not supported by the article.

# evidence_from_article Rules

- Summarize evidence from the article briefly.
- Include short quotes only when useful.
- Avoid long quotations.
- Do not include claims in `evidence_from_article` unless they are actually supported by the article.
- Each record must include enough evidence to support its classification.

# Internal Quality Check

Before producing the final JSONL, internally check the following:

- Did you inspect the ZIP contents before analyzing?
- Did you identify all article-like files?
- Did you avoid treating the whole ZIP as one document?
- Did you avoid forcing each article into one broad theme?
- Did you split multiple themes appropriately?
- Is each `primary_tag` specific enough?
- Are the `best_practices` grounded in the article rather than generic advice?
- Did you avoid inventing anti-patterns when the article does not support them?
- Does each `evidence_from_article` support the relevant claims?
- Is each JSONL line valid JSON?
- Is each JSONL line independently useful for later cross-article analysis?

# Important Output Requirement

Return the complete JSONL classification results for all analyzed articles.

Do not stop after the first article.
Do not provide only a sample.
Do not provide only a summary.
