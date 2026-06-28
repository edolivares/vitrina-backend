import { prisma } from "../lib/database.js";

export const savePost = async (userId, postId) => {
  // Validar que el post exista y no esté eliminado
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.deletedAt !== null) {
    const err = new Error("Publicación no encontrada");
    err.statusCode = 404;
    throw err;
  }

  const saved = await prisma.savedPost.upsert({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },
    update: {},
    create: {
      userId,
      postId,
    },
  });

  return saved;
};

export const unsavePost = async (userId, postId) => {
  // Validar existencia de la relación
  const saved = await prisma.savedPost.findUnique({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },
  });

  if (!saved) {
    const err = new Error("La publicación no se encuentra en tus guardados");
    err.statusCode = 404;
    throw err;
  }

  await prisma.savedPost.delete({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },
  });

  return { message: "Eliminado de la lista de guardados" };
};

export const listSavedPosts = async (userId) => {
  const saved = await prisma.savedPost.findMany({
    where: { userId },
    include: {
      post: {
        include: {
          city: true,
          media: {
            where: { sortOrder: 0 },
            include: { media: true },
            take: 1,
          },
        },
      },
    },
  });

  // Filtrar posts que se hayan eliminado (por si acaso)
  return saved
    .filter((s) => s.post.deletedAt === null)
    .map((s) => {
      const post = s.post;
      const coverMedia = post.media[0]?.media;
      return {
        id: post.id,
        title: post.title,
        price: post.price.toString(),
        cityName: post.city.name,
        coverImage: coverMedia
          ? {
              url: coverMedia.url,
              placeholder: coverMedia.placeholder,
            }
          : null,
        createdAt: post.createdAt,
      };
    });
};
