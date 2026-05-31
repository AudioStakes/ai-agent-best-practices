# AGENTS.md

## Working Rules

- Treat the repository root as the main static site.
- Prefer small, targeted `biome lint` and `biome format` runs on the root site
  files, `tests/`, and `workflow/` files you changed.
- Use `npm run verify` before handing off any change that affects the site
  shell, article pages, glossary behavior, or tests.
- Keep the root README focused on how to read and verify the site. Put article
  regeneration steps in `workflow/README.md` instead of expanding the root docs.
- When changing generated HTML, keep the visible text, navigation, and linked
  targets readable, and fix the source of any broken label instead of adding a
  test exception.

## Useful Commands

- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm test`
- `npm run verify`
