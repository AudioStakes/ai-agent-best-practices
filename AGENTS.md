# AGENTS.md

## Working Rules

- Treat the repository root as the main static site.
- Prefer small, targeted `biome lint` and `biome format` runs on the root site
  files, `tests/`, and `workflow/` files you changed.
- Use `npm run verify` before handing off any change that affects the site
  shell, article pages, glossary behavior, or tests.
- Treat generated HTML and mirrored Markdown under `docs/` as build output.
  Regenerate them with `npm run build` instead of committing them.
- Keep the root README focused on how to read and verify the site. Put article
  regeneration steps in `workflow/README.md` instead of expanding the root docs.
- When changing generated HTML, keep the visible text, navigation, and linked
  targets readable, and fix the source of any broken label instead of adding a
  test exception.

## Regeneration Notes

- Markdown source files for tag guides live in `knowledge_templated/tag-guides/`.
  Root site source files live in `index.md` and `domain-glossary.md`.
  `workflow/scripts/build_root_pages.js` turns them into `index.html` and
  `domain-glossary.html`.
- `workflow/scripts/build_tag_guides_html.js` turns each `.md` file into a
  matching `.html` file in `tag-guides/`, and
  `workflow/scripts/build_public_pages.js` mirrors the source Markdown and
  generated HTML into `docs/` for GitHub Pages output.
- The output URL is derived from the file name. For example,
  `knowledge_templated/tag-guides/11-markdown-code-block-gallery.md` becomes
  `tag-guides/11-markdown-code-block-gallery.html` locally and
  `docs/tag-guides/11-markdown-code-block-gallery.html` for Pages.
- Page names are the numbered filename plus the first `#` heading in the
  Markdown. The generated HTML `<title>` and page `<h1>` both come from that
  first heading after Markdown is rendered and annotated.
- Generated Markdown under `docs/` is build output, not a source of truth.
- If a page title or URL looks wrong, check the Markdown filename and the first
  heading first. Those two inputs usually explain the generated title, file
  path, and navigation label.

## Useful Commands

- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm test`
- `npm run verify`
