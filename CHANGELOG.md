# Changelog

All notable changes to PostForge are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-07-24

### Added

- Optional public GA4 / Google tag integration with App Router page views, public search events, and Web Vitals forwarding.
- AI-readable public discovery maps at `/llms.txt` and `/llms-full.txt`.
- Generic fallback `/opengraph-image` route for social previews.
- `npm run content:validate` for published content, taxonomy, asset, redirect, and internal-link health checks.

### Changed

- Strengthened public metadata helpers with canonical links, RSS/LLM alternates, robots/googlebot directives, Open Graph, Twitter card, article, and JSON-LD defaults.
- `npm run validate` now includes `npm run content:validate`.

### Fixed

- Public header navigation now uses stable horizontal overflow for narrow screens and keeps Search as a normal nav link.

## [0.1.1] - 2026-07-02

### Added

- Vitest coverage thresholds (90% lines, statements, functions, and branches) for `src/lib`, `src/modules`, and `scripts`.
- Database migration `0005` for `@tgoliveira/secure-auth` 0.4.x (user roles, invite codes, API keys, login attempt counters, admin config overrides).

### Changed

- Upgraded `@tgoliveira/secure-auth` from 0.1.x to **0.5.0** (via 0.4.1).
- `npm run validate` now runs `test:coverage` instead of `test` only.
- Consumer env mappings aligned with secure-auth 0.5.0: production postgres rate limiting, `AUTH_TRUST_FORWARDED_HEADERS`, v0.2/v0.3 opt-in flags, GitHub OAuth, CAPTCHA.
- `/login/2fa` passes `initialUsernameEmail` for password-manager 2FA auto-submit (0.5.0).

## [0.1.0] - 2026-06-19

Initial versioned baseline for the PostForge template repository.

### Added

- Markdown blog publishing platform (public site, admin workspace, auth via `@tgoliveira/secure-auth`).
- Shared public post ordering across `/blog`, home recent posts, previous/next navigation, and RSS.
- Manual GitHub Release versioning infrastructure (`VERSION`, `CHANGELOG.md`, release workflow).

[Unreleased]: https://github.com/tgoliveira11/postforge/compare/v0.1.2...HEAD
[0.1.0]: https://github.com/tgoliveira11/postforge/releases/tag/v0.1.0
[0.1.1]: https://github.com/tgoliveira11/postforge/releases/tag/v0.1.1
[0.1.2]: https://github.com/tgoliveira11/postforge/releases/tag/v0.1.2
