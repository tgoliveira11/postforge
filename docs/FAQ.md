# FAQ

Common questions about using PostForge as a blog template.

---

## Should I fork or use the template?

**Use the template** to create your own blog.

**Fork** only if you plan to contribute to PostForge upstream or maintain an explicit merge relationship with the official repo.

See [TEMPLATE_STRATEGY.md](TEMPLATE_STRATEGY.md).

---

## Can I deploy for free?

Yes, with limits:

- **Vercel Hobby** — free tier for Next.js
- **Neon / Supabase** — free PostgreSQL tiers
- **Object storage** — may have free tiers (R2, Supabase Storage)

You still need a custom domain (optional, paid) and must handle storage correctly on serverless. See [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Can I use Vercel?

Yes. PostForge is a standard Next.js App Router app.

Use managed PostgreSQL and set **`UPLOAD_PROVIDER=vercel-blob`** with a Vercel Blob store. See [deployment-vercel-neon.md](deployment-vercel-neon.md) and [STORAGE_STRATEGY.md](STORAGE_STRATEGY.md).

---

## Where are images stored?

- **Local (`UPLOAD_PROVIDER=local`):** disk at `UPLOAD_LOCAL_DIR`, served via `/api/assets/...`
- **Vercel Blob (`UPLOAD_PROVIDER=vercel-blob`):** public URLs on `blob.vercel-storage.com`

See [STORAGE_STRATEGY.md](STORAGE_STRATEGY.md).

---

## How do I control the order of posts on the home page and blog?

Set **manual public order** on `/admin/posts` for published posts (`publicOrder` column). Lower numbers appear first. New posts start at `publicOrder = 0`.

This is separate from **pinned** and **featured**, which only control the home-page hero promotion.

Pagination size is configured with `PUBLIC_POSTS_PAGE_SIZE` (default `5`) for `/blog`. The home “Recent posts” grid uses `HOME_RECENT_POSTS_LIMIT` (default `12`) and follows the same public ordering as `/blog`.

RSS and search use their own ordering (search uses relevance / date). `/blog`, home “Recent posts”, previous/next navigation, and RSS share the same public listing order.

---

## Why do I need Vercel Blob on Vercel?

Vercel serverless functions use an **ephemeral filesystem**. Files written to disk during uploads can disappear after redeploys or cold starts, and instances do not share disk.

`UPLOAD_PROVIDER=local` works for development and VPS hosts with persistent storage, but **not** for reliable Vercel production uploads.

PostForge ships with `UPLOAD_PROVIDER=vercel-blob` so template blogs get durable storage without extra infrastructure.

See [deployment-vercel-neon.md](deployment-vercel-neon.md).

---

## Can I use local uploads in production?

**On Vercel:** No — use `UPLOAD_PROVIDER=vercel-blob`.

**On a VPS or dedicated server** with a persistent mounted volume: Yes — `UPLOAD_PROVIDER=local` with `UPLOAD_LOCAL_DIR` pointing to that path.

---

## Why are Blob URLs stored directly?

Vercel Blob objects are served from `https://...blob.vercel-storage.com/...` with public access. There is no need to proxy through `/api/assets`.

PostForge stores the Blob URL in `assets.publicUrl` and renders it directly on public pages (`PostImage` uses `unoptimized` for remote URLs). `next.config.ts` allows `*.blob.vercel-storage.com` in `images.remotePatterns`.

---

## Do I need a DB migration for Vercel Blob?

**No.** The existing `assets` table already has:

- `storageProvider` — `"local"` or `"vercel-blob"`
- `storageKey` — `posts/{postId}/{safeFilename}`
- `publicUrl` — local or Blob URL

Run `npm run db:generate` after merging upstream — it should report no schema changes.

---

## How do I configure an existing blog repo?

Merge upstream PostForge, install dependencies, run quality gates, then set Vercel env vars:

```bash
git remote add upstream https://github.com/tgoliveira11/postforge.git
git fetch upstream
git merge upstream/main
npm install
npm run typecheck
npm test
npm run lint
npm run build
npm run db:generate
```

In Vercel:

```env
UPLOAD_PROVIDER=vercel-blob
BLOB_READ_WRITE_TOKEN=<from-connected-blob-store>
UPLOAD_MAX_FILE_SIZE_BYTES=5242880
```

Redeploy. See [UPGRADING_FROM_POSTFORGE.md](UPGRADING_FROM_POSTFORGE.md) and [deployment-vercel-neon.md](deployment-vercel-neon.md).

---

## What happens to old local assets?

Assets uploaded before switching providers **keep their existing `publicUrl`** in the database (typically `/api/assets/...`).

- They continue to work if the files still exist on disk (e.g. VPS)
- On Vercel, old local files are usually gone — those images may 404 until re-uploaded
- **New uploads** use the configured provider (Blob URLs on Vercel)

There is no automated migration script from local disk to Blob yet.

---

## Can I later use S3, R2, or Supabase Storage?

The `StorageProvider` interface (`upload`, `delete`, `getPublicUrl`) is designed for additional backends. Vercel Blob is implemented today; S3/R2/Supabase are documented as future options.

Adding a provider means implementing the interface, registering it in `storage-provider-factory.ts`, and documenting env vars. No schema change is expected.

See [STORAGE_STRATEGY.md](STORAGE_STRATEGY.md).

---

## How do I create an admin user?

1. Set `ADMIN_EMAIL` in `.env.local`.
2. Register at `/register` with that email.
3. Sign in and open `/admin`.

Only that email can publish. See [CREATE_A_BLOG.md](CREATE_A_BLOG.md).

---

## How do transactional emails work?

PostForge wires `@tgoliveira/secure-auth` to an app-provided email provider.

- **Local dev:** `EMAIL_PROVIDER=console` logs verification and password-reset emails to the server console.
- **Production:** `EMAIL_PROVIDER=resend` sends real email through your own Resend account and verified domain.

Each blog owner configures their own Resend API key, sender domain, DNS records, and Vercel env vars. PostForge does not ship a shared email account.

See [EMAIL_PROVIDERS.md](EMAIL_PROVIDERS.md).

---

## Can multiple users write posts?

**MVP:** one publishing admin (`ADMIN_EMAIL`). Other users may register and sign in but get **403** on `/admin`.

Multi-author RBAC is on the roadmap — not in MVP.

---

## Can I customize the public design?

Yes. Your blog repo is yours. Public UI lives under:

- `src/app/(public)/`
- `src/components/public/`
- `src/app/globals.css`

See [UI_UX_SKILL.md](UI_UX_SKILL.md) for public editorial patterns.

---

## Can I remove “Powered by PostForge”?

Yes. The attribution is in `src/components/public/site-footer.tsx` in **your** repo. MIT license allows modification.

---

## How do I update `@tgoliveira/secure-auth`?

```bash
npm install @tgoliveira/secure-auth@0.5.0
npm run db:migrate
npm test && npm run build
```

From **0.5.0**, production deployments must use `AUTH_RATE_LIMIT_STORE=postgres` (enforced when `NODE_ENV=production`). Behind a reverse proxy, set `AUTH_TRUST_FORWARDED_HEADERS=true` so rate limits use the real client IP. `/login/2fa` should pass `initialUsernameEmail` via `getLoginTwoFactorInitialUsernameEmail` for password-manager OTP auto-submit.

From **0.4.x**, secure-auth adds user roles/status, invite codes, API keys, login-attempt counters, and admin config override tables. PostForge ships migration `drizzle/0005_*.sql` — run `npm run db:migrate` after upgrading.

From **0.1.20-internal**, signed-in users are redirected away from guest auth pages (`/login`, `/register`, `/forgot-password`) to `AUTH_AUTHENTICATED_REDIRECT_PATH` (default: `/admin`). PostForge maps this in `buildSecureAuthConfigFromEnv()` and uses `createSecureAuthMiddleware` for defense in depth.

From **0.1.21-internal**, package API handlers enforce their own auth tiers (passkey management, email verification for account APIs, same-origin protection). PostForge delegates all auth/account routes to `secureAuth.routes.*` and maps the new env vars in `buildSecureAuthConfigFromEnv()`. Ensure `APP_BASE_URL` and `NEXTAUTH_URL` match your deployed origin.

Auth is versioned separately from your blog template merges.

---

## How do I update PostForge itself?

Your template copy does not auto-update. Merge from upstream or cherry-pick changes.

See [UPGRADING_FROM_POSTFORGE.md](UPGRADING_FROM_POSTFORGE.md).

---

## Is PostForge an npm package?

**No.** PostForge is a full application distributed as a GitHub template.

`@tgoliveira/secure-auth` is the reusable npm package for auth.

---

## What license is PostForge?

MIT — see [LICENSE](../LICENSE). You can use it for personal or commercial blogs.

---

## How do I import posts from GitHub Pages / Jekyll?

```bash
npm run import:github-pages -- --help
```

See [GITHUB_PAGES_MIGRATION.md](GITHUB_PAGES_MIGRATION.md).

---

## Can I import a single post from a URL?

Yes. Open **Admin → Import → Import from URL**, paste the URL of a post you own or have permission to reuse, and click **Import as draft**.

PostForge extracts the title, subtitle, slug, Markdown content, and main image, then creates a **draft** for review. Only the main image is uploaded as a PostForge asset by default; other inline images may stay remote.

See [GITHUB_PAGES_MIGRATION.md](GITHUB_PAGES_MIGRATION.md#single-post-url-import).

---

## Why does `db:generate` say “nothing to migrate”?

That is normal when the schema has not changed. Use `db:migrate` to **apply** existing migrations.

Run `db:generate` only after **you** edit Drizzle schema files.

---

## More help

- [CREATE_A_BLOG.md](CREATE_A_BLOG.md) — setup
- [FIRST_POST.md](FIRST_POST.md) — publishing
- [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) — configuration
- [ARCHITECTURE.md](ARCHITECTURE.md) — technical overview
