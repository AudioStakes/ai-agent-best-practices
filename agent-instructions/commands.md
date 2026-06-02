# Commands and Verification

## Common Commands

- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm run verify:fast`
- `npm run verify:full`
- `npm test`

## Usage Notes

- Prefer targeted `biome lint` and `biome format` runs on only the files you changed.
- Use `npm run verify:full` before handing off any change that affects the site shell, article pages, glossary behavior, or tests.
- If the change is small and local, run the smallest command that verifies the touched surface first.
