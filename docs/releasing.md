# Releasing PostForge

PostForge releases are **manual only**. There is no npm publish — a release means cutting a versioned snapshot in Git and publishing notes via **GitHub Releases**.

**Owner/repo:** `tgoliveira11/postforge`  
**Version source:** `VERSION` (repo root)  
**Workflow:** `.github/workflows/release.yml`  
**Prepare script:** `scripts/prepare-release.mjs`

---

## Release invariant

For every version `X.Y.Z`:

```text
VERSION = X.Y.Z  ⟺  git tag vX.Y.Z  ⟺  GitHub Release vX.Y.Z
```

The release workflow enforces all three in a single run, or completes missing pieces in **recovery mode** without double-bumping the version.

Deploy to production/staging (if any) is a **separate manual step** — not part of version bump.

---

## When to release

Cut a release when `main` contains user-visible changes documented under `CHANGELOG.md` → `## [Unreleased]`.

Do **not** trigger releases automatically on push or tag.

---

## Changelog rules

| State | Meaning |
|-------|---------|
| `## [Unreleased]` | Work in progress on `main` |
| `## [X.Y.Z] - YYYY-MM-DD` | Shipped release section |

**New release:** `[Unreleased]` must be **non-empty**. The workflow bumps version, moves notes into `## [X.Y.Z]`, and leaves a fresh empty `[Unreleased]`.

**Recovery:** `[Unreleased]` is **empty** → workflow reuses the current `VERSION`, creates missing tag/GitHub Release only, **no version bump**.

**Fail early:** If an operator requests `patch` / `minor` / `major` with an empty `[Unreleased]`, the workflow exits with a clear error (use recovery mode instead).

---

## How to release (operator)

### 1. Ensure `main` is ready

- Merged PRs include changelog entries under `[Unreleased]`.
- `npm run validate` passes on `main`.

### 2. Trigger the workflow

GitHub → **Actions** → **Release** → **Run workflow**

| Input | Effect |
|-------|--------|
| *(blank)* / `auto` | Patch bump from `[Unreleased]` |
| `patch` | Patch bump |
| `minor` | Minor bump |
| `major` | Major bump |
| `1.2.3` | Exact version (must be > current) |

### 3. What the workflow does

1. **Pre-flight** — parse `[Unreleased]` (new release vs recovery).
2. **Prepare** — `node scripts/prepare-release.mjs` updates `VERSION`, `package.json` version metadata, and rolls `CHANGELOG.md`.
3. **Commit** (if changed) — `Release X.Y.Z` on `main` via `github-actions[bot]`.
4. **Tag** — annotated `vX.Y.Z`, push to origin.
5. **GitHub Release** — title `PostForge X.Y.Z`, body from changelog section (fallback: generated notes).

### 4. Recovery after partial failure

If a run failed after bumping files but before tag/release (or tag exists without Release):

1. Fix `main` if needed (do **not** bump version again manually).
2. Re-run **Release** with empty `[Unreleased]` → recovery mode reuses current `VERSION` and creates missing tag/release.

---

## Local dry-run (optional)

```bash
node scripts/prepare-release.mjs --bump patch --dry-run
```

Prints resolved version and files that would change without writing.

---

## Agent restrictions

AI agents must **not**:

- Run `.github/workflows/release.yml`
- Create git tags or GitHub Releases
- Commit release metadata to `main`

Only the release workflow (or an explicitly authorized human) commits version bumps on `main`.

---

## Optional future gaps

Not implemented unless requested:

- Attach build artifacts to GitHub Releases
- GitHub **production** environment with required reviewers for deploy workflows
- `CODEOWNERS` for automatic review routing
