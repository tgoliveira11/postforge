import { describe, expect, it } from "vitest";
import {
  readBooleanEnv,
  readCsvEnv,
  readEnumEnv,
  readEnv,
  readFirstEnv,
  readNumberEnv,
  readOAuthPair,
} from "@/lib/env/parse";

describe("readEnv", () => {
  it("returns undefined for missing or blank values", () => {
    expect(readEnv({}, "MISSING")).toBeUndefined();
    expect(readEnv({ BLANK: "   " }, "BLANK")).toBeUndefined();
  });

  it("returns trimmed values", () => {
    expect(readEnv({ KEY: "  value  " }, "KEY")).toBe("value");
  });
});

describe("readFirstEnv", () => {
  it("returns the first defined key in order", () => {
    const env = { SECOND: "two", FIRST: "one" };

    expect(readFirstEnv(env, ["MISSING", "FIRST", "SECOND"])).toBe("one");
    expect(readFirstEnv(env, ["MISSING", "ALSO_MISSING"])).toBeUndefined();
  });
});

describe("readBooleanEnv", () => {
  it("returns the default when unset", () => {
    expect(readBooleanEnv({}, ["FLAG"], true)).toBe(true);
    expect(readBooleanEnv({}, ["FLAG"], false)).toBe(false);
  });

  it("parses true and false", () => {
    expect(readBooleanEnv({ FLAG: "true" }, ["FLAG"], false)).toBe(true);
    expect(readBooleanEnv({ FLAG: "false" }, ["FLAG"], true)).toBe(false);
  });

  it("throws for invalid boolean values", () => {
    expect(() => readBooleanEnv({ FLAG: "yes" }, ["FLAG"], false)).toThrow(
      'Invalid boolean environment value "yes"'
    );
  });
});

describe("readNumberEnv", () => {
  it("returns the default when unset", () => {
    expect(readNumberEnv({}, ["COUNT"], 10)).toBe(10);
  });

  it("parses finite numbers", () => {
    expect(readNumberEnv({ COUNT: "42" }, ["COUNT"], 10)).toBe(42);
  });

  it("throws for non-numeric values", () => {
    expect(() => readNumberEnv({ COUNT: "abc" }, ["COUNT"], 10)).toThrow(
      'Invalid numeric environment value "abc"'
    );
    expect(() => readNumberEnv({ COUNT: "Infinity" }, ["COUNT"], 10)).toThrow(
      'Invalid numeric environment value "Infinity"'
    );
  });

  it("returns the default when below min or above max", () => {
    expect(readNumberEnv({ COUNT: "2" }, ["COUNT"], 10, { min: 5 })).toBe(10);
    expect(readNumberEnv({ COUNT: "20" }, ["COUNT"], 10, { max: 15 })).toBe(10);
  });

  it("returns parsed values within min and max bounds", () => {
    expect(readNumberEnv({ COUNT: "8" }, ["COUNT"], 10, { min: 5, max: 15 })).toBe(8);
  });
});

describe("readEnumEnv", () => {
  const allowed = ["light", "dark"] as const;

  it("returns the default when unset", () => {
    expect(readEnumEnv({}, ["THEME"], allowed, "light")).toBe("light");
  });

  it("returns allowed values", () => {
    expect(readEnumEnv({ THEME: "dark" }, ["THEME"], allowed, "light")).toBe("dark");
  });

  it("returns the default for disallowed values", () => {
    expect(readEnumEnv({ THEME: "system" }, ["THEME"], allowed, "light")).toBe("light");
  });
});

describe("readOAuthPair", () => {
  it("returns credentials when both client id and secret are set", () => {
    const env = {
      AUTH_GOOGLE_CLIENT_ID: "id",
      AUTH_GOOGLE_CLIENT_SECRET: "secret",
    };

    expect(
      readOAuthPair(
        env,
        ["AUTH_GOOGLE_CLIENT_ID"],
        ["AUTH_GOOGLE_CLIENT_SECRET"]
      )
    ).toEqual({ clientId: "id", clientSecret: "secret" });
  });

  it("returns undefined when only one side of the pair is set", () => {
    expect(
      readOAuthPair(
        { AUTH_GOOGLE_CLIENT_ID: "id" },
        ["AUTH_GOOGLE_CLIENT_ID"],
        ["AUTH_GOOGLE_CLIENT_SECRET"]
      )
    ).toBeUndefined();

    expect(
      readOAuthPair(
        { AUTH_GOOGLE_CLIENT_SECRET: "secret" },
        ["AUTH_GOOGLE_CLIENT_ID"],
        ["AUTH_GOOGLE_CLIENT_SECRET"]
      )
    ).toBeUndefined();
  });
});

describe("readCsvEnv", () => {
  it("returns an empty array when unset", () => {
    expect(readCsvEnv({}, "ORIGINS")).toEqual([]);
    expect(readCsvEnv({ ORIGINS: "   " }, "ORIGINS")).toEqual([]);
  });

  it("splits, trims, and filters empty entries", () => {
    expect(readCsvEnv({ ORIGINS: " https://a.test , ,https://b.test " }, "ORIGINS")).toEqual([
      "https://a.test",
      "https://b.test",
    ]);
  });
});
