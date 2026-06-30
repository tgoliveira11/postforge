# Changelog

All notable changes to PostForge are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Vitest coverage thresholds (90% lines, statements, functions, and branches) for `src/lib`, `src/modules`, and `scripts`.
- Database migration `0005` for `@tgoliveira/secure-auth` 0.4.x (user roles, invite codes, API keys, login attempt counters, admin config overrides).

### Changed

- Upgraded `@tgoliveira/secure-auth` from 0.1.x to **0.4.1**.
- `npm run validate` now runs `test:coverage` instead of `test` only.

## [0.1.0] - 2026-06-19

Initial versioned baseline for the PostForge template repository.

### Added

- Markdown blog publishing platform (public site, admin workspace, auth via `@tgoliveira/secure-auth`).
- Shared public post ordering across `/blog`, home recent posts, previous/next navigation, and RSS.
- Manual GitHub Release versioning infrastructure (`VERSION`, `CHANGELOG.md`, release workflow).

[Unreleased]: https://github.com/tgoliveira11/postforge/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/tgoliveira11/postforge/releases/tag/v0.1.0
