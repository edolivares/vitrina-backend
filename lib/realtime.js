import Pusher from "pusher";
import { config } from "./config.js";

const isConfigured = Boolean(
  config.server.env !== "test" &&
    config.pusher.appId &&
    config.pusher.key &&
    config.pusher.secret &&
    config.pusher.cluster
);

export const pusher = isConfigured
  ? new Pusher({
      appId: config.pusher.appId,
      key: config.pusher.key,
      secret: config.pusher.secret,
      cluster: config.pusher.cluster,
      useTLS: true,
    })
  : null;

export const isRealtimeEnabled = () => Boolean(pusher);

export const userChannel = (userId) => `private-user-${userId}`;

export const chatChannel = (chatId) => `private-chat-${chatId}`;

export const triggerRealtime = async (channels, eventName, payload, socketId = null) => {
  if (!pusher) return false;

  const options = socketId ? { socket_id: socketId } : undefined;
  await pusher.trigger(channels, eventName, payload, options);
  return true;
};
