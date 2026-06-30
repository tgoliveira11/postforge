# Contributing to PostForge

PostForge is a deployable application template — not an npm package. Work flows through branches and pull requests; releases are cut manually on `main`.

**Owner/repo:** [tgoliveira11/postforge](https://github.com/tgoliveira11/postforge)

---

## Branch-first workflow

**Base branch:** `main` (no `develop`).

Before substantive work, create a branch from up-to-date `main`:

| Prefix | Use for |
|--------|---------|
| `feature/…` | Behavior, API, UX |
| `fix/…` | Bug fixes |
| `docs/…` | Documentation only |
| `chore/…` | CI, tooling, dependencies, release plumbing |

**Rules:**

- Do **not** commit directly to `main` unless explicitly requested.
- Do **not** push to `main` without explicit approval.
- AI agents follow the same rules — see `.cursor/rules/branch-pr-release.mdc`.

```bash
git checkout main
git pull origin main
git checkout -b feature/my-change
```

---

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(api): add post export endpoint
fix(blog): correct RSS item order
docs: document release workflow
chore(ci): add branch-name check
```

- Subject line: clear and concise.
- Body: only when it adds context.
- Commit **only when asked** — otherwise leave work uncommitted or on a feature branch.

**Never** run destructive git commands (`push --force`, `reset --hard`, etc.) unless explicitly requested.

---

## Pre-PR checklist (code changes)

Before opening a PR or declaring a code task complete:

1. Run **`npm run validate`** (typecheck, test, lint, build).
2. Add or update tests for changed behavior.
3. Update **`CHANGELOG.md`** under `## [Unreleased]` when behavior, API, schema, env vars, jobs/cron, privacy, or visible UX changes.
4. Update **`docs/CURRENT_PRODUCT_SURFACE.md`** when routes, endpoints, jobs, integrations, or shipped/planned status changes.
5. Confirm no secrets (`.env`, credentials) are staged.

Trivial docs-only changes may skip `npm run validate`.

---

## Pull request cycle

1. Push your branch and open a PR against `main` **only when asked**:

   ```bash
   gh pr create --base main --title "feat: …" --body "…"
   ```

2. Include a **summary** and **test plan** in the PR body.
3. Do **not** merge, approve, or push to `main` without explicit approval.
4. Prefer **squash merge**.
5. Address review feedback on the same branch.
6. After merge:

   ```bash
   git checkout main
   git pull origin main
   git branch -d feature/my-change
   ```

   Confirm changelog, product surface doc, and tests are consistent before closing the task.

---

## Releases

Releases are **manual only**. See **[docs/releasing.md](releasing.md)**.

- Version source: **`VERSION`** (must match git tag `vX.Y.Z` and GitHub Release `vX.Y.Z`).
- Agents must **not** run the release workflow or create tags/releases without explicit approval.

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [releasing.md](releasing.md) | Manual release workflow and recovery |
| [repo-settings.md](repo-settings.md) | GitHub branch protection |
| [CURRENT_PRODUCT_SURFACE.md](CURRENT_PRODUCT_SURFACE.md) | Live inventory of routes and integrations |
| [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) | Env reference |
