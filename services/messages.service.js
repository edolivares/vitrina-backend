import { prisma } from "../lib/database.js";

const chatInclude = {
  seller: {
    select: {
      id: true,
      name: true,
    },
  },
  buyer: {
    select: {
      id: true,
      name: true,
    },
  },
  post: {
    include: {
      media: {
        where: { sortOrder: 0 },
        include: { media: true },
        take: 1,
      },
    },
  },
};

const formatChat = (chat) => {
  const coverMedia = chat.post.media[0]?.media;

  return {
    id: chat.id,
    postId: chat.postId,
    postTitle: chat.post.title,
    postPrice: chat.post.price.toString(),
    postImage: coverMedia
      ? {
          url: coverMedia.url,
          placeholder: coverMedia.placeholder,
        }
      : null,
    seller: chat.seller,
    buyer: chat.buyer,
    lastMessage: chat.lastMessage,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
};

const ensureChatParticipant = (chat, userId) => {
  if (!chat || (chat.sellerId !== userId && chat.buyerId !== userId)) {
    const err = new Error("Conversacion no encontrada");
    err.statusCode = 404;
    throw err;
  }
};

export const createOrGetPostChat = async (postId, userId) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      media: {
        where: { sortOrder: 0 },
        include: { media: true },
        take: 1,
      },
    },
  });

  if (!post || post.deletedAt !== null || (post.status !== "PUBLISHED" && post.status !== "SOLD")) {
    const err = new Error("Publicacion no encontrada");
    err.statusCode = 404;
    throw err;
  }

  if (post.userId === userId) {
    const err = new Error("No puedes iniciar una conversacion sobre tu propia publicacion");
    err.statusCode = 400;
    throw err;
  }

  const existingChat = await prisma.chat.findUnique({
    where: {
      postId_buyerId: {
        postId,
        buyerId: userId,
      },
    },
    include: chatInclude,
  });

  if (existingChat) {
    return {
      chat: formatChat(existingChat),
      created: false,
    };
  }

  const initialMessage = "Conversacion iniciada";
  const chat = await prisma.chat.create({
    data: {
      postId,
      sellerId: post.userId,
      buyerId: userId,
      lastMessage: initialMessage,
      messages: {
        create: {
          senderId: userId,
          content: initialMessage,
        },
      },
    },
    include: chatInclude,
  });

  return {
    chat: formatChat(chat),
    created: true,
  };
};

export const listOwnChats = async (userId) => {
  const chats = await prisma.chat.findMany({
    where: {
      OR: [{ sellerId: userId }, { buyerId: userId }],
    },
    orderBy: { updatedAt: "desc" },
    include: chatInclude,
  });

  return chats.map(formatChat);
};

export const listPostChats = async (postId, userId) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.deletedAt !== null) {
    const err = new Error("Publicacion no encontrada");
    err.statusCode = 404;
    throw err;
  }

  const whereClause = post.userId === userId ? { postId } : { postId, buyerId: userId };

  const chats = await prisma.chat.findMany({
    where: whereClause,
    orderBy: { updatedAt: "desc" },
    include: chatInclude,
  });

  return chats.map(formatChat);
};

export const listChatMessages = async (chatId, userId) => {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  ensureChatParticipant(chat, userId);

  return prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      chatId: true,
      senderId: true,
      content: true,
      createdAt: true,
    },
  });
};

export const sendChatMessage = async (chatId, userId, content) => {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  ensureChatParticipant(chat, userId);

  const message = await prisma.message.create({
    data: {
      chatId,
      senderId: userId,
      content,
    },
    select: {
      id: true,
      chatId: true,
      senderId: true,
      content: true,
      createdAt: true,
    },
  });

  await prisma.chat.update({
    where: { id: chatId },
    data: { lastMessage: content },
  });

  return message;
};
