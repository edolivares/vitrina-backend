import crypto from "crypto";
import express from "express";
import { config } from "../lib/config.js";
import { cleanupOrphanMedia } from "../services/media-cleanup.service.js";

const router = express.Router();
const CHILE_TIME_ZONE = "America/Santiago";

const secretsMatch = (received, expected) => {
  const receivedBuffer = Buffer.from(received || "");
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
};

export const isChileMidnight = (date = new Date()) => {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: CHILE_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date);

  return hour === "00";
};

const cleanupMediaHandler = async (req, res, next) => {
  const cronSecret = config.mediaCleanup.cronSecret;

  if (!cronSecret) {
    return res.status(503).json({ message: "Limpieza programada no configurada" });
  }

  if (!secretsMatch(req.get("authorization"), `Bearer ${cronSecret}`)) {
    return res.status(401).json({ message: "No autorizado" });
  }

  if (req.params.schedule && !isChileMidnight()) {
    return res.json({
      status: "success",
      data: {
        skipped: true,
        reason: "outside_chile_midnight",
      },
    });
  }

  try {
    const result = await cleanupOrphanMedia();
    return res.json({ status: "success", data: result });
  } catch (error) {
    return next(error);
  }
};

router.get("/cleanup-media", cleanupMediaHandler);
router.get("/cleanup-media/:schedule(summer|winter)", cleanupMediaHandler);

export default router;
