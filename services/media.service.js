import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "../lib/database.js";
import { config } from "../lib/config.js";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAX_POST_IMAGES = 5;

export const uploadImage = async ({ fileBuffer, userId, context }) => {
  // Asegurar que la carpeta uploads exista
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const metadata = await sharp(fileBuffer).metadata();
  const originalWidth = metadata.width || 1200;
  const originalHeight = metadata.height || 900;

  // Optimizar con sharp
  const optimizedBuffer = await sharp(fileBuffer)
    .resize(1200, null, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // Generar placeholder Base64
  const placeholderBuffer = await sharp(fileBuffer)
    .resize(20, 20, { fit: "inside" })
    .webp({ quality: 20 })
    .toBuffer();

  const placeholderBase64 = `data:image/webp;base64,${placeholderBuffer.toString("base64")}`;

  // Nombre de archivo aleatorio
  const fileId = crypto.randomUUID();
  const filename = `${fileId}.webp`;
  const filePath = path.join(UPLOADS_DIR, filename);

  // Escribir a disco
  await fs.writeFile(filePath, optimizedBuffer);

  // Guardar en base de datos
  const port = config.server.port || 4000;
  const fileUrl = `http://localhost:${port}/uploads/${filename}`;

  const media = await prisma.media.create({
    data: {
      id: fileId,
      userId,
      url: fileUrl,
      context,
      placeholder: placeholderBase64,
      width: originalWidth,
      height: originalHeight,
      size: optimizedBuffer.length,
      mimeType: "image/webp",
    },
  });

  return media;
};

export const linkMediaToPost = async ({ postId, mediaId, sortOrder = 0, userId }) => {
  // Validar pertenencia del post
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.deletedAt !== null) {
    const err = new Error("Publicación no encontrada");
    err.statusCode = 404;
    throw err;
  }

  if (post.userId !== userId) {
    const err = new Error("No estás autorizado para modificar este post");
    err.statusCode = 403;
    throw err;
  }

  // Validar pertenencia del media
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
  });

  if (!media) {
    const err = new Error("Archivo multimedia no encontrado");
    err.statusCode = 404;
    throw err;
  }

  if (media.userId !== userId) {
    const err = new Error("No estás autorizado para usar este archivo multimedia");
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

  // Vincular
  const association = await prisma.postMedia.upsert({
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

  return association;
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
    const err = new Error("No estás autorizado para eliminar este archivo multimedia");
    err.statusCode = 403;
    throw err;
  }

  // Borrar de base de datos
  await prisma.media.delete({
    where: { id: mediaId },
  });

  // Borrar de disco físico
  const filename = path.basename(media.url);
  const filePath = path.join(UPLOADS_DIR, filename);

  try {
    await fs.unlink(filePath);
  } catch (unlinkErr) {
    // Si no se encuentra el archivo, ignorar
    console.error(`Error al borrar archivo físico: ${unlinkErr.message}`);
  }

  return { message: "Archivo y registro eliminados correctamente" };
};
