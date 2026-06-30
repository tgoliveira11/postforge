import { describe, expect, it } from "vitest";
import { POSTFORGE_REPO_URL } from "@/modules/public/postforge-meta";

describe("postforge meta", () => {
  it("exports the canonical repository URL", () => {
    expect(POSTFORGE_REPO_URL).toBe("https://github.com/tgoliveira11/postforge");
  });
});
