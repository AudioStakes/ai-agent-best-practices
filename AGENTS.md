# AGENTS.md

## Working Rules

- Treat `content/` as the source Markdown tree.
- Treat `sources/` as source URL metadata and capture bookkeeping.
- Treat `archive/` as reusable but non-source captures and extracted article output.
- Treat `site/` as the static implementation source for CSS and JavaScript.
- Treat `dist/` as generated site output. Do not edit generated files directly.
- Prefer small, targeted `biome lint` and `biome format` runs on the files you changed.
- Use `npm run verify:full` before handing off any change that affects the site shell, article pages, glossary behavior, or tests.
- If a generated page or link is wrong, fix the source Markdown or build scripts instead of adding a test exception.

## Regeneration Notes

- Root site source files live in `content/index.md` and `content/domain-glossary.md`.
- Tag guide Markdown lives in `content/tag-guides/`.
- `workflow/scripts/build_root_pages.js` turns the root Markdown into `dist/index.html` and `dist/domain-glossary.html`.
- `workflow/scripts/build_tag_guides_html.js` turns each tag-guide Markdown file into a matching HTML file in `dist/tag-guides/`.
- `workflow/scripts/package_dist_assets.js` packages site CSS / JS into `dist/site/` for local preview and GitHub Pages artifact use.
- `scripts/clean-dist.mjs` removes `dist/` before a fresh build.
- `workflow/scripts/save_singlefile.js` reads `sources/articles.csv` and saves HTML captures into `archive/singlefile/`.
- `workflow/scripts/save_content.js` reads `sources/articles.csv` and saves extracted Markdown into `archive/extracted/`.
- `workflow/scripts/annotate_tag_guides_fences.js` updates semantic fences in `content/tag-guides/`.
- Generated Markdown and HTML are build output, not a source of truth.
- If a page title or URL looks wrong, check the Markdown filename and the first heading first.

## Useful Commands

- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm run verify:fast`
- `npm run verify:full`
- `npm test`
