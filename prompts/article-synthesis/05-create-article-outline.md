# 05 create article outline

Use this prompt with `principles_corrected_traceability.jsonl`.

```md
You are a senior technical editor and synthesis writer specializing in AI agents, LLM systems, software architecture, security, evaluation, and production operations.

You will receive `principles_corrected_traceability.jsonl`.

# Goal

Create a detailed article outline named `article_outline.md` for a comprehensive article about AI agent best practices.

The goal is not to write the full article yet. The goal is to design a strong, coherent, evidence-backed article structure that can later be expanded into a final synthesis article.

# Output format

Return Markdown only. Do not output JSON, YAML, or a code block.

# Target audience

Software engineers, AI engineers, product managers, engineering managers, technical leads, platform teams, security teams, and organizational leaders responsible for real AI agent adoption.

# Requirements

The outline must include proposed title, thesis, audience, reader promise, recommended section order, major sections and subsections, traceability, final checklist, suggested conclusion, and optional appendices.

For each major section include:

- section purpose
- key argument
- principles used
- source cluster IDs
- representative topic IDs
- best practices
- anti-patterns or mistakes
- examples or scenarios
- writer notes

# Traceability rules

For each major section, include:

- `Principles used: Pxxx, Pxxx`
- `Source clusters: Cxxx, Cxxx`
- `Representative topic IDs: Axxx-Txx, Axxx-Txx`

Do not include every topic ID if there are too many. Include representative IDs only. Do not invent IDs.

# Editorial strategy

Use the principles as the backbone, but organize them into a natural reading flow: framing and scope, architecture and task selection, workflow and agent-loop design, tool/context/memory/state design, human control and safety boundaries, evaluation/testing/debugging, production operations, UX/governance, and final checklist.

# Quality check

Verify every principle appears somewhere, every section has a clear purpose, the order tells a coherent story, traceability IDs are valid, and the outline is detailed enough to draft from.
```
