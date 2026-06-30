import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock, forbiddenMock, getServerSessionMock, getServicesMock } = vi.hoisted(
  () => ({
    redirectMock: vi.fn(),
    forbiddenMock: vi.fn(),
    getServerSessionMock: vi.fn(),
    getServicesMock: vi.fn(),
  })
);

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  forbidden: forbiddenMock,
}));

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/auth/secure-auth", () => ({
  secureAuth: {
    getServices: getServicesMock,
  },
}));

import { ForbiddenError } from "@/lib/errors";
import {
  isAdminEmail,
  requireAdminApiSession,
  requireAdminSession,
} from "@/modules/admin/authorization";

describe("admin authorization", () => {
  const original = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@postforge.test";
    vi.clearAllMocks();
    getServicesMock.mockResolvedValue({
      getAuthOptions: vi.fn(() => ({})),
    });
    redirectMock.mockImplementation((url: string) => {
      throw new Error(`redirect:${url}`);
    });
    forbiddenMock.mockImplementation(() => {
      throw new Error("forbidden");
    });
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = original;
  });

  describe("isAdminEmail", () => {
    it("matches configured admin email case-insensitively", () => {
      expect(isAdminEmail("admin@postforge.test")).toBe(true);
      expect(isAdminEmail("Admin@PostForge.Test")).toBe(true);
    });

    it("rejects non-admin emails", () => {
      expect(isAdminEmail("other@postforge.test")).toBe(false);
      expect(isAdminEmail(null)).toBe(false);
      expect(isAdminEmail(undefined)).toBe(false);
    });

    it("rejects all emails when ADMIN_EMAIL is unset", () => {
      delete process.env.ADMIN_EMAIL;
      expect(isAdminEmail("admin@postforge.test")).toBe(false);
    });
  });

  describe("requireAdminSession", () => {
    it("redirects to login when session is missing", async () => {
      getServerSessionMock.mockResolvedValue(null);

      await expect(requireAdminSession()).rejects.toThrow(/redirect:\/login\?callbackUrl=\/admin/);
      expect(redirectMock).toHaveBeenCalledWith("/login?callbackUrl=/admin");
    });

    it("redirects to login when session user has no id", async () => {
      getServerSessionMock.mockResolvedValue({ user: { email: "admin@postforge.test" } });

      await expect(requireAdminSession()).rejects.toThrow(/redirect:/);
      expect(redirectMock).toHaveBeenCalledWith("/login?callbackUrl=/admin");
    });

    it("calls forbidden when session email is not admin", async () => {
      getServerSessionMock.mockResolvedValue({
        user: { id: "u1", email: "not-admin@postforge.test" },
      });

      await expect(requireAdminSession()).rejects.toThrow(/forbidden/);
      expect(forbiddenMock).toHaveBeenCalled();
    });

    it("returns normalized admin user for admin email", async () => {
      getServerSessionMock.mockResolvedValue({
        user: { id: "u1", email: "admin@postforge.test" },
      });

      const result = await requireAdminSession();

      expect(getServicesMock).toHaveBeenCalled();
      expect(result.user).toEqual({ id: "u1", email: "admin@postforge.test" });
    });
  });

  describe("requireAdminApiSession", () => {
    it("throws ForbiddenError when session is missing", async () => {
      getServerSessionMock.mockResolvedValue(null);

      await expect(requireAdminApiSession()).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("throws ForbiddenError when email is not admin", async () => {
      getServerSessionMock.mockResolvedValue({
        user: { id: "u1", email: "not-admin@postforge.test" },
      });

      await expect(requireAdminApiSession()).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("returns admin user for valid admin session", async () => {
      getServerSessionMock.mockResolvedValue({
        user: { id: "u1", email: "admin@postforge.test" },
      });

      const result = await requireAdminApiSession();

      expect(result.user).toEqual({ id: "u1", email: "admin@postforge.test" });
    });
  });
});
