import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  ASSET_UPLOAD_ERROR_MESSAGE,
  AUTOSAVE_FAILED_MESSAGE,
  mapActionError,
} from "@/lib/action-errors";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

describe("action error constants", () => {
  it("exports stable user-facing messages", () => {
    expect(ASSET_UPLOAD_ERROR_MESSAGE).toContain("Image upload failed");
    expect(AUTOSAVE_FAILED_MESSAGE).toContain("Autosave failed");
  });
});

describe("mapActionError", () => {
  it("returns the first Zod issue message", () => {
    const error = new ZodError([
      { code: "custom", message: "Title is required", path: ["title"] },
    ]);

    expect(mapActionError(error)).toBe("Title is required");
  });

  it("falls back when Zod issues have no message", () => {
    const error = new ZodError([]);

    expect(mapActionError(error)).toBe("Validation failed");
  });

  it("returns AppError messages", () => {
    expect(mapActionError(new NotFoundError("Post not found"))).toBe("Post not found");
    expect(mapActionError(new ValidationError("Invalid slug"))).toBe("Invalid slug");
    expect(mapActionError(new ConflictError("Slug taken"))).toBe("Slug taken");
    expect(mapActionError(new ForbiddenError("No access"))).toBe("No access");
    expect(mapActionError(new AppError("Custom", "CUSTOM", 500))).toBe("Custom");
  });

  it("returns generic Error messages", () => {
    expect(mapActionError(new Error("Network timeout"))).toBe("Network timeout");
  });

  it("returns the provided fallback for unknown values", () => {
    expect(mapActionError(null)).toBe("Something went wrong");
    expect(mapActionError(42, "Unexpected")).toBe("Unexpected");
  });

  it("returns fallback for empty messages", () => {
    expect(mapActionError(new Error(""))).toBe("Something went wrong");
    expect(mapActionError(new AppError("", "EMPTY"), "Fallback")).toBe("Fallback");
  });

  it("redacts sensitive error messages", () => {
    expect(mapActionError(new Error("postgres connection failed"))).toBe(
      "Something went wrong"
    );
    expect(mapActionError(new Error("Invalid password"))).toBe("Something went wrong");
    expect(mapActionError(new Error("Missing secret key"))).toBe("Something went wrong");
    expect(mapActionError(new Error("DATABASE_URL is invalid"))).toBe(
      "Something went wrong"
    );
    expect(mapActionError(new Error("connection refused"))).toBe("Something went wrong");
    expect(mapActionError(new Error("ECONNREFUSED"))).toBe("Something went wrong");
  });
});
