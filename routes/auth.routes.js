import { Router } from "express";
import {
  getUserProfile,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateUserProfile,
  uploadUserAvatar,
} from "../services/auth.service.js";
import { config } from "../lib/config.js";
import { parseMultipart } from "../lib/multipart.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { registerSchema, loginSchema, updateProfileSchema } from "../schemas/auth.schema.js";

const router = Router();

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: config.cookies.secure,
  sameSite: config.cookies.sameSite,
  path: "/api/auth",
  maxAge: config.jwt.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(config.jwt.refreshCookieName, refreshToken, refreshTokenCookieOptions);
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(config.jwt.refreshCookieName, {
    ...refreshTokenCookieOptions,
    maxAge: undefined,
  });
};

router.post("/register", validateBody(registerSchema), async (req, res, _next) => {
  try {
    const newUser = await registerUser(req.validatedBody);
    res.status(201).json({
      status: "success",
      message: "Usuario registrado exitosamente",
      data: newUser,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
});

router.post("/login", validateBody(loginSchema), async (req, res, _next) => {
  try {
    const result = await loginUser(req.validatedBody);
    setRefreshTokenCookie(res, result.refreshToken);
    res.status(200).json({
      status: "success",
      token: result.token,
      data: result.user,
    });
  } catch (error) {
    res.status(401).json({
      status: "error",
      message: error.message,
    });
  }
});

router.post("/refresh", async (req, res, _next) => {
  try {
    const result = await refreshAccessToken(req.cookies?.[config.jwt.refreshCookieName]);
    res.status(200).json({
      status: "success",
      token: result.token,
      data: result.user,
    });
  } catch (error) {
    res.status(error.statusCode || 401).json({
      status: "error",
      message: error.message,
    });
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    await logoutUser(req.cookies?.[config.jwt.refreshCookieName]);
    clearRefreshTokenCookie(res);
    res.status(200).json({
      status: "success",
      message: "Sesion cerrada correctamente",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authMiddleware, async (req, res, _next) => {
  try {
    const profile = await getUserProfile(req.user.id);
    res.status(200).json({
      status: "success",
      data: profile,
    });
  } catch (error) {
    res.status(404).json({
      status: "error",
      message: error.message,
    });
  }
});

router.put("/me", authMiddleware, validateBody(updateProfileSchema), async (req, res, _next) => {
  try {
    const updated = await updateUserProfile(req.user.id, req.validatedBody);
    res.status(200).json({
      status: "success",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
});

router.post("/me/avatar", authMiddleware, async (req, res, _next) => {
  try {
    const parsed = await parseMultipart(req, { maxBytes: config.media.avatarMaxFileSizeBytes });
    const file = parsed.files.file;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "No se proporciono ningun archivo de imagen en el campo 'file'",
      });
    }

    const updated = await uploadUserAvatar(req.user.id, file.buffer, file.mimeType);

    res.status(201).json({
      status: "success",
      message: "Avatar actualizado correctamente",
      data: updated,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      status: "error",
      message: error.message,
    });
  }
});

export default router;
