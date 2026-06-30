<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Agent workflow

- **Contributing:** [docs/contributing.md](docs/contributing.md) — branch-first, PRs, commits, validation.
- **Releases:** [docs/releasing.md](docs/releasing.md) — manual only; `VERSION` ⟺ `vX.Y.Z` tag ⟺ GitHub Release.
- **Product surface:** [docs/CURRENT_PRODUCT_SURFACE.md](docs/CURRENT_PRODUCT_SURFACE.md) — update when routes/endpoints change.
- **Cursor rule:** `.cursor/rules/branch-pr-release.mdc` (always applied).

Do not commit to `main`, open/merge PRs, or cut releases unless explicitly asked.
