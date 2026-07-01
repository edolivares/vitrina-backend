import { Router } from "express";
import jwt from "jsonwebtoken";
import { config } from "../lib/config.js";
import { parseMultipart } from "../lib/multipart.js";
import {
  createDraft,
  updatePost,
  listPublished,
  getDetail,
  deletePost,
  listOwn,
  archivePost,
  reactivatePost,
} from "../services/posts.service.js";
import { linkMediaToPost, uploadImage } from "../services/media.service.js";
import { createOrGetPostChat, listPostChats } from "../services/messages.service.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateBody, validateParams } from "../middlewares/validate.middleware.js";
import { linkMediaSchema } from "../schemas/media.schema.js";
import { updatePostSchema, uuidParamSchema, postIdParamSchema } from "../schemas/posts.schema.js";

const router = Router();

const createDraftHandler = async (req, res, next) => {
  try {
    const draft = await createDraft(req.user.id);
    res.status(201).json({
      status: "success",
      message: "Borrador de publicación inicializado",
      data: {
        id: draft.id,
        userId: draft.userId,
        status: draft.status,
        createdAt: draft.createdAt,
      },
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
};

// 1. Crear publicación nueva en estado borrador
router.post("/", authMiddleware, createDraftHandler);

// Alias compatible para clientes anteriores
router.post("/draft", authMiddleware, createDraftHandler);

// 2. Dashboard propio
router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const posts = await listOwn(req.user.id, {
      status: req.query.status,
      limit: req.query.limit,
      offset: req.query.offset,
    });

    res.status(200).json({
      status: "success",
      data: posts,
    });
  } catch (error) {
    next(error);
  }
});

// 3. Galería pública
router.get("/", async (req, res, next) => {
  try {
    const posts = await listPublished({
      search: req.query.search,
      cityId: req.query.cityId,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      condition: req.query.condition,
      limit: req.query.limit,
      offset: req.query.offset,
    });

    res.status(200).json({
      status: "success",
      data: posts,
    });
  } catch (error) {
    next(error);
  }
});

// 4. Vincular media a post
router.post("/:postId/media", authMiddleware, validateParams(postIdParamSchema), async (req, res, next) => {
  try {
    const postId = req.validatedParams.postId;
    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("multipart/form-data")) {
      const parsed = await parseMultipart(req, { maxBytes: config.media.postMaxFileSizeBytes });
      const file = parsed.files.file;
      const sortOrder = parsed.fields.sortOrder ? Number(parsed.fields.sortOrder) : 0;

      if (!file) {
        return res.status(400).json({
          status: "error",
          message: "No se proporciono ningun archivo de imagen en el campo 'file'",
        });
      }

      const media = await uploadImage({
        fileBuffer: file.buffer,
        userId: req.user.id,
        context: "POST",
        postId,
        mimeType: file.mimeType,
      });

      const association = await linkMediaToPost({
        postId,
        mediaId: media.id,
        sortOrder,
        userId: req.user.id,
      });

      return res.status(201).json({
        status: "success",
        message: "Imagen subida y vinculada correctamente a la publicacion",
        data: {
          id: media.id,
          postId,
          url: media.url,
          placeholder: media.placeholder,
          width: media.width,
          height: media.height,
          size: media.size,
          mimeType: media.mimeType,
          context: media.context,
          sortOrder: association.sortOrder,
        },
      });
    }

    const { mediaId, sortOrder } = linkMediaSchema.parse(req.body);

    await linkMediaToPost({
      postId,
      mediaId,
      sortOrder,
      userId: req.user.id,
    });

    res.status(200).json({
      status: "success",
      message: "Archivo multimedia vinculado correctamente a la publicacion",
    });
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({
        status: "error",
        message: "Error de validacion",
        details: error.errors.map((e) => e.message),
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: "error",
        message: error.message,
      });
    }
    next(error);
  }
});

// 5. Detalle de publicación (Acceso condicional / público)
router.post("/:postId/chats", authMiddleware, validateParams(postIdParamSchema), async (req, res, next) => {
  try {
    const result = await createOrGetPostChat(req.validatedParams.postId, req.user.id);
    res.status(result.created ? 201 : 200).json({
      status: "success",
      data: result.chat,
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

router.get("/:postId/chats", authMiddleware, validateParams(postIdParamSchema), async (req, res, next) => {
  try {
    const chats = await listPostChats(req.validatedParams.postId, req.user.id);
    res.status(200).json({
      status: "success",
      data: chats,
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

router.get("/:id", validateParams(uuidParamSchema), async (req, res, next) => {
  try {
    const postId = req.validatedParams.id;
    let userId = null;

    // Intentar decodificar JWT opcionalmente
    const authHeader = req.header("Authorization");
    if (authHeader) {
      try {
        const token = authHeader.split("Bearer ")[1];
        if (token) {
          const decoded = jwt.verify(token, config.jwt.secret);
          userId = decoded.id;
        }
      } catch (err) {
        // Ignorar error para permitir ver publicaciones públicas
      }
    }

    const postDetail = await getDetail(postId, userId);
    res.status(200).json({
      status: "success",
      data: postDetail,
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

// 6. Guardar y Publicar / Actualizar
router.put("/:id", authMiddleware, validateParams(uuidParamSchema), validateBody(updatePostSchema), async (req, res, next) => {
  try {
    const postId = req.validatedParams.id;
    const updated = await updatePost(postId, req.user.id, req.validatedBody);
    res.status(200).json({
      status: "success",
      data: updated,
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

// 7. Eliminar publicación (Soft Delete)
router.delete("/:id", authMiddleware, validateParams(uuidParamSchema), async (req, res, next) => {
  try {
    const postId = req.validatedParams.id;
    const result = await deletePost(postId, req.user.id);
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

// 8. Archivar publicación
router.patch("/:id/archive", authMiddleware, validateParams(uuidParamSchema), async (req, res, next) => {
  try {
    const postId = req.validatedParams.id;
    const result = await archivePost(postId, req.user.id);
    res.status(200).json({
      status: "success",
      message: "Publicación archivada exitosamente",
      data: result,
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

// 9. Reactivar publicación
router.patch("/:id/reactivate", authMiddleware, validateParams(uuidParamSchema), async (req, res, next) => {
  try {
    const postId = req.validatedParams.id;
    const result = await reactivatePost(postId, req.user.id);
    res.status(200).json({
      status: "success",
      message: "Publicación reactivada exitosamente",
      data: result,
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
