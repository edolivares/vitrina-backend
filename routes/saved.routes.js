import { Router } from "express";
import { savePost, unsavePost, listSavedPosts } from "../services/saved.service.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateBody, validateParams } from "../middlewares/validate.middleware.js";
import { savePostSchema } from "../schemas/saved.schema.js";
import { postIdParamSchema } from "../schemas/posts.schema.js";

const router = Router();

// 1. Guardar publicación en favoritos
router.post("/", authMiddleware, validateBody(savePostSchema), async (req, res, next) => {
  try {
    const { postId } = req.validatedBody;
    await savePost(req.user.id, postId);
    res.status(201).json({
      status: "success",
      message: "Publicación guardada exitosamente en tus favoritos",
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: "error",
        message: error.message,
      });
    }
    next(error);
  }
});

// 2. Eliminar de favoritos
router.delete("/:postId", authMiddleware, validateParams(postIdParamSchema), async (req, res, next) => {
  try {
    const postId = req.validatedParams.postId;
    const result = await unsavePost(req.user.id, postId);
    res.status(200).json({
      status: "success",
      message: result.message,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: "error",
        message: error.message,
      });
    }
    next(error);
  }
});

// 3. Listar favoritos del usuario autenticado
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const list = await listSavedPosts(req.user.id);
    res.status(200).json({
      status: "success",
      data: list,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
