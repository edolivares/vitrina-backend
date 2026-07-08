import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { prisma } from "../lib/database.js";
import { chatChannel, isRealtimeEnabled, pusher, userChannel } from "../lib/realtime.js";

const router = Router();

const extractChatId = (channelName) => {
  const prefix = "private-chat-";
  return channelName.startsWith(prefix) ? channelName.slice(prefix.length) : null;
};

const extractUserId = (channelName) => {
  const prefix = "private-user-";
  return channelName.startsWith(prefix) ? channelName.slice(prefix.length) : null;
};

const canSubscribeToChat = async (channelName, userId) => {
  const chatId = extractChatId(channelName);
  if (!chatId) return false;

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { sellerId: true, buyerId: true },
  });

  return Boolean(chat && (chat.sellerId === userId || chat.buyerId === userId));
};

const canSubscribeToUser = (channelName, userId) => extractUserId(channelName) === userId;

router.post("/pusher/auth", authMiddleware, async (req, res, next) => {
  try {
    if (!isRealtimeEnabled()) {
      return res.status(503).json({ status: "error", message: "Realtime no configurado" });
    }

    const socketId = req.body.socket_id;
    const channelName = req.body.channel_name;

    if (!socketId || !channelName) {
      return res.status(400).json({ status: "error", message: "Solicitud de realtime invalida" });
    }

    const isAllowed =
      canSubscribeToUser(channelName, req.user.id) ||
      (await canSubscribeToChat(channelName, req.user.id));

    if (!isAllowed) {
      return res.status(403).json({ status: "error", message: "Canal no autorizado" });
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return res.status(200).json(authResponse);
  } catch (error) {
    next(error);
  }
});

export { chatChannel, userChannel };
export default router;
