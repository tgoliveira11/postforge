import { describe, expect, it } from "vitest";
import { createRedirectSchema } from "./redirects.validation";

describe("redirects validation", () => {
  it("accepts valid redirect input", () => {
    const parsed = createRedirectSchema.parse({
      sourcePath: "/old-path",
      targetPath: "/new-path",
      statusCode: 302,
    });

    expect(parsed).toEqual({
      sourcePath: "/old-path",
      targetPath: "/new-path",
      statusCode: 302,
    });
  });

  it("defaults statusCode to 301", () => {
    const parsed = createRedirectSchema.parse({
      sourcePath: "/from",
      targetPath: "/to",
    });

    expect(parsed.statusCode).toBe(301);
  });

  it("requires absolute paths starting with /", () => {
    expect(() =>
      createRedirectSchema.parse({ sourcePath: "old", targetPath: "/new", statusCode: 301 })
    ).toThrow(/sourcePath must start with \//);

    expect(() =>
      createRedirectSchema.parse({ sourcePath: "/old", targetPath: "new", statusCode: 301 })
    ).toThrow(/targetPath must start with \//);
  });

  it("rejects status codes outside the redirect range", () => {
    expect(() =>
      createRedirectSchema.parse({ sourcePath: "/old", targetPath: "/new", statusCode: 200 })
    ).toThrow();

    expect(() =>
      createRedirectSchema.parse({ sourcePath: "/old", targetPath: "/new", statusCode: 400 })
    ).toThrow();
  });
});
