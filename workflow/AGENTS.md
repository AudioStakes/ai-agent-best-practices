# Workflow AGENTS

## Working Rules

- Keep this directory limited to article regeneration and archive tooling.
- When editing `workflow/scripts/*`, run Biome on the touched script files and
  on this directory's markdown docs before handing off.
- Prefer `npm run save:singlefile:dry-run` and `npm run save:content:dry-run`
  before doing a full regeneration.
- If you change paths, outputs, or CSV handling, update `workflow/README.md`
  in the same change so the documented process stays accurate.

## Useful Commands

- `npm run save:singlefile`
- `npm run save:singlefile:dry-run`
- `npm run save:content`
- `npm run save:content:dry-run`
- `npm run build:index`
