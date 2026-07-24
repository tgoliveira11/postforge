# Current Product Surface

> Living inventory of what PostForge exposes today. Update this file when routes, endpoints, jobs, integrations, or shipped/planned status changes.

**Last verified:** 2026-07-24

---

## Status legend

| Label | Meaning |
|-------|---------|
| **Shipped** | Available in `main` |
| **Planned** | Documented but not implemented |

---

## 1. Public app routes (Shipped)

Route group `(public)` does not affect URLs.

| Route | Purpose |
|-------|---------|
| `/` | Home — featured and recent published posts |
| `/blog` | Blog index (paginated) |
| `/blog/[slug]` | Published post detail + previous/next navigation |
| `/search` | Full-text search (published posts) |
| `/tags` | Tag index |
| `/tags/[slug]` | Posts by tag |
| `/categories` | Category index |
| `/categories/[slug]` | Posts by category |
| `/[...legacyPath]` | Legacy URL redirects (DB-backed; 404 if no match) |

### Auth & account (guest-facing)

| Route | Purpose |
|-------|---------|
| `/login` | Sign in (`@tgoliveira/secure-auth`) |
| `/login/2fa` | Two-factor verification |
| `/login/complete` | Post-login completion |
| `/register` | Account registration |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset form |
| `/verify-email` | Email verification |
| `/check-email` | Check inbox confirmation |
| `/account-deleted` | Post-deletion confirmation |

### Legacy redirects

| Route | Redirects to |
|-------|--------------|
| `/settings/account` | `/admin/account` |
| `/settings/security` | `/admin/security` |
| `/settings/sessions` | `/admin/sessions` |

---

## 2. Admin routes (Shipped)

Protected by `requireAdminSession()` — authenticated user whose email matches `ADMIN_EMAIL`.

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard |
| `/admin/posts` | Posts list |
| `/admin/posts/new` | Create post |
| `/admin/posts/[id]` | Post overview |
| `/admin/posts/[id]/edit` | Post editor |
| `/admin/posts/[id]/preview` | Preview |
| `/admin/posts/[id]/assets` | Post assets |
| `/admin/posts/[id]/analytics` | Per-post analytics |
| `/admin/tags` | Tag management |
| `/admin/categories` | Category management |
| `/admin/analytics` | Site analytics |
| `/admin/analytics/posts/[id]` | Post analytics detail |
| `/admin/import` | Import post from URL |
| `/admin/account` | Account settings (secure-auth) |
| `/admin/security` | Security — 2FA, passkeys, password |
| `/admin/sessions` | Active sessions |

Most admin mutations use **Server Actions** in `src/modules/*/admin-*.actions.ts`. REST admin API is limited to asset upload (below).

---

## 3. API routes (Shipped)

### Auth — `/api/auth/*`

Delegates to `secureAuth.routes.*` in `src/lib/auth/secure-auth.ts`.

