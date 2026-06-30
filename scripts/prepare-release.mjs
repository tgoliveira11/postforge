#!/usr/bin/env node
/**
 * Prepare a PostForge release from CHANGELOG [Unreleased].
 *
 * Usage:
 *   node scripts/prepare-release.mjs [--bump patch|minor|major|X.Y.Z] [--dry-run]
 *
 * Outputs JSON to stdout:
 *   { changed, version, date, recovery, unreleasedEmpty, message }
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const VERSION_FILE = resolve(ROOT, "VERSION");
const CHANGELOG_FILE = resolve(ROOT, "CHANGELOG.md");
const PACKAGE_FILE = resolve(ROOT, "package.json");

function parseArgs(argv) {
  const args = { bump: "patch", dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--bump") {
      args.bump = argv[++i] ?? "patch";
    } else if (arg.startsWith("--bump=")) {
      args.bump = arg.slice("--bump=".length);
    }
  }
  return args;
}

function readVersion() {
  return readFileSync(VERSION_FILE, "utf8").trim();
}

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Invalid semver in VERSION: "${version}"`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    raw: version,
  };
}

function bumpSemver(current, bump) {
  if (/^\d+\.\d+\.\d+$/.test(bump)) {
    const next = bump;
    if (compareSemver(next, current.raw) <= 0) {
      throw new Error(`Requested version ${next} must be greater than current ${current.raw}`);
    }
    return next;
  }

  const { major, minor, patch } = current;
  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
    case "auto":
    case "":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown bump "${bump}". Use patch, minor, major, auto, or X.Y.Z`);
  }
}

function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}

function extractUnreleased(changelog) {
  const match = /^## \[Unreleased\]\s*\n([\s\S]*?)(?=^## \[|\Z)/m.exec(changelog);
  if (!match) {
    throw new Error("CHANGELOG.md must contain a ## [Unreleased] section");
  }
  return match[1].trim();
}

function hasReleaseNotes(unreleasedBody) {
  const withoutComments = unreleasedBody
    .split("\n")
    .filter((line) => !line.trim().startsWith("<!--"))
    .join("\n")
    .trim();
  return withoutComments.length > 0;
}

function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function rollChangelog(changelog, version, date, unreleasedBody) {
  const header = "## [Unreleased]";
  const newSection = `${header}\n\n`;
  const releasedSection = `## [${version}] - ${date}\n\n${unreleasedBody.trim()}\n\n`;
  const linkLine = `[Unreleased]: https://github.com/tgoliveira11/postforge/compare/v${version}...HEAD`;
  const versionLink = `[${version}]: https://github.com/tgoliveira11/postforge/releases/tag/v${version}`;

  let updated = changelog.replace(
    /^## \[Unreleased\]\s*\n[\s\S]*?(?=^## \[|\Z)/m,
    `${newSection}${releasedSection}`
  );

  updated = updated.replace(/^(\[Unreleased\]:.*)$/m, linkLine);
  if (!updated.includes(`[${version}]:`)) {
    updated = updated.trimEnd() + `\n${versionLink}\n`;
  }

  return updated;
}

function syncPackageJson(version, dryRun) {
  const pkg = JSON.parse(readFileSync(PACKAGE_FILE, "utf8"));
  pkg.version = version;
  if (!dryRun) {
    writeFileSync(PACKAGE_FILE, `${JSON.stringify(pkg, null, 2)}\n`);
  }
}

function writeVersion(version, dryRun) {
  if (!dryRun) {
    writeFileSync(VERSION_FILE, `${version}\n`);
  }
}

function main() {
  const args = parseArgs(process.argv);
  const currentVersion = readVersion();
  const current = parseSemver(currentVersion);
  const changelog = readFileSync(CHANGELOG_FILE, "utf8");
  const unreleasedBody = extractUnreleased(changelog);
  const unreleasedEmpty = !hasReleaseNotes(unreleasedBody);
  const date = formatDate();

  if (unreleasedEmpty) {
    const result = {
      changed: false,
      version: currentVersion,
      date,
      recovery: true,
      unreleasedEmpty: true,
      message: `Recovery mode: [Unreleased] is empty. Reusing VERSION ${currentVersion}.`,
    };
    console.log(JSON.stringify(result));
    return;
  }

  if (args.bump !== "patch" && args.bump !== "auto" && args.bump !== "" && unreleasedEmpty) {
    throw new Error(
      `[Unreleased] is empty. Use recovery mode (re-run without expecting a bump) instead of bump=${args.bump}.`
    );
  }

  const nextVersion = bumpSemver(current, args.bump);
  const rolledChangelog = rollChangelog(changelog, nextVersion, date, unreleasedBody);

  if (!args.dryRun) {
    writeVersion(nextVersion, false);
    syncPackageJson(nextVersion, false);
    writeFileSync(CHANGELOG_FILE, rolledChangelog);
  }

  const result = {
    changed: true,
    version: nextVersion,
    date,
    recovery: false,
    unreleasedEmpty: false,
    message: `Prepared release ${nextVersion} from [Unreleased].`,
  };
  console.log(JSON.stringify(result));
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
