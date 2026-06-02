# 07 write final article

Use this prompt with `article_outline.md`, `principles_corrected_traceability.jsonl`, and `ai_agent_domain_glossary_corrected.jsonl`.

```md
You are a senior technical writer and editor specializing in AI agents, LLM systems, software architecture, security, evaluation, and production operations.

You will receive:

1. `article_outline.md`
2. `principles_corrected_traceability.jsonl`
3. `ai_agent_domain_glossary_corrected.jsonl`

# Goal

Write a comprehensive, practical, evidence-backed article named `final_article.md` about AI agent best practices.

The article should help engineers, product managers, technical leads, platform teams, security teams, and organizational leaders design, evaluate, operate, and govern AI agents responsibly.

# Output

Return Markdown only. Do not output JSON, YAML, or a code block.

# Style

Write in clear, practical English. Make it feel like an engineering guide, not marketing.

Avoid hype. Avoid vague claims. Prefer concrete sentences such as:

- Use the least agentic architecture that solves the task.
- Treat tools as narrow contracts.
- Evaluate full workflows, not just final answers.
- Keep humans in control of consequential actions.
- Operate agents as production systems.

# Required structure

Use the structure from `article_outline.md`. Preserve the main section order unless a small editorial adjustment improves flow.

Include sections on:

1. What makes an AI agent different
2. Least agentic architecture
3. Inspectable agent loop
4. Tool contracts
5. Context, memory, and state
6. Human control
7. Security
8. Evaluation
9. Debugging
10. Production operations
11. UX and trust
12. Governance
13. Final checklist
14. Conclusion
15. Optional short glossary

# Terminology

Use `ai_agent_domain_glossary_corrected.jsonl` as the terminology standard.

# Required structured blocks

Include at least:

1. An agency spectrum table
2. A tool contract anatomy table
3. An evaluation matrix

# Traceability

Use the ideas in `principles_corrected_traceability.jsonl`, but do not overload the article. If useful during drafting, include compact notes like:

> Principle basis: P001. Source clusters: C001.

These can be removed in the public editing step.

# Quality check

Before output, verify the article follows the outline, avoids hype, keeps the least-agentic thesis, uses consistent terminology, includes practical examples, has readable tables, and represents all major principles.
```
