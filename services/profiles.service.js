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

const buildReviewSummary = (reviews) =>
  [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
  }));

const getReviewScore = (reviews) => {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Number((total / reviews.length).toFixed(1));
};

const formatReview = (review) => ({
  id: review.id,
  author: review.buyer.name,
  rating: review.rating,
  comment: review.comment,
  date: review.createdAt,
  post: review.post
    ? {
        id: review.post.id,
        title: review.post.title,
      }
    : null,
});

export const getPublicProfile = async (profileId) => {
  const user = await prisma.user.findUnique({
    where: { id: profileId },
    include: {
      avatar: true,
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        include: {
          buyer: true,
          post: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
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
      reviewScore: getReviewScore(user.reviewsReceived),
      reviewCount: user.reviewsReceived.length,
      reviewSummary: buildReviewSummary(user.reviewsReceived),
      reviews: user.reviewsReceived.slice(0, 5).map(formatReview),
    },
    posts: user.posts.map(formatPost),
  };
};
