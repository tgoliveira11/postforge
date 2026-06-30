import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  insertMock,
  selectMock,
  deleteMock,
  fromMock,
  whereMock,
  limitMock,
  orderByMock,
  valuesMock,
  returningMock,
} = vi.hoisted(() => {
  const returningMock = vi.fn();
  const valuesMock = vi.fn();
  const insertMock = vi.fn();
  const deleteMock = vi.fn();
  const orderByMock = vi.fn();
  const limitMock = vi.fn();
  const whereMock = vi.fn();
  const fromMock = vi.fn();
  const selectMock = vi.fn();

  return {
    insertMock,
    selectMock,
    deleteMock,
    fromMock,
    whereMock,
    limitMock,
    orderByMock,
    valuesMock,
    returningMock,
  };
});

vi.mock("@/db/get-db", () => ({
  db: {
    insert: insertMock,
    select: selectMock,
    delete: deleteMock,
  },
}));

import {
  deleteRedirectById,
  findRedirectBySourcePath,
  insertRedirect,
  listRedirects,
} from "./redirects.repository";

const redirect = {
  id: "redirect-1",
  sourcePath: "/old",
  targetPath: "/new",
  statusCode: 301,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("redirects repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    returningMock.mockResolvedValue([redirect]);
    valuesMock.mockReturnValue({ returning: returningMock });
    insertMock.mockReturnValue({ values: valuesMock });

    limitMock.mockResolvedValue([]);
    whereMock.mockReturnValue({ limit: limitMock });
    orderByMock.mockResolvedValue([]);
    fromMock.mockReturnValue({ where: whereMock, orderBy: orderByMock });
    selectMock.mockReturnValue({ from: fromMock });

    deleteMock.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: redirect.id }]),
      }),
    });
  });

  it("insertRedirect returns the inserted row", async () => {
    await expect(
      insertRedirect({ sourcePath: "/old", targetPath: "/new", statusCode: 301 })
    ).resolves.toEqual(redirect);
    expect(valuesMock).toHaveBeenCalledWith({
      sourcePath: "/old",
      targetPath: "/new",
      statusCode: 301,
    });
  });

  it("findRedirectBySourcePath returns the first matching row", async () => {
    limitMock.mockResolvedValueOnce([redirect]);

    await expect(findRedirectBySourcePath("/old")).resolves.toEqual(redirect);
    expect(limitMock).toHaveBeenCalledWith(1);
  });

  it("listRedirects orders redirects by source path", async () => {
    orderByMock.mockResolvedValueOnce([redirect]);

    await expect(listRedirects()).resolves.toEqual([redirect]);
    expect(orderByMock).toHaveBeenCalled();
  });

  it("deleteRedirectById returns true when a row is deleted", async () => {
    await expect(deleteRedirectById("redirect-1")).resolves.toBe(true);
  });

  it("deleteRedirectById returns false when no row is deleted", async () => {
    deleteMock.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });

    await expect(deleteRedirectById("missing")).resolves.toBe(false);
  });
});
