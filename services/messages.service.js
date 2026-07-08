import { prisma } from "../lib/database.js";
import { chatChannel, triggerRealtime, userChannel } from "../lib/realtime.js";

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

const formatChat = (chat, userId = null) => {
  const coverMedia = chat.post.media[0]?.media;

  let isUnread = false;
  if (userId) {
    if (chat.buyerId === userId) {
      isUnread = chat.lastMessageAt > chat.buyerLastReadAt;
    } else if (chat.sellerId === userId) {
      isUnread = chat.lastMessageAt > chat.sellerLastReadAt;
    }
  }

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
    lastMessageAt: chat.lastMessageAt,
    isUnread,
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

const notifyRealtime = async (channels, eventName, payload, socketId = null) => {
  try {
    await triggerRealtime(channels, eventName, payload, socketId);
  } catch (error) {
    console.warn(`No se pudo enviar evento realtime ${eventName}:`, error.message);
  }
};

const notifyChatChanged = async (chat, socketId = null, eventName = "chat.updated") => {
  await Promise.all([
    notifyRealtime(
      userChannel(chat.sellerId),
      eventName,
      { chat: formatChat(chat, chat.sellerId) },
      socketId
    ),
    notifyRealtime(
      userChannel(chat.buyerId),
      eventName,
      { chat: formatChat(chat, chat.buyerId) },
      socketId
    ),
  ]);
};

export const createOrGetPostChat = async (postId, userId, socketId = null) => {
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
      chat: formatChat(existingChat, userId),
      created: false,
    };
  }

  const initialMessage = "Hola, me interesa tu publicación. ¿Sigue disponible?";
  const initialMessageAt = new Date();
  const chat = await prisma.chat.create({
    data: {
      postId,
      sellerId: post.userId,
      buyerId: userId,
      lastMessage: initialMessage,
      lastMessageAt: initialMessageAt,
      buyerLastReadAt: initialMessageAt,
      sellerLastReadAt: new Date(0), // 1970-01-01
      messages: {
        create: {
          senderId: userId,
          content: initialMessage,
        },
      },
    },
    include: chatInclude,
  });

  await notifyChatChanged(chat, socketId, "chat.created");

  return {
    chat: formatChat(chat, userId),
    created: true,
  };
};

export const listOwnChats = async (userId) => {
  const chats = await prisma.chat.findMany({
    where: {
      OR: [{ sellerId: userId }, { buyerId: userId }],
    },
    orderBy: { lastMessageAt: "desc" },
    include: chatInclude,
  });

  return chats.map((chat) => formatChat(chat, userId));
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
    orderBy: { lastMessageAt: "desc" },
    include: chatInclude,
  });

  return chats.map((chat) => formatChat(chat, userId));
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

export const sendChatMessage = async (chatId, userId, content, socketId = null) => {
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

  const updateData = { lastMessage: content, lastMessageAt: message.createdAt };
  if (chat.buyerId === userId) {
    updateData.buyerLastReadAt = message.createdAt;
  } else if (chat.sellerId === userId) {
    updateData.sellerLastReadAt = message.createdAt;
  }

  const updatedChat = await prisma.chat.update({
    where: { id: chatId },
    data: updateData,
    include: chatInclude,
  });

  await Promise.all([
    notifyRealtime(chatChannel(chatId), "message.created", { message }, socketId),
    notifyChatChanged(updatedChat, socketId),
  ]);

  return message;
};

export const markChatAsRead = async (chatId, userId) => {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  ensureChatParticipant(chat, userId);

  const updateData = {};
  if (chat.buyerId === userId) {
    updateData.buyerLastReadAt = new Date();
  } else if (chat.sellerId === userId) {
    updateData.sellerLastReadAt = new Date();
  }

  await prisma.chat.update({
    where: { id: chatId },
    data: updateData,
  });

  return { success: true };
};
