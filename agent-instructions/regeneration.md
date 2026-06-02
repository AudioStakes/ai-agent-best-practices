# Regeneration Rules

## Build Inputs

- `workflow/scripts/build_root_pages.ts` turns `content/index.md` and `content/domain-glossary.md` into `dist/index.html` and `dist/domain-glossary.html`.
- `workflow/scripts/build_tag_guides_html.ts` turns each file in `content/tag-guides/` into a matching HTML file in `dist/tag-guides/`.
- `workflow/scripts/package_dist_assets.ts` packages site CSS and JavaScript into `dist/site/` for local preview and GitHub Pages artifact use.
- `scripts/clean-dist.mjs` removes `dist/` before a fresh build.

## Capture and Extraction

- `workflow/scripts/save_singlefile.ts` reads `sources/articles.csv` and saves HTML captures into `archive/singlefile/`.
- `workflow/scripts/save_content.ts` reads `sources/articles.csv` and saves extracted Markdown into `archive/extracted/`.
- `workflow/scripts/annotate_tag_guides_fences.ts` updates semantic fences in `content/tag-guides/`.

## Source of Truth Rules

- Generated Markdown and HTML are build output, not a source of truth.
- If a page title or URL looks wrong, check the Markdown filename and the first heading first.
- If a generated page or link is wrong, fix the source Markdown or build scripts instead of adding a test exception.
