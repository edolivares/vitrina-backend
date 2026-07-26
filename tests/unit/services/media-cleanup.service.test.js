import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    media: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  storageService: {
    deleteFiles: vi.fn(),
  },
}));

vi.mock("../../../lib/database.js", () => ({
  prisma: mocks.prisma,
}));

vi.mock("../../../lib/config.js", () => ({
  config: {
    mediaCleanup: {
      orphanMinAgeHours: 2,
      batchSize: 100,
    },
  },
}));

vi.mock("../../../services/storage.service.js", () => ({
  storageService: mocks.storageService,
}));

import { cleanupOrphanMedia } from "../../../services/media-cleanup.service.js";

describe("Limpieza de archivos multimedia huerfanos", () => {
  const now = new Date("2026-07-25T12:00:00.000Z");
  const candidates = [
    {
      id: "10000000-0000-4000-8000-000000000001",
      path: "posts/unassigned/user/post.webp",
      context: "POST",
      createdAt: new Date("2026-07-25T09:00:00.000Z"),
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      path: "avatars/user/avatar.webp",
      context: "AVATAR",
      createdAt: new Date("2026-07-25T08:00:00.000Z"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.media.findMany.mockResolvedValue(candidates);
    mocks.prisma.media.findFirst.mockImplementation(({ where }) =>
      Promise.resolve(candidates.find((candidate) => candidate.id === where.id))
    );
    mocks.prisma.media.deleteMany.mockResolvedValue({ count: 1 });
    mocks.storageService.deleteFiles.mockResolvedValue();
  });

  it("elimina del storage y despues de la base de datos los registros aun huerfanos", async () => {
    const result = await cleanupOrphanMedia({ now });

    expect(mocks.prisma.media.findMany).toHaveBeenCalledWith({
      where: {
        createdAt: { lt: new Date("2026-07-25T10:00:00.000Z") },
        OR: [
          { context: "POST", posts: { none: {} } },
          { context: "AVATAR", usersAvatar: { none: {} } },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        path: true,
        context: true,
        createdAt: true,
      },
    });
    expect(mocks.storageService.deleteFiles).toHaveBeenCalledTimes(2);
    expect(mocks.prisma.media.deleteMany).toHaveBeenCalledTimes(2);
    expect(mocks.storageService.deleteFiles.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.prisma.media.deleteMany.mock.invocationCallOrder[0]
    );
    expect(result).toEqual({
      cutoff: "2026-07-25T10:00:00.000Z",
      scanned: 2,
      deleted: 2,
      skipped: 0,
      failed: 0,
    });
  });

  it("omite un candidato que fue vinculado antes de eliminarlo", async () => {
    mocks.prisma.media.findMany.mockResolvedValue([candidates[0]]);
    mocks.prisma.media.findFirst.mockResolvedValue(null);

    const result = await cleanupOrphanMedia({ now });

    expect(mocks.storageService.deleteFiles).not.toHaveBeenCalled();
    expect(mocks.prisma.media.deleteMany).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
  });

  it("omite registros sin path porque no puede borrar el archivo de forma segura", async () => {
    mocks.prisma.media.findMany.mockResolvedValue([{ ...candidates[0], path: null }]);

    const result = await cleanupOrphanMedia({ now });

    expect(mocks.prisma.media.findFirst).not.toHaveBeenCalled();
    expect(mocks.storageService.deleteFiles).not.toHaveBeenCalled();
    expect(mocks.prisma.media.deleteMany).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
  });

  it("conserva el registro si falla la eliminacion en storage", async () => {
    mocks.prisma.media.findMany.mockResolvedValue([candidates[0]]);
    mocks.storageService.deleteFiles.mockRejectedValue(new Error("storage unavailable"));
    const logger = { error: vi.fn() };

    const result = await cleanupOrphanMedia({ now, logger });

    expect(mocks.prisma.media.deleteMany).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "No se pudo eliminar un archivo multimedia huerfano",
      expect.objectContaining({ mediaId: candidates[0].id })
    );
    expect(result.failed).toBe(1);
    expect(result.deleted).toBe(0);
  });
});
