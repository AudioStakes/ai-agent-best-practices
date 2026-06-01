# AI Agent Best Practices Knowledge Base

A curated knowledge base of AI agent best practices based on primary sources such as official documentation from OpenAI, Anthropic, Google, Microsoft, LangChain, and related providers.

The goal is to turn reliable source material into practical, theme-based guides for improving AI agent design, evaluation, operations, coding workflows, and production readiness.

> **Reference period:** May 2026  
> Always check the original sources for the latest specifications and recommendations.

## How This Repository Works

| Step | Stage | Owner | Output |
|---:|---|---|---|
| 1 | Collect source URLs | Human / ChatGPT | `articles.csv` |
| 2 | Save source pages | Automation | `singlefile/` |
| 3 | Extract article content | Automation | `content/` |
| 4 | Read and synthesize sources | ChatGPT | Notes and article plans |
| 5 | Draft guide Markdown | ChatGPT | `knowledge_templated/tag-guides/*.md` |
| 6 | Normalize structure and terms | ChatGPT / Automation | Clean Markdown sources |
| 7 | Generate HTML | Automation | Generated site files |
| 8 | Verify and publish | Automation / Human | Checked public site |

In short: source URLs are captured and converted into Markdown, ChatGPT helps synthesize them into guides, and automation generates and verifies the site.

## Source of Truth

Markdown files are the source of truth.

Generated HTML is build output. Do not edit generated HTML directly. Fix the Markdown source, glossary source, semantic markers, or build scripts instead.

## Key Paths

```text
articles.csv                         # Primary-source URL list and capture metadata
content/                             # Extracted Markdown from source articles
singlefile/                          # Saved full-page HTML captures
knowledge_templated/tag-guides/       # Source Markdown for tag guides
index.md                             # Source Markdown for the top page
domain-glossary.md                   # Source Markdown for the glossary
workflow/                            # Capture, extraction, and build scripts
docs/                                # GitHub Pages output
````

## Common Commands

```bash
npm install
npm run save:singlefile
npm run save:content
npm run build
npm run verify
```

More detailed regeneration steps are documented in [`workflow/README.md`](./workflow/README.md).

## Local Preview

```bash
npm run build
./serve.sh
```

Then open:

```text
http://localhost:8000/
```

## Publish

The site is intended to be published with GitHub Pages.

If generated HTML is not committed, publish through CI by building the site and deploying the generated output as a Pages artifact.
