import { describe, expect, it } from "vitest";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

describe("AppError", () => {
  it("stores message, code, and status code", () => {
    const error = new AppError("Bad request", "BAD_REQUEST", 422);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
    expect(error.message).toBe("Bad request");
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.statusCode).toBe(422);
  });

  it("defaults status code to 400", () => {
    const error = new AppError("Oops", "OOPS");

    expect(error.statusCode).toBe(400);
  });
});

describe("NotFoundError", () => {
  it("uses default message and 404 status", () => {
    const error = new NotFoundError();

    expect(error.name).toBe("NotFoundError");
    expect(error.message).toBe("Resource not found");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.statusCode).toBe(404);
  });

  it("accepts a custom message", () => {
    expect(new NotFoundError("Post missing").message).toBe("Post missing");
  });
});

describe("ValidationError", () => {
  it("uses default message and 400 status", () => {
    const error = new ValidationError();

    expect(error.name).toBe("ValidationError");
    expect(error.message).toBe("Validation failed");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.statusCode).toBe(400);
  });

  it("accepts a custom message", () => {
    expect(new ValidationError("Slug invalid").message).toBe("Slug invalid");
  });
});

describe("ConflictError", () => {
  it("uses default message and 409 status", () => {
    const error = new ConflictError();

    expect(error.name).toBe("ConflictError");
    expect(error.message).toBe("Conflict");
    expect(error.code).toBe("CONFLICT");
    expect(error.statusCode).toBe(409);
  });

  it("accepts a custom message", () => {
    expect(new ConflictError("Duplicate slug").message).toBe("Duplicate slug");
  });
});

describe("ForbiddenError", () => {
  it("uses default message and 403 status", () => {
    const error = new ForbiddenError();

    expect(error.name).toBe("ForbiddenError");
    expect(error.message).toBe("Forbidden");
    expect(error.code).toBe("FORBIDDEN");
    expect(error.statusCode).toBe(403);
  });

  it("accepts a custom message", () => {
    expect(new ForbiddenError("Admin only").message).toBe("Admin only");
  });
});
