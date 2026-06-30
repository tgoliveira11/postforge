import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  getStoredTheme,
  isTheme,
  persistTheme,
} from "@/lib/theme";

describe("theme persistence", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("validates theme values", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });

  it("persists and restores the selected theme", () => {
    persistTheme("dark");
    expect(store.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(getStoredTheme()).toBe("dark");

    persistTheme("light");
    expect(getStoredTheme()).toBe("light");
  });

  it("returns null for invalid stored values", () => {
    store.set(THEME_STORAGE_KEY, "system");
    expect(getStoredTheme()).toBeNull();
  });

  it("returns null when localStorage read fails", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("storage blocked");
        },
        setItem: vi.fn(),
      },
    });

    expect(getStoredTheme()).toBeNull();
  });

  it("ignores localStorage write failures", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota exceeded");
        },
      },
    });

    expect(() => persistTheme("dark")).not.toThrow();
  });
});

describe("applyTheme", () => {
  let documentElement: {
    setAttribute: ReturnType<typeof vi.fn>;
    style: { colorScheme: string };
  };

  beforeEach(() => {
    documentElement = {
      setAttribute: vi.fn(),
      style: { colorScheme: "" },
    };
    vi.stubGlobal("document", { documentElement });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets data-theme and color-scheme on the document root", () => {
    applyTheme("dark");

    expect(documentElement.setAttribute).toHaveBeenCalledWith("data-theme", "dark");
    expect(documentElement.style.colorScheme).toBe("dark");

    applyTheme("light");

    expect(documentElement.setAttribute).toHaveBeenCalledWith("data-theme", "light");
    expect(documentElement.style.colorScheme).toBe("light");
  });
});

describe("getStoredTheme without window", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null during server-side rendering", () => {
    vi.stubGlobal("window", undefined);
    expect(getStoredTheme()).toBeNull();
  });
});
