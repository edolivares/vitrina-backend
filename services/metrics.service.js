import crypto from "crypto";
import { prisma } from "../lib/database.js";
import { config } from "../lib/config.js";

const BOT_USER_AGENT_PATTERN = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|slackbot|telegrambot|discordbot|linkedinbot|twitterbot/i;

const hashValue = (value) => {
  if (!value) return null;

  return crypto
    .createHmac("sha256", config.metrics.hashSecret)
    .update(value)
    .digest("hex");
};

const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
};

export const getViewContext = (req) => {
  const userAgent = req.headers["user-agent"] || "";

  return {
    ipHash: hashValue(getClientIp(req)),
    userAgentHash: hashValue(userAgent),
    isBot: BOT_USER_AGENT_PATTERN.test(userAgent),
  };
};

export const trackPostView = async ({ postId, viewerId, viewContext }) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      userId: true,
      status: true,
      deletedAt: true,
    },
  });

  if (!post || post.status !== "PUBLISHED" || post.deletedAt !== null) return false;
  if (viewerId && viewerId === post.userId) return false;
  if (viewContext?.isBot) return false;

  const dedupeFrom = new Date(Date.now() - config.metrics.viewDedupeWindowMinutes * 60 * 1000);
  const visitorWhere = viewerId
    ? { viewerId }
    : {
        viewerId: null,
        ipHash: viewContext?.ipHash || null,
        userAgentHash: viewContext?.userAgentHash || null,
      };

  const recentView = await prisma.postView.findFirst({
    where: {
      postId: post.id,
      viewedAt: { gte: dedupeFrom },
      ...visitorWhere,
    },
  });

  if (recentView) return false;

  await prisma.postView.create({
    data: {
      postId: post.id,
      viewerId: viewerId || null,
      ipHash: viewContext?.ipHash || null,
      userAgentHash: viewContext?.userAgentHash || null,
    },
  });

  return true;
};

export const getPostMetrics = async (postId, userId) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.deletedAt !== null) {
    const err = new Error("Publicacion no encontrada");
    err.statusCode = 404;
    throw err;
  }

  if (post.userId !== userId) {
    const err = new Error("No estas autorizado para ver las metricas de esta publicacion");
    err.statusCode = 403;
    throw err;
  }

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const [
    totalViews,
    viewsLast24h,
    viewsLast48h,
    favorites,
    conversations,
    lastChat,
  ] = await Promise.all([
    prisma.postView.count({ where: { postId } }),
    prisma.postView.count({ where: { postId, viewedAt: { gte: last24h } } }),
    prisma.postView.count({ where: { postId, viewedAt: { gte: last48h } } }),
    prisma.savedPost.count({ where: { postId } }),
    prisma.chat.count({ where: { postId } }),
    prisma.chat.findFirst({
      where: { postId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  const interestRate = totalViews > 0
    ? Number((((favorites + conversations) / totalViews) * 100).toFixed(1))
    : 0;

  return {
    postId,
    views: {
      total: totalViews,
      last24h: viewsLast24h,
      last48h: viewsLast48h,
    },
    favorites,
    conversations,
    interestRate,
    lastContactAt: lastChat?.updatedAt || null,
  };
};
