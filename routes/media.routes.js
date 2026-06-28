import { Router } from "express";
import { parseMultipart } from "../lib/multipart.js";
import { uploadImage, deleteMedia } from "../services/media.service.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateParams } from "../middlewares/validate.middleware.js";
import { uuidParamSchema } from "../schemas/posts.schema.js";

const router = Router();

// 1. Subir imagen
router.post("/upload", authMiddleware, async (req, res, next) => {
  try {
    const parsed = await parseMultipart(req);
    const file = parsed.files.file;
    const rawContext = parsed.fields.context || "post";
    const context = rawContext.toUpperCase();

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "No se proporcionó ningún archivo de imagen en el campo 'file'",
      });
    }

    if (context !== "AVATAR" && context !== "POST") {
      return res.status(400).json({
        status: "error",
        message: "El parámetro 'context' debe ser 'avatar' o 'post'",
      });
    }

    const media = await uploadImage({
      fileBuffer: file.buffer,
      userId: req.user.id,
      context,
    });

    res.status(201).json({
      status: "success",
      data: {
        id: media.id,
        url: media.url,
        placeholder: media.placeholder,
        width: media.width,
        height: media.height,
        size: media.size,
        mimeType: media.mimeType,
        context: media.context,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 2. Eliminar media
router.delete("/:id", authMiddleware, validateParams(uuidParamSchema), async (req, res, next) => {
  try {
    const mediaId = req.validatedParams.id;
    const result = await deleteMedia(mediaId, req.user.id);
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

export default router;
