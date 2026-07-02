import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bumpSemver,
  compareSemver,
  extractUnreleased,
  formatDate,
  hasReleaseNotes,
  main,
  parseArgs,
  parseSemver,
  rollChangelog,
  syncPackageJson,
  writeVersion,
} from "./prepare-release.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const SCRIPT = resolve(ROOT, "scripts/prepare-release.mjs");
const VERSION_FILE = resolve(ROOT, "VERSION");
const CHANGELOG_FILE = resolve(ROOT, "CHANGELOG.md");
const PACKAGE_FILE = resolve(ROOT, "package.json");

function runPrepareRelease(args = []) {
  const stdout = execFileSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return JSON.parse(stdout.trim());
}

describe("prepare-release helpers", () => {
  it("parseArgs handles dry-run and bump flags", () => {
    expect(parseArgs(["node", "script"])).toEqual({ bump: "patch", dryRun: false });
    expect(parseArgs(["node", "script", "--dry-run"])).toEqual({
      bump: "patch",
      dryRun: true,
    });
    expect(parseArgs(["node", "script", "--bump", "minor"])).toEqual({
      bump: "minor",
      dryRun: false,
    });
    expect(parseArgs(["node", "script", "--bump=major"])).toEqual({
      bump: "major",
      dryRun: false,
    });
    expect(parseArgs(["node", "script", "--bump"])).toEqual({
      bump: "patch",
      dryRun: false,
    });
    expect(parseArgs(["node", "script", "--dry-run", "--ignored"])).toEqual({
      bump: "patch",
      dryRun: true,
    });
  });

  it("parseSemver and compareSemver validate ordering", () => {
    expect(parseSemver("1.2.3")).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      raw: "1.2.3",
    });
    expect(compareSemver("1.2.3", "1.2.4")).toBeLessThan(0);
    expect(compareSemver("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
    expect(compareSemver("1.3.0", "1.2.9")).toBeGreaterThan(0);
    expect(() => parseSemver("invalid")).toThrow('Invalid semver in VERSION: "invalid"');
  });

  it("bumpSemver supports named and explicit versions", () => {
    const current = parseSemver("1.2.3");

    expect(bumpSemver(current, "patch")).toBe("1.2.4");
    expect(bumpSemver(current, "minor")).toBe("1.3.0");
    expect(bumpSemver(current, "major")).toBe("2.0.0");
    expect(bumpSemver(current, "1.4.0")).toBe("1.4.0");
    expect(() => bumpSemver(current, "nightly")).toThrow('Unknown bump "nightly"');
    expect(() => bumpSemver(current, "1.0.0")).toThrow("must be greater than current");
  });

  it("extractUnreleased and hasReleaseNotes parse changelog sections", () => {
    const changelog = `# Changelog

## [Unreleased]

### Added
- Feature

## [0.1.0] - 2026-01-01

Initial release.
`;

    expect(extractUnreleased(changelog)).toBe("### Added\n- Feature");
    expect(hasReleaseNotes("### Added\n- Feature")).toBe(true);
    expect(hasReleaseNotes("<!-- pending -->")).toBe(false);
    expect(() => extractUnreleased("# Changelog\n")).toThrow(
      "CHANGELOG.md must contain a ## [Unreleased] section"
    );
  });

  it("rollChangelog moves unreleased notes into a versioned section", () => {
    const changelog = `## [Unreleased]

### Added
- Feature

## [0.1.0] - 2026-01-01

Initial release.

[Unreleased]: https://github.com/example/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/example/releases/tag/v0.1.0
`;

    const rolled = rollChangelog(changelog, "0.2.0", "2026-06-30", "### Added\n- Feature");

    expect(rolled).toContain("## [Unreleased]\n\n");
    expect(rolled).toContain("## [0.2.0] - 2026-06-30");
    expect(rolled).toContain("### Added\n- Feature");
    expect(rolled).toContain(
      "[Unreleased]: https://github.com/tgoliveira11/postforge/compare/v0.2.0...HEAD"
    );
    expect(rolled).toContain(
      "[0.2.0]: https://github.com/tgoliveira11/postforge/releases/tag/v0.2.0"
    );
  });

  it("does not duplicate an existing version link", () => {
    const changelog = `## [Unreleased]

### Added
- Feature

## [0.2.0] - 2026-06-30

### Added
- Previous

[Unreleased]: https://github.com/example/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/example/releases/tag/v0.2.0
`;

    const rolled = rollChangelog(changelog, "0.3.0", "2026-07-01", "### Added\n- Feature");

    expect(rolled).toContain("[0.3.0]:");
    expect(rolled.match(/\[0\.3\.0\]:/g)).toHaveLength(1);
  });

  it("skips adding a version link when one is already present", () => {
    const changelog = `## [Unreleased]

### Added
- Feature

## [0.1.0] - 2026-01-01

Initial release.

[Unreleased]: https://github.com/example/compare/v0.1.0...HEAD
[0.3.0]: https://github.com/example/releases/tag/v0.3.0
[0.1.0]: https://github.com/example/releases/tag/v0.1.0
`;

    const rolled = rollChangelog(changelog, "0.3.0", "2026-07-01", "### Added\n- Feature");

    expect(rolled.match(/\[0\.3\.0\]:/g)).toHaveLength(1);
  });

  it("writeVersion and syncPackageJson honor dry-run", () => {
    const versionBefore = readFileSync(VERSION_FILE, "utf8");
    const packageBefore = readFileSync(PACKAGE_FILE, "utf8");

    writeVersion("9.9.9", true);
    syncPackageJson("9.9.9", true);

    expect(readFileSync(VERSION_FILE, "utf8")).toBe(versionBefore);
    expect(readFileSync(PACKAGE_FILE, "utf8")).toBe(packageBefore);
  });

  it("formatDate returns an ISO date prefix", () => {
    expect(formatDate(new Date("2026-06-30T15:30:00.000Z"))).toBe("2026-06-30");
  });

  it("bumpSemver treats auto and empty bump as patch", () => {
    const current = parseSemver("1.0.0");

    expect(bumpSemver(current, "auto")).toBe("1.0.1");
    expect(bumpSemver(current, "")).toBe("1.0.1");
  });
});

