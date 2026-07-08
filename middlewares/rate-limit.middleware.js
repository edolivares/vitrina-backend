import { rateLimit } from "express-rate-limit";
import { config } from "../lib/config.js";

const toWindowMs = (minutes) => minutes * 60 * 1000;

const createJsonRateLimiter = ({ windowMinutes, max, message, skip }) =>
  rateLimit({
    windowMs: toWindowMs(windowMinutes),
    limit: max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: (req, res) => {
      // Omitir límite de solicitudes únicamente en desarrollo local (no en testing)
      if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
        return true;
      }
      return skip ? skip(req, res) : false;
    },
    message: {
      message,
    },
  });

export const apiRateLimiter = createJsonRateLimiter({
  ...config.rateLimit.public,
  message: "Demasiadas solicitudes. Intenta nuevamente en unos minutos.",
});

export const loginRateLimiter = createJsonRateLimiter({
  ...config.rateLimit.login,
  message: "Demasiados intentos de inicio de sesion. Intenta nuevamente en unos minutos.",
});

export const registerRateLimiter = createJsonRateLimiter({
  ...config.rateLimit.register,
  message: "Demasiados registros desde este origen. Intenta nuevamente mas tarde.",
});

export const refreshRateLimiter = createJsonRateLimiter({
  ...config.rateLimit.refresh,
  message: "Demasiadas renovaciones de sesion. Intenta nuevamente en unos minutos.",
});

export const mediaRateLimiter = createJsonRateLimiter({
  ...config.rateLimit.media,
  message: "Demasiadas cargas de imagenes. Intenta nuevamente en unos minutos.",
});

export const privateWriteRateLimiter = createJsonRateLimiter({
  ...config.rateLimit.privateWrite,
  skip: (req) => {
    const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    const isPostMediaUpload = /^\/[^/]+\/media\/?$/.test(req.path);
    return !isWriteMethod || isPostMediaUpload;
  },
  message: "Demasiadas acciones realizadas. Intenta nuevamente en unos minutos.",
});
