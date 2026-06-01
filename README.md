# AI Agent Best Practices Knowledge Base

A curated knowledge base of AI agent best practices based on primary sources such as official documentation from OpenAI, Anthropic, Google, Microsoft, LangChain, and related providers.

The repository is organized so it is easy to tell what is source, what is intermediate capture, what is editorial Markdown, and what is generated site output.

> **Reference period:** May 2026  
> Always check the original sources for the latest specifications and recommendations.

## How This Repository Works

| Step | Stage | Owner | Output |
|---:|---|---|---|
| 1 | Collect source URLs | Human / ChatGPT | `sources/articles.csv` |
| 2 | Save source pages | Automation | `archive/singlefile/` |
| 3 | Extract article content | Automation | `archive/extracted/` |
| 4 | Read and synthesize sources | ChatGPT | `notes/` |
| 5 | Draft guide Markdown | ChatGPT | `content/tag-guides/*.md` |
| 6 | Normalize structure and terms | ChatGPT / Automation | Source Markdown under `content/` |
| 7 | Generate HTML and package public assets | Automation | `dist/` |
| 8 | Verify and publish | Automation / Human | Checked public site |

## Source of Truth

Markdown files under `content/` are the source of truth.

Generated HTML and static assets live under `dist/`. Do not edit generated output directly. Fix the Markdown source, glossary source, semantic markers, or build scripts instead.

## Key Paths

```text
sources/articles.csv                 # Primary-source URL list and capture metadata
archive/singlefile/                  # Saved full-page HTML captures, ignored by Git
archive/extracted/                   # Extracted Markdown from source articles, ignored by Git
notes/                               # ChatGPT reading notes and synthesis drafts
content/index.md                     # Source Markdown for the top page
content/domain-glossary.md           # Source Markdown for the glossary
content/tag-guides/                  # Source Markdown for tag guides
site/styles/                         # Site CSS
site/scripts/                        # Site JavaScript
workflow/                            # Capture, extraction, and build scripts
dist/                                # Generated publishable site output, ignored by Git
```

## Common Commands

```bash
npm install
npm run save:singlefile
npm run save:content
npm run build
npm run verify
```

More detailed regeneration steps are documented in [`workflow/README.md`](./workflow/README.md).

## Markdown Rendering

Source Markdown is converted to HTML with `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, and `rehype-stringify`.
The renderer supports GitHub Flavored Markdown features such as tables, task lists, strikethrough, code blocks, inline code, links, quotes, lists, and headings.
Generated pages wrap rendered content in `.markdown-body`, and `github-markdown-css` is copied into `dist/site/styles/github-markdown.css` so the GitHub Markdown styling is applied alongside the site shell.
Repository Markdown can include trusted raw HTML, so untrusted external Markdown should be sanitized before using the same pipeline.

## Local Preview

```bash
npm run build
./serve.sh
```

Then open:

```text
http://localhost:8000/
```

Run `npm run build` before `./serve.sh`. The local server only serves `dist/`.

## Publish

GitHub Pages is intended to publish the generated `dist/` output from CI. Generated output is not committed.

Publish by running `npm run build` and `npm run verify`, then deploying the `dist/` artifact.
