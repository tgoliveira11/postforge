import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/db/client", () => ({
  db: {},
}));

vi.mock("@tgoliveira/secure-auth/next", () => ({
  createSecureAuth: vi.fn(() => ({
    getServices: vi.fn(),
    handlers: {},
  })),
}));

vi.mock("@/lib/email/email-provider-factory", () => ({
  createEmailProvider: vi.fn(() => ({ send: vi.fn() })),
}));

vi.mock("@/lib/env/secure-auth-from-env", () => ({
  buildSecureAuthConfigFromEnv: vi.fn(() => ({
    app: { name: "PostForge" },
    ui: { paths: {} },
  })),
}));

vi.mock("@/lib/env", () => ({
  readEmailFrom: vi.fn(() => "PostForge <noreply@test.local>"),
}));

import { createSecureAuth } from "@tgoliveira/secure-auth/next";
import { secureAuth } from "@/lib/auth/secure-auth";

describe("secure-auth bootstrap", () => {
  it("creates secure auth with PostForge UI paths", () => {
    expect(createSecureAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        email: expect.objectContaining({
          from: "PostForge <noreply@test.local>",
        }),
        ui: expect.objectContaining({
          messages: expect.objectContaining({
            loginTitle: "Sign in to PostForge",
          }),
        }),
      })
    );
    expect(secureAuth).toBeDefined();
  });
});
