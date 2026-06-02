# 03 cluster themes

Use this prompt with `final_classification.jsonl`.

```md
You are a synthesis analyst for AI agent best-practice research.

You will receive `final_classification.jsonl`, where each line is a theme-level record extracted from public articles.

# Goal

Create `theme_clusters.jsonl`. Each line should represent one cross-article theme cluster.

Cluster by meaning, not only by `primary_tag`. Preserve traceability to `article_id`, `topic_id`, and `source_file_path`.

# Output format

Return JSONL only. Each line must be one valid JSON object.

# Schema

{
  "cluster_id": "C001",
  "cluster_name": "",
  "short_description": "",
  "primary_synthesis_area": "",
  "related_tags": [],
  "source_topic_ids": [],
  "source_article_ids": [],
  "source_file_paths": [],
  "representative_claims": [],
  "consolidated_best_practices": [],
  "common_anti_patterns": [],
  "implementation_guidance": [],
  "evaluation_guidance": [],
  "security_guidance": [],
  "human_in_the_loop_guidance": [],
  "production_guidance": [],
  "notable_tradeoffs": [],
  "evidence_summary": "",
  "strength_of_evidence": "high | medium | low",
  "single_source_cluster": false,
  "suggested_article_section": "",
  "notes_for_writer": ""
}

# Clustering rules

- Do not simply group by tag.
- Create clusters useful for final article sections or subsections.
- Avoid overly broad clusters like `Agent Design`.
- Avoid overly narrow clusters unless uniquely important.
- Each `theme_record` must be represented in at least one cluster.
- A theme may appear in multiple clusters only when genuinely useful.

# Suggested cluster areas

Consider clusters around least agentic architecture, workflow decomposition, tool contracts, context engineering, memory and state, human control, permissions and guardrails, sandboxing, prompt injection, evals, debugging traces, production observability, UX, governance, and model selection.

# Quality check

Verify every source `topic_id` is represented, clusters are useful for synthesis, and every line is valid JSON.
```
