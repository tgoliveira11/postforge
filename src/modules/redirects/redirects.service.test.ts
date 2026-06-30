import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findRedirectBySourcePathMock,
  insertRedirectMock,
  listRedirectsMock,
  deleteRedirectByIdMock,
} = vi.hoisted(() => ({
  findRedirectBySourcePathMock: vi.fn(),
  insertRedirectMock: vi.fn(),
  listRedirectsMock: vi.fn(),
  deleteRedirectByIdMock: vi.fn(),
}));

vi.mock("./redirects.repository", () => ({
  findRedirectBySourcePath: findRedirectBySourcePathMock,
  insertRedirect: insertRedirectMock,
  listRedirects: listRedirectsMock,
  deleteRedirectById: deleteRedirectByIdMock,
}));

import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  createRedirect,
  deleteRedirect,
  getRedirectBySourcePath,
  listRedirects,
} from "./redirects.service";

const redirect = {
  id: "redirect-1",
  sourcePath: "/old",
  targetPath: "/new",
  statusCode: 301,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("redirects service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findRedirectBySourcePathMock.mockResolvedValue(undefined);
    insertRedirectMock.mockResolvedValue(redirect);
    listRedirectsMock.mockResolvedValue([redirect]);
    deleteRedirectByIdMock.mockResolvedValue(true);
  });

  it("createRedirect inserts a validated redirect", async () => {
    const created = await createRedirect({
      sourcePath: "/old",
      targetPath: "/new",
      statusCode: 301,
    });

    expect(created).toEqual(redirect);
    expect(insertRedirectMock).toHaveBeenCalledWith({
      sourcePath: "/old",
      targetPath: "/new",
      statusCode: 301,
    });
  });

  it("createRedirect rejects duplicate source paths", async () => {
    findRedirectBySourcePathMock.mockResolvedValue(redirect);

    await expect(
      createRedirect({ sourcePath: "/old", targetPath: "/other", statusCode: 302 })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(insertRedirectMock).not.toHaveBeenCalled();
  });

  it("getRedirectBySourcePath returns a redirect or throws NotFoundError", async () => {
    findRedirectBySourcePathMock.mockResolvedValue(redirect);
    await expect(getRedirectBySourcePath("/old")).resolves.toEqual(redirect);

    findRedirectBySourcePathMock.mockResolvedValue(undefined);
    await expect(getRedirectBySourcePath("/missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("listRedirects delegates to the repository", async () => {
    await expect(listRedirects()).resolves.toEqual([redirect]);
    expect(listRedirectsMock).toHaveBeenCalled();
  });

  it("deleteRedirect removes an existing redirect", async () => {
    await expect(deleteRedirect("redirect-1")).resolves.toBeUndefined();
    expect(deleteRedirectByIdMock).toHaveBeenCalledWith("redirect-1");
  });

  it("deleteRedirect throws when id is missing", async () => {
    deleteRedirectByIdMock.mockResolvedValue(false);

    await expect(deleteRedirect("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