function runMainInProcess(args, { log = true } = {}) {
  const originalArgv = process.argv;
  const logs = [];
  const errors = [];
  const logSpy = log ? vi.spyOn(console, "log").mockImplementation((msg) => logs.push(msg)) : null;
  const errorSpy = vi.spyOn(console, "error").mockImplementation((msg) => errors.push(msg));

  process.argv = ["node", SCRIPT, ...args];

  try {
    main();
  } finally {
    process.argv = originalArgv;
    logSpy?.mockRestore();
    errorSpy.mockRestore();
  }

  return {
    result: logs[0] ? JSON.parse(logs[0]) : null,
    errors,
  };
}

function withReleaseNotes(changelog, unreleasedBody = "### Changed\n- Test release note\n") {
  return changelog.replace(
    /^## \[Unreleased\]\s*\n[\s\S]*?(?=^## \[|\Z)/m,
    `## [Unreleased]\n\n${unreleasedBody}\n\n`
  );
}

describe("prepare-release.mjs", () => {
  let versionBackup;
  let changelogBackup;
  let packageBackup;
  let currentVersion;
  let currentParsed;

  beforeEach(() => {
    versionBackup = readFileSync(VERSION_FILE, "utf8");
    changelogBackup = readFileSync(CHANGELOG_FILE, "utf8");
    packageBackup = readFileSync(PACKAGE_FILE, "utf8");
    currentVersion = versionBackup.trim();
    currentParsed = parseSemver(currentVersion);
  });

  afterEach(() => {
    writeFileSync(VERSION_FILE, versionBackup);
    writeFileSync(CHANGELOG_FILE, changelogBackup);
    writeFileSync(PACKAGE_FILE, packageBackup);
  });

  describe("with release notes in [Unreleased]", () => {
    beforeEach(() => {
      writeFileSync(CHANGELOG_FILE, withReleaseNotes(changelogBackup));
    });

    it("bumps patch version in dry-run without writing files", () => {
      const { result } = runMainInProcess(["--dry-run", "--bump", "patch"]);

      expect(result).toMatchObject({
        changed: true,
        version: bumpSemver(currentParsed, "patch"),
        recovery: false,
        unreleasedEmpty: false,
      });
      expect(readFileSync(VERSION_FILE, "utf8")).toBe(versionBackup);
      expect(readFileSync(CHANGELOG_FILE, "utf8")).toBe(withReleaseNotes(changelogBackup));
    });

    it("supports minor and major dry-run bumps", () => {
      expect(runMainInProcess(["--dry-run", "--bump", "minor"]).result.version).toBe(
        bumpSemver(currentParsed, "minor")
      );
      expect(runMainInProcess(["--dry-run", "--bump", "major"]).result.version).toBe(
        bumpSemver(currentParsed, "major")
      );
      expect(runMainInProcess(["--dry-run", "--bump=auto"]).result.version).toBe(
        bumpSemver(currentParsed, "patch")
      );
    });

    it("accepts an explicit next semver greater than the current version", () => {
      const { result } = runMainInProcess(["--dry-run", "--bump", "0.2.5"]);

      expect(result.version).toBe("0.2.5");
    });

    it("writes release files when dry-run is not set", () => {
      const nextVersion = bumpSemver(currentParsed, "patch");
      const { result } = runMainInProcess(["--bump", "patch"]);

      expect(result.changed).toBe(true);
      expect(readFileSync(VERSION_FILE, "utf8").trim()).toBe(nextVersion);
      expect(JSON.parse(readFileSync(PACKAGE_FILE, "utf8")).version).toBe(nextVersion);
      expect(readFileSync(CHANGELOG_FILE, "utf8")).toContain(`## [${nextVersion}] - `);
    });

    it("rejects unknown bump strategies", () => {
      expect(() => runMainInProcess(["--dry-run", "--bump", "nightly"])).toThrow(
        'Unknown bump "nightly"'
      );
    });

    it("rejects explicit versions that are not greater than the current version", () => {
      expect(() => runMainInProcess(["--dry-run", "--bump", currentVersion])).toThrow(
        "must be greater than current"
      );
    });

    it("keeps the CLI entrypoint working", () => {
      const result = runPrepareRelease(["--dry-run", "--bump", "patch"]);

      expect(result.changed).toBe(true);
    });
  });

  it("enters recovery mode when [Unreleased] has no release notes", () => {
    writeFileSync(
      CHANGELOG_FILE,
      changelogBackup.replace(
        /^## \[Unreleased\]\s*\n[\s\S]*?(?=^## \[)/m,
        "## [Unreleased]\n\n"
      )
    );

    const { result } = runMainInProcess(["--dry-run"]);

    expect(result).toMatchObject({
      changed: false,
      version: currentVersion,
      recovery: true,
      unreleasedEmpty: true,
    });
    expect(result.message).toContain("Recovery mode");
  });

  it("treats HTML comments in [Unreleased] as empty release notes", () => {
    writeFileSync(
      CHANGELOG_FILE,
      changelogBackup.replace(
        /^## \[Unreleased\]\s*\n[\s\S]*?(?=^## \[)/m,
        "## [Unreleased]\n\n<!-- pending notes -->\n\n"
      )
    );

    const { result } = runMainInProcess(["--dry-run"]);

    expect(result.recovery).toBe(true);
    expect(result.unreleasedEmpty).toBe(true);
  });

  it("exits with an error when VERSION is invalid", () => {
    writeFileSync(VERSION_FILE, "not-semver\n");

    expect(() => runPrepareRelease(["--dry-run"])).toThrow();
  });
});
