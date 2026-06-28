import { prisma } from "../lib/database.js";

const MAX_ACTIVE_POSTS = 5;
const MAX_DRAFT_POSTS = 5;

export const createDraft = async (userId) => {
  // Límite de 5 borradores activos (status = DRAFT, deletedAt = null)
  const draftCount = await prisma.post.count({
    where: {
      userId,
      status: "DRAFT",
      deletedAt: null,
    },
  });

  if (draftCount >= MAX_DRAFT_POSTS) {
    const err = new Error(`Has alcanzado el límite de ${MAX_DRAFT_POSTS} borradores activos. Debes publicar o eliminar algunos antes de poder crear otro.`);
    err.statusCode = 403;
    throw err;
  }

  const defaultCity = await prisma.city.findFirst();
  if (!defaultCity) {
    throw new Error("No hay comunas/ciudades registradas en la base de datos.");
  }

  const newDraft = await prisma.post.create({
    data: {
      userId,
      cityId: defaultCity.id,
      title: "Sin Título",
      description: "",
      price: 0,
      status: "DRAFT",
      condition: "USED",
    },
  });

  return newDraft;
};

export const updatePost = async (postId, userId, data) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.deletedAt !== null) {
    const err = new Error("Publicación no encontrada");
    err.statusCode = 404;
    throw err;
  }

  if (post.userId !== userId) {
    const err = new Error("No estás autorizado para modificar esta publicación");
    err.statusCode = 403;
    throw err;
  }

  if (data.status === "PUBLISHED" && post.status !== "PUBLISHED") {
    const activeCount = await prisma.post.count({
      where: {
        userId,
        status: "PUBLISHED",
        deletedAt: null,
        id: {
          not: postId,
        },
      },
    });

    if (activeCount >= MAX_ACTIVE_POSTS) {
      const err = new Error(`Has alcanzado el límite de ${MAX_ACTIVE_POSTS} publicaciones activas. Archiva una antes de publicar otra.`);
      err.statusCode = 403;
      throw err;
    }
  }

  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      title: data.title,
      description: data.description,
      price: data.price,
      cityId: data.cityId,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      condition: data.condition,
      status: data.status,
    },
  });

  return updatedPost;
};

export const listPublished = async (filters = {}) => {
  const { search, cityId, minPrice, maxPrice, condition, limit = 20, offset = 0 } = filters;

  const whereClause = {
    deletedAt: null,
    status: "PUBLISHED",
  };

  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (cityId) {
    whereClause.cityId = Number(cityId);
  }

  if (minPrice !== undefined) {
    whereClause.price = { ...whereClause.price, gte: Number(minPrice) };
  }

  if (maxPrice !== undefined) {
    whereClause.price = { ...whereClause.price, lte: Number(maxPrice) };
  }

  if (condition) {
    whereClause.condition = condition;
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    skip: Number(offset),
    take: Number(limit),
    include: {
      city: true,
      media: {
        where: { sortOrder: 0 },
        include: { media: true },
        take: 1,
      },
    },
  });

  return posts.map((post) => {
    const coverMedia = post.media[0]?.media;
    return {
      id: post.id,
      title: post.title,
      price: post.price.toString(),
      condition: post.condition,
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

export const getDetail = async (postId, userId) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      city: {
        include: { region: true },
      },
      user: true,
      media: {
        include: { media: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!post || post.deletedAt !== null) {
    const err = new Error("Publicación no encontrada");
    err.statusCode = 404;
    throw err;
  }

  // Si está en DRAFT o ARCHIVED, sólo el dueño puede consumirla
  if (post.status === "DRAFT" || post.status === "ARCHIVED") {
    if (!userId || post.userId !== userId) {
      const err = new Error("Publicación no encontrada");
      err.statusCode = 404;
      throw err;
    }
  }

  return {
    id: post.id,
    title: post.title,
    description: post.description,
    price: post.price.toString(),
    latitude: post.latitude ? post.latitude.toString() : null,
    longitude: post.longitude ? post.longitude.toString() : null,
    status: post.status,
    condition: post.condition,
    city: {
      name: post.city.name,
      region: post.city.region.name,
    },
    seller: {
      name: post.user.name,
      email: post.user.email,
    },
    gallery: post.media.map((pm) => ({
      url: pm.media.url,
      placeholder: pm.media.placeholder,
      width: pm.media.width,
      height: pm.media.height,
      sortOrder: pm.sortOrder,
    })),
  };
};

export const deletePost = async (postId, userId) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.deletedAt !== null) {
    const err = new Error("Publicación no encontrada");
    err.statusCode = 404;
    throw err;
  }

  if (post.userId !== userId) {
    const err = new Error("No estás autorizado para eliminar esta publicación");
    err.statusCode = 403;
    throw err;
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      deletedAt: new Date(),
    },
  });

  return { message: "Publicación eliminada correctamente" };
};

export const listOwn = async (userId, filters = {}) => {
  const { status, limit = 20, offset = 0 } = filters;

  const whereClause = {
    userId,
    deletedAt: null,
  };

  if (status) {
    whereClause.status = status;
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    skip: Number(offset),
    take: Number(limit),
    include: {
      media: {
        where: { sortOrder: 0 },
        include: { media: true },
        take: 1,
      },
    },
  });

  return posts.map((post) => {
    const coverMedia = post.media[0]?.media;
    return {
      id: post.id,
      title: post.title,
      price: post.price.toString(),
      status: post.status,
      condition: post.condition,
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

export const archivePost = async (postId, userId) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.deletedAt !== null) {
    const err = new Error("Publicación no encontrada");
    err.statusCode = 404;
    throw err;
  }

  if (post.userId !== userId) {
    const err = new Error("No estás autorizado para modificar esta publicación");
    err.statusCode = 403;
    throw err;
  }

  if (post.status !== "PUBLISHED" && post.status !== "SOLD") {
    const err = new Error("La publicación no se encuentra en un estado archivable");
    err.statusCode = 400;
    throw err;
  }

  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      status: "ARCHIVED",
    },
  });

  return {
    id: updatedPost.id,
    status: updatedPost.status,
    updatedAt: updatedPost.updatedAt,
  };
};

export const reactivatePost = async (postId, userId) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.deletedAt !== null) {
    const err = new Error("Publicación no encontrada");
    err.statusCode = 404;
    throw err;
  }

  if (post.userId !== userId) {
    const err = new Error("No estás autorizado para modificar esta publicación");
    err.statusCode = 403;
    throw err;
  }

  if (post.status !== "ARCHIVED" && post.status !== "SOLD") {
    const err = new Error("La publicación no se encuentra en un estado reactivable");
    err.statusCode = 400;
    throw err;
  }

  const activeCount = await prisma.post.count({
    where: {
      userId,
      status: "PUBLISHED",
      deletedAt: null,
      id: {
        not: postId,
      },
    },
  });

  if (activeCount >= MAX_ACTIVE_POSTS) {
    const err = new Error(`Has alcanzado el límite de ${MAX_ACTIVE_POSTS} publicaciones activas. Archiva una antes de reactivar otra.`);
    err.statusCode = 403;
    throw err;
  }

  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      status: "PUBLISHED",
    },
  });

  return {
    id: updatedPost.id,
    status: updatedPost.status,
    updatedAt: updatedPost.updatedAt,
  };
};
