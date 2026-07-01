import sharp from "sharp";
import crypto from "crypto";
import { prisma } from "../lib/database.js";
import { config } from "../lib/config.js";
import { buildPublicStorageUrl, storageService } from "./storage.service.js";

const MAX_POST_IMAGES = 5;
const MAX_IMAGE_WIDTH = 1200;
const WEBP_QUALITY = 80;

const buildMediaPath = ({ context, userId, postId, mediaId }) => {
  if (context === "AVATAR") {
    return `avatars/${userId}/${mediaId}.webp`;
  }

  if (postId) {
    return `posts/${postId}/${mediaId}.webp`;
  }

  return `posts/unassigned/${userId}/${mediaId}.webp`;
};

const getMaxFileSizeBytes = (context) => (
  context === "AVATAR"
    ? config.media.avatarMaxFileSizeBytes
    : config.media.postMaxFileSizeBytes
);

const validateImageFile = ({ fileBuffer, mimeType, context }) => {
  if (!config.media.allowedMimeTypes.includes(mimeType)) {
    const err = new Error("Tipo de archivo no permitido");
    err.statusCode = 415;
    throw err;
  }

  if (fileBuffer.length > getMaxFileSizeBytes(context)) {
    const err = new Error("El archivo supera el tamano maximo permitido");
    err.statusCode = 413;
    throw err;
  }
};

export const uploadImage = async ({ fileBuffer, userId, context, postId, mimeType }) => {
  validateImageFile({ fileBuffer, mimeType, context });

  const metadata = await sharp(fileBuffer).metadata();
  const originalWidth = metadata.width || MAX_IMAGE_WIDTH;
  const originalHeight = metadata.height || 900;

  if (context === "AVATAR" && originalWidth !== originalHeight) {
    const err = new Error("El avatar debe ser una imagen cuadrada");
    err.statusCode = 422;
    throw err;
  }

  const optimizedBuffer = await sharp(fileBuffer)
    .resize(MAX_IMAGE_WIDTH, null, { withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const placeholderBuffer = await sharp(fileBuffer)
    .resize(20, 20, { fit: "inside" })
    .webp({ quality: 20 })
    .toBuffer();

  const mediaId = crypto.randomUUID();
  const storagePath = buildMediaPath({ context, userId, postId, mediaId });
  const placeholderBase64 = `data:image/webp;base64,${placeholderBuffer.toString("base64")}`;

  await storageService.uploadFile(storagePath, optimizedBuffer, "image/webp");

  return prisma.media.create({
    data: {
      id: mediaId,
      userId,
      url: buildPublicStorageUrl(storagePath),
      path: storagePath,
      context,
      placeholder: placeholderBase64,
      width: originalWidth,
      height: originalHeight,
      size: optimizedBuffer.length,
      mimeType: "image/webp",
    },
  });
};

export const linkMediaToPost = async ({ postId, mediaId, sortOrder = 0, userId }) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.deletedAt !== null) {
    const err = new Error("Publicacion no encontrada");
    err.statusCode = 404;
    throw err;
  }

  if (post.userId !== userId) {
    const err = new Error("No estas autorizado para modificar este post");
    err.statusCode = 403;
    throw err;
  }

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
  });

  if (!media) {
    const err = new Error("Archivo multimedia no encontrado");
    err.statusCode = 404;
    throw err;
  }

  if (media.userId !== userId) {
    const err = new Error("No estas autorizado para usar este archivo multimedia");
    err.statusCode = 403;
    throw err;
  }

  if (media.context !== "POST") {
    const err = new Error("Solo se pueden vincular imagenes de publicacion a un post");
    err.statusCode = 400;
    throw err;
  }

  const existingImages = await prisma.postMedia.count({
    where: {
      postId,
      mediaId: {
        not: mediaId,
      },
    },
  });

  if (existingImages >= MAX_POST_IMAGES) {
    const err = new Error(`La publicacion no puede tener mas de ${MAX_POST_IMAGES} imagenes`);
    err.statusCode = 409;
    throw err;
  }

  return prisma.postMedia.upsert({
    where: {
      postId_mediaId: {
        postId,
        mediaId,
      },
    },
    update: {
      sortOrder,
    },
    create: {
      postId,
      mediaId,
      sortOrder,
    },
  });
};

export const deleteMedia = async (mediaId, userId) => {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
  });

  if (!media) {
    const err = new Error("Archivo multimedia no encontrado");
    err.statusCode = 404;
    throw err;
  }

  if (media.userId !== userId) {
    const err = new Error("No estas autorizado para eliminar este archivo multimedia");
    err.statusCode = 403;
    throw err;
  }

  await prisma.media.delete({
    where: { id: mediaId },
  });

  if (media.path) {
    await storageService.deleteFiles([media.path]);
  }

  return { message: "Archivo y registro eliminados correctamente" };
};
