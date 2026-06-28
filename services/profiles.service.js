import { prisma } from "../lib/database.js";

const formatPost = (post) => {
  const coverMedia = post.media[0]?.media;

  return {
    id: post.id,
    title: post.title,
    price: post.price.toString(),
    condition: post.condition,
    cityName: post.city.name,
    regionName: post.city.region.name,
    createdAt: post.createdAt,
    coverImage: coverMedia
      ? {
          url: coverMedia.url,
          placeholder: coverMedia.placeholder,
        }
      : null,
  };
};

export const getPublicProfile = async (profileId) => {
  const user = await prisma.user.findUnique({
    where: { id: profileId },
    include: {
      avatar: true,
      posts: {
        where: {
          status: "PUBLISHED",
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        include: {
          city: {
            include: { region: true },
          },
          media: {
            where: { sortOrder: 0 },
            include: { media: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!user || user.deletedAt !== null) {
    const err = new Error("Perfil no encontrado");
    err.statusCode = 404;
    throw err;
  }

  return {
    profile: {
      id: user.id,
      name: user.name,
      bio: user.bio,
      avatar: user.avatar
        ? {
            url: user.avatar.url,
            placeholder: user.avatar.placeholder,
          }
        : null,
      joinedAt: user.createdAt,
      reviewScore: null,
      reviewCount: 0,
      reviewSummary: [],
      recentReviews: [],
    },
    posts: user.posts.map(formatPost),
  };
};
