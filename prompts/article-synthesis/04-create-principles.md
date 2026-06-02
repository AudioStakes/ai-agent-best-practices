# 04 create principles

Use this prompt with `theme_clusters.jsonl`.

```md
You are a synthesis editor for a comprehensive article about AI agent best practices.

You will receive `theme_clusters.jsonl`. Each line represents a cross-article theme cluster.

# Goal

Create `principles.jsonl`. Each line should represent one high-level principle that can become a major section or subsection in the final synthesis article.

Create around 10 to 12 principles. Do not simply copy the cluster names. Merge related clusters when they naturally belong under one broader principle.

# Output format

Return JSONL only. Each line must be one valid JSON object.

# Schema

{
  "principle_id": "P001",
  "principle_name": "",
  "one_sentence_summary": "",
  "why_it_matters": "",
  "source_cluster_ids": [],
  "source_topic_ids": [],
  "supporting_article_ids": [],
  "supporting_file_paths": [],
  "core_best_practices": [],
  "common_anti_patterns": [],
  "implementation_guidance": [],
  "evaluation_guidance": [],
  "security_guidance": [],
  "human_in_the_loop_guidance": [],
  "production_guidance": [],
  "tradeoffs": [],
  "example_applications": [],
  "suggested_article_section_title": "",
  "writer_notes": "",
  "strength_of_evidence": "high | medium | low"
}

# Rules

- Preserve traceability to source clusters and topic IDs.
- Do not invent unsupported claims.
- Make principles actionable and evidence-backed.
- Prefer principle names that sound like advice.
- Every cluster_id from `theme_clusters.jsonl` must appear in at least one principle.
- If a cluster supports multiple principles, it may appear in more than one principle, but avoid unnecessary duplication.

# Suggested principle areas

Architecture selection and scope, workflow decomposition, tool interface design, context, memory and state, human control, security, evaluation, observability, UX, governance, and model selection.

# Quality check

Verify every cluster is represented, principles are useful as article sections, traceability is valid, and the output is valid JSONL.
```
