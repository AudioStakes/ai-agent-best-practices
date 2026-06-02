# Workflow AGENTS

## Working Rules

- Keep this directory focused on capture, extraction, build, and validation tooling.
- `sources/articles.csv` is the source URL and capture metadata file.
- `archive/singlefile/` and `archive/extracted/` are intermediate outputs and should not be treated as source Markdown.
- `content/` holds the editable source Markdown for the site.
- `dist/` holds generated HTML and publishable static assets. Do not edit generated output directly.
- When editing `workflow/scripts/*`, run Biome on the touched script files and on this directory's Markdown docs before handing off.
- Prefer `npm run save:singlefile:dry-run` and `npm run save:content:dry-run` before doing a full regeneration.
- If you change paths, outputs, or CSV handling, update `workflow/README.md` in the same change so the documented process stays accurate.

## Useful Commands

- `npm run save:singlefile`
- `npm run save:singlefile:dry-run`
- `npm run save:content`
- `npm run save:content:dry-run`
- `tsx workflow/scripts/build_singlefile_index.ts`
