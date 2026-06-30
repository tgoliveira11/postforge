# GitHub repository settings

Manual configuration for [tgoliveira11/postforge](https://github.com/tgoliveira11/postforge). Apply via **Settings** in the GitHub UI or `gh api` (requires admin access).

---

## Branch protection — `main`

| Rule | Value |
|------|-------|
| Require pull request before merging | **Yes** |
| Required status checks | `validate`, `branch-name` |
| Require branches to be up to date | **Yes** (strict) |
| Require linear history | **Yes** (squash merge) |
| Allow force pushes | **No** |
| Allow deletions | **No** |
| Lock branch | **No** — release workflow must push version metadata to `main` |

### Configure via GitHub UI

1. **Settings → Branches → Add branch protection rule**
2. Branch name pattern: `main`
3. Enable **Require a pull request before merging**
4. Enable **Require status checks to pass** → select `validate` and `branch-name`
5. Enable **Require branches to be up to date before merging**
6. Enable **Require linear history**
7. Disable **Allow force pushes**

### Configure via CLI (reference)

```bash
gh api repos/tgoliveira11/postforge/branches/main/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["validate", "branch-name"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

Adjust `required_approving_review_count` if you want mandatory human review.

---

## Release workflow permissions

**Settings → Actions → General → Workflow permissions:**

- **Read and write permissions** (required for release workflow to commit, tag, and create releases)
- Allow GitHub Actions to create and approve pull requests: optional

---

## Actions secrets

The release workflow uses the default `GITHUB_TOKEN`. No extra secrets are required for tag + GitHub Release.

If you add a deploy workflow later, store deploy credentials as repository secrets — not in the repo.

---

## Template repository

Upstream PostForge should remain a **template repository** (Settings → General → Template repository) so blog owners can create independent repos.

---

## Optional (not required for releases)

| Setting | When to add |
|---------|-------------|
| **Environments → production** with required reviewers | Manual deploy workflow exists |
| **CODEOWNERS** | Team wants automatic review routing |
| **Signed commits** | Organization policy requires it |
