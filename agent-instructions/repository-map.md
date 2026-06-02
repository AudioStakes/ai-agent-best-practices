# Repository Map

## Source and Generated Areas

- `content/` is the source Markdown tree.
- `sources/` is the source URL metadata and capture bookkeeping area.
- `archive/` is for reusable but non-source captures and extracted article output.
- `site/` is the static implementation source for CSS and JavaScript.
- `dist/` is generated site output and should not be edited directly.

## Supporting Areas

- `workflow/` contains capture, extraction, build, and validation scripts.
- `notes/` contains reading notes and synthesis drafts.

## Important Source Files

- `content/index.md` and `content/domain-glossary.md` are the root site sources.
- `content/tag-guides/` contains the tag guide Markdown files.
- `workflow/AGENTS.md` covers workflow-specific guidance for scripts in `workflow/`.
