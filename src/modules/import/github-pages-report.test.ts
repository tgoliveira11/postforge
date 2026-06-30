import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  addReportEntry,
  createEmptyImportReport,
  finalizeImportReport,
  formatImportReportSummary,
  writeImportReportFile,
} from "./github-pages-report";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("github-pages report", () => {
  it("creates an empty import report with defaults", () => {
    const report = createEmptyImportReport("dry-run");

    expect(report.mode).toBe("dry-run");
    expect(report.totalFilesScanned).toBe(0);
    expect(report.filesImported).toBe(0);
    expect(report.filesSkipped).toBe(0);
    expect(report.entries).toEqual([]);
    expect(report.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(report.finishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("finalizes imported and skipped counts from entries", () => {
    const report = createEmptyImportReport("import");
    addReportEntry(report, {
      sourceFile: "a.md",
      status: "imported",
      slug: "a",
    });
    addReportEntry(report, {
      sourceFile: "b.md",
      status: "skipped",
      message: "Slug conflict",
    });
    addReportEntry(report, {
      sourceFile: "c.md",
      status: "planned",
    });

    const finalized = finalizeImportReport(report);
    expect(finalized.filesImported).toBe(1);
    expect(finalized.filesSkipped).toBe(1);
    expect(finalized.finishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("formats a summary with conflicts, validation errors, and warnings", () => {
    const report = createEmptyImportReport("import");
    report.totalFilesScanned = 3;
    report.postsCreated = 1;
    report.slugConflicts.push({
      file: "dup.md",
      slug: "dup",
      reason: "Post slug already exists",
    });
    report.validationErrors.push({
      file: "bad.md",
      error: "Invalid slug derived",
    });
    report.warnings.push("bad.md: missing image");

    const summary = formatImportReportSummary(report);

    expect(summary).toContain("GitHub Pages import (import)");
    expect(summary).toContain("Files scanned: 3");
    expect(summary).toContain("Slug conflicts:");
    expect(summary).toContain("dup.md: dup (Post slug already exists)");
    expect(summary).toContain("Validation errors:");
    expect(summary).toContain("bad.md: Invalid slug derived");
    expect(summary).toContain("Warnings:");
    expect(summary).toContain("bad.md: missing image");
  });

  it("writes a JSON report file to disk", async () => {
    const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), "postforge-report-"));
    tempDirs.push(reportDir);

    const report = createEmptyImportReport("dry-run");
    report.totalFilesScanned = 1;
    finalizeImportReport(report);

    const reportPath = await writeImportReportFile(reportDir, report);

    expect(reportPath.startsWith(reportDir)).toBe(true);
    expect(reportPath).toMatch(/github-pages-import-.*\.json$/);
    const written = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    expect(written.mode).toBe("dry-run");
    expect(written.totalFilesScanned).toBe(1);
  });
});
