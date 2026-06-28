import { Router } from "express";
import { registerUser, loginUser, getUserProfile, updateUserProfile } from "../services/auth.service.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { registerSchema, loginSchema, updateProfileSchema } from "../schemas/auth.schema.js";

const router = Router();

router.post("/register", validateBody(registerSchema), async (req, res, next) => {
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

router.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const result = await loginUser(req.validatedBody);
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

router.get("/me", authMiddleware, async (req, res, next) => {
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

router.put("/me", authMiddleware, validateBody(updateProfileSchema), async (req, res, next) => {
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

export default router;
