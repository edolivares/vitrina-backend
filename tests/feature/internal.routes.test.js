import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  cleanupOrphanMedia: vi.fn(),
  config: {
    mediaCleanup: {
      cronSecret: "cron-secret",
    },
  },
}));

vi.mock("../../lib/config.js", () => ({
  config: mocks.config,
}));

vi.mock("../../services/media-cleanup.service.js", () => ({
  cleanupOrphanMedia: mocks.cleanupOrphanMedia,
}));

import internalRoutes from "../../routes/internal.routes.js";

const app = express();
app.use("/api/internal", internalRoutes);
app.use((err, _req, res, _next) => {
  res.status(err.statusCode || 500).json({ message: err.message });
});

describe("Rutas internas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.config.mediaCleanup.cronSecret = "cron-secret";
    mocks.cleanupOrphanMedia.mockResolvedValue({
      cutoff: "2026-07-25T10:00:00.000Z",
      scanned: 2,
      deleted: 2,
      skipped: 0,
      failed: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("informa que el cron no esta configurado si falta el secreto", async () => {
    mocks.config.mediaCleanup.cronSecret = undefined;

    const response = await request(app).get("/api/internal/cleanup-media");

    expect(response.statusCode).toBe(503);
    expect(mocks.cleanupOrphanMedia).not.toHaveBeenCalled();
  });

  it("rechaza la ejecucion sin el secreto del cron", async () => {
    const response = await request(app).get("/api/internal/cleanup-media");

    expect(response.statusCode).toBe(401);
    expect(mocks.cleanupOrphanMedia).not.toHaveBeenCalled();
  });

  it("rechaza un secreto incorrecto", async () => {
    const response = await request(app)
      .get("/api/internal/cleanup-media")
      .set("Authorization", "Bearer incorrecto");

    expect(response.statusCode).toBe(401);
    expect(mocks.cleanupOrphanMedia).not.toHaveBeenCalled();
  });

  it("ejecuta la limpieza con la autorizacion enviada por Vercel", async () => {
    const response = await request(app)
      .get("/api/internal/cleanup-media")
      .set("Authorization", "Bearer cron-secret");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      data: {
        cutoff: "2026-07-25T10:00:00.000Z",
        scanned: 2,
        deleted: 2,
        skipped: 0,
        failed: 0,
      },
    });
    expect(mocks.cleanupOrphanMedia).toHaveBeenCalledTimes(1);
  });

  it("ejecuta el slot correspondiente a medianoche chilena y omite el otro", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T03:10:00.000Z"));

    const skippedResponse = await request(app)
      .get("/api/internal/cleanup-media/summer")
      .set("Authorization", "Bearer cron-secret");

    expect(skippedResponse.statusCode).toBe(200);
    expect(skippedResponse.body.data).toEqual({
      skipped: true,
      reason: "outside_chile_midnight",
    });
    expect(mocks.cleanupOrphanMedia).not.toHaveBeenCalled();

    vi.setSystemTime(new Date("2026-07-25T04:10:00.000Z"));

    const executedResponse = await request(app)
      .get("/api/internal/cleanup-media/winter")
      .set("Authorization", "Bearer cron-secret");

    expect(executedResponse.statusCode).toBe(200);
    expect(mocks.cleanupOrphanMedia).toHaveBeenCalledTimes(1);
  });
});
