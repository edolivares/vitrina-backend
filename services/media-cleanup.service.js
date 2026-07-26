import { prisma } from "../lib/database.js";
import { config } from "../lib/config.js";
import { storageService } from "./storage.service.js";

const HOURS_TO_MILLISECONDS = 60 * 60 * 1000;

export const buildOrphanMediaWhere = (cutoff) => ({
  createdAt: { lt: cutoff },
  OR: [
    { context: "POST", posts: { none: {} } },
    { context: "AVATAR", usersAvatar: { none: {} } },
  ],
});

export const cleanupOrphanMedia = async ({ now = new Date(), logger = console } = {}) => {
  const cutoff = new Date(
    now.getTime() - config.mediaCleanup.orphanMinAgeHours * HOURS_TO_MILLISECONDS
  );
  const orphanWhere = buildOrphanMediaWhere(cutoff);

  const candidates = await prisma.media.findMany({
    where: orphanWhere,
    orderBy: { createdAt: "asc" },
    take: config.mediaCleanup.batchSize,
    select: {
      id: true,
      path: true,
      context: true,
      createdAt: true,
    },
  });

  const result = {
    cutoff: cutoff.toISOString(),
    scanned: candidates.length,
    deleted: 0,
    skipped: 0,
    failed: 0,
  };

  for (const candidate of candidates) {
    if (!candidate.path) {
      result.skipped += 1;
      continue;
    }

    const currentOrphan = await prisma.media.findFirst({
      where: {
        id: candidate.id,
        ...orphanWhere,
      },
      select: {
        id: true,
        path: true,
      },
    });

    if (!currentOrphan?.path || currentOrphan.path !== candidate.path) {
      result.skipped += 1;
      continue;
    }

    try {
      await storageService.deleteFiles([currentOrphan.path]);

      const deletedRecord = await prisma.media.deleteMany({
        where: {
          id: currentOrphan.id,
          path: currentOrphan.path,
          ...orphanWhere,
        },
      });

      if (deletedRecord.count === 1) {
        result.deleted += 1;
      } else {
        result.failed += 1;
        logger.error(
          "El archivo se elimino, pero el registro multimedia cambio durante la limpieza",
          {
            mediaId: currentOrphan.id,
          }
        );
      }
    } catch (error) {
      result.failed += 1;
      logger.error("No se pudo eliminar un archivo multimedia huerfano", {
        mediaId: currentOrphan.id,
        error: error.message,
      });
    }
  }

  return result;
};