| Methods | Route | Purpose |
|---------|-------|---------|
| GET, POST | `/api/auth/[...nextauth]` | NextAuth session / OAuth |
| POST | `/api/auth/register` | Registration |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password` | Complete reset |
| POST | `/api/auth/verify-email/confirm` | Confirm email |
| POST | `/api/auth/verify-email/resend` | Resend verification |
| GET | `/api/auth/password-policy` | Password policy |
| GET | `/api/auth/package-health` | Package health |
| GET | `/api/auth/login/challenge-status` | Login challenge polling |
| GET | `/api/auth/login/trace` | Debug trace (env-gated) |
| POST | `/api/auth/login/start` | Start login (API) |
| POST | `/api/auth/login/start-form` | Start login (form) |
| POST | `/api/auth/login/complete` | Complete login |
| POST | `/api/auth/login/verify-2fa` | Verify 2FA (API) |
| POST | `/api/auth/login/verify-2fa-form` | Verify 2FA (form) |
| POST | `/api/auth/login/verify-2fa-oauth` | Verify 2FA (OAuth) |
| POST | `/api/auth/passkey/login/options` | Passkey login options |
| POST | `/api/auth/passkey/login/verify` | Passkey login verify |

### Account — `/api/account/*`

| Methods | Route | Purpose |
|---------|-------|---------|
| GET, DELETE | `/api/account` | Read / delete account |
| GET | `/api/account/auth-status` | Client auth state |
| POST | `/api/account/change-password` | Change password |
| GET | `/api/account/passkeys` | List passkeys |
| POST | `/api/account/passkeys/register` | Register passkey |
| DELETE | `/api/account/passkeys/[id]` | Remove passkey |
| GET | `/api/account/2fa/status` | 2FA status |
| POST | `/api/account/2fa/setup/start` | Start 2FA setup |
| POST | `/api/account/2fa/setup/verify` | Verify 2FA setup |
| POST | `/api/account/2fa/disable` | Disable 2FA |
| POST | `/api/account/2fa/backup-codes/regenerate` | Regenerate backup codes |
| GET | `/api/account/sessions` | List sessions |
| POST | `/api/account/sessions/ping` | Session keepalive |
| POST | `/api/account/sessions/revoke-current` | Revoke current |
| POST | `/api/account/sessions/revoke-others` | Revoke others |
| POST | `/api/account/sessions/revoke-all` | Revoke all |
| DELETE | `/api/account/sessions/[id]` | Revoke by ID |

### Admin — `/api/admin/*`

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/admin/posts/[id]/assets` | Upload post asset (admin session) |

### Analytics — `/api/analytics/*`

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/analytics/post-view` | Track post view (rate-limited) |

### Assets — `/api/assets/*`

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/assets/[...path]` | Serve local uploads only (`UPLOAD_PROVIDER=local`) |

### Cron — `/api/cron/*` (Planned)

**Not implemented.** No routes under `src/app/api/cron/`.

---

## 4. Static / special routes (Shipped)

| URL | Implementation | Notes |
|-----|----------------|-------|
| `/rss.xml` | `src/app/rss.xml/route.ts` | Published posts; shared public order |
| `/sitemap.xml` | `src/app/sitemap.ts` | Published URLs |
| `/robots.txt` | `src/app/robots.txt/route.ts` | Disallows `/admin`, `/api/admin` |
| `/llms.txt` | `src/app/llms.txt/route.ts` | Concise AI-readable map for LLM/browser-agent consumers |
| `/llms-full.txt` | `src/app/llms-full.txt/route.ts` | Full AI-readable public content export |
| `/opengraph-image` | `src/app/opengraph-image.tsx` | Generic fallback social preview image |

`/llms.txt` and `/llms-full.txt` are optional discovery aids for LLM/browser-agent workflows; Google Search does not require or specially use them.

---

## 5. CLI scripts (Shipped)

| npm script | Purpose |
|------------|---------|
| `import:github-pages` | Import legacy Markdown / Jekyll content |
| `inspect:posts` | Inspect recent posts and assets in DB |
| `content:validate` | Validate published content health, taxonomy references, assets, redirects, and internal links |
| `db:generate` | Generate Drizzle migrations |
| `db:migrate` | Apply migrations |
| `db:studio` | Drizzle Studio |

Dev/CI scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `validate`, `audit*`.

---

## 6. Integrations (Shipped)

| Integration | Role |
|-------------|------|
| `@tgoliveira/secure-auth` | Auth, sessions, 2FA, passkeys, account APIs, middleware |
| PostgreSQL + Drizzle | Blog + auth data |
| Google Analytics 4 / Google tag | Optional public-only analytics via `GOOGLE_ANALYTICS_MEASUREMENT_ID` or `blog_settings.googleAnalyticsMeasurementId` |
| Vercel Blob | Optional production uploads (`UPLOAD_PROVIDER=vercel-blob`) |
| Resend | Optional transactional email (`EMAIL_PROVIDER=resend`) |
| Local filesystem | Dev uploads (`UPLOAD_PROVIDER=local`) |

---

## 7. Cron / scheduled jobs

| Item | Status |
|------|--------|
| `/api/cron/publish-scheduled` | **Planned** — auto-publish scheduled posts |
| `vercel.json` cron | **Planned** |
| Scheduled posts UI + schema | **Shipped** — manual publish until cron exists |
| `CRON_SECRET` env | Documented; no runtime consumer yet |

---

## 8. Release & CI (Shipped)

| Item | Location |
|------|----------|
| Version source | `VERSION` |
| Changelog | `CHANGELOG.md` |
| CI validate | `.github/workflows/ci.yml` |
| Manual release | `.github/workflows/release.yml` |
