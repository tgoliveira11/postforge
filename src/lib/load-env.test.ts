import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const existsSync = vi.fn();
const readFileSync = vi.fn();

vi.mock("fs", () => ({
  existsSync: (...args: unknown[]) => existsSync(...args),
  readFileSync: (...args: unknown[]) => readFileSync(...args),
}));

vi.mock("path", () => ({
  resolve: (...segments: string[]) => segments.join("/"),
}));

describe("loadEnvFiles", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    existsSync.mockReset();
    readFileSync.mockReset();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  async function loadEnv() {
    const { loadEnvFiles } = await import("@/lib/load-env");
    loadEnvFiles();
  }

  it("skips missing env files", async () => {
    existsSync.mockReturnValue(false);

    await loadEnv();

    expect(readFileSync).not.toHaveBeenCalled();
  });

  it("parses key=value pairs and sets process.env", async () => {
    existsSync.mockImplementation((path: string) => path.endsWith(".env"));
    readFileSync.mockReturnValue("FOO=bar\nBAZ=qux");

    await loadEnv();

    expect(process.env.FOO).toBe("bar");
    expect(process.env.BAZ).toBe("qux");
  });

  it("strips surrounding double and single quotes from values", async () => {
    existsSync.mockImplementation((path: string) => path.endsWith(".env"));
    readFileSync.mockReturnValue('QUOTED="hello world"\nSINGLE=\'single\'');

    await loadEnv();

    expect(process.env.QUOTED).toBe("hello world");
    expect(process.env.SINGLE).toBe("single");
  });

  it("skips blank lines, comments, and lines without equals", async () => {
    existsSync.mockImplementation((path: string) => path.endsWith(".env"));
    readFileSync.mockReturnValue(
      "\n# comment\nSKIP_ME\nVALID=yes\n   \n# another comment"
    );

    await loadEnv();

    expect(process.env.VALID).toBe("yes");
    expect(process.env.SKIP_ME).toBeUndefined();
  });

  it("does not overwrite existing environment variables", async () => {
    process.env.EXISTING = "from-shell";
    existsSync.mockImplementation((path: string) => path.endsWith(".env"));
    readFileSync.mockReturnValue("EXISTING=from-file\nNEW=from-file");

    await loadEnv();

    expect(process.env.EXISTING).toBe("from-shell");
    expect(process.env.NEW).toBe("from-file");
  });

  it("loads .env.local before .env", async () => {
    existsSync.mockReturnValue(true);
    readFileSync.mockImplementation((path: string) => {
      if (path.endsWith(".env.local")) return "SHARED=local\nLOCAL_ONLY=1";
      if (path.endsWith(".env")) return "SHARED=env\nENV_ONLY=1";
      return "";
    });

    await loadEnv();

    expect(process.env.SHARED).toBe("local");
    expect(process.env.LOCAL_ONLY).toBe("1");
    expect(process.env.ENV_ONLY).toBe("1");
  });
});
