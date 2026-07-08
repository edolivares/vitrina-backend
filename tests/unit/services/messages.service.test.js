import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    chat: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
  },
}));

vi.mock("../../../lib/database.js", () => ({
  prisma: mocks.prisma,
}));

const baseChat = (overrides = {}) => ({
  id: "9f70bd54-f65d-4a86-a934-6f0dd37af851",
  postId: "3c3d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
  sellerId: "seller-1",
  buyerId: "buyer-1",
  lastMessage: "Hola",
  lastMessageAt: new Date("2026-07-06T12:00:00.000Z"),
  buyerLastReadAt: new Date("2026-07-06T11:00:00.000Z"),
  sellerLastReadAt: new Date("2026-07-06T13:00:00.000Z"),
  createdAt: new Date("2026-07-06T10:00:00.000Z"),
  updatedAt: new Date("2026-07-06T14:00:00.000Z"),
  seller: { id: "seller-1", name: "Seller" },
  buyer: { id: "buyer-1", name: "Buyer" },
  post: {
    title: "Bicicleta",
    price: 420000,
    media: [],
  },
  ...overrides,
});

describe("Servicio de mensajes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calcula no leidos y ordena conversaciones con lastMessageAt", async () => {
    const { listOwnChats } = await import("../../../services/messages.service.js");
    const chat = baseChat();
    mocks.prisma.chat.findMany.mockResolvedValue([chat]);

    const chats = await listOwnChats("buyer-1");

    expect(mocks.prisma.chat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { lastMessageAt: "desc" },
      })
    );
    expect(chats[0]).toMatchObject({
      id: chat.id,
      lastMessageAt: chat.lastMessageAt,
      isUnread: true,
    });
  });

  it("actualiza la marca de lectura sin tocar lastMessageAt", async () => {
    const { markChatAsRead } = await import("../../../services/messages.service.js");
    mocks.prisma.chat.findUnique.mockResolvedValue(baseChat());
    mocks.prisma.chat.update.mockResolvedValue({});

    await markChatAsRead("9f70bd54-f65d-4a86-a934-6f0dd37af851", "buyer-1");

    expect(mocks.prisma.chat.update).toHaveBeenCalledWith({
      where: { id: "9f70bd54-f65d-4a86-a934-6f0dd37af851" },
      data: { buyerLastReadAt: expect.any(Date) },
    });
    expect(mocks.prisma.chat.update.mock.calls[0][0].data).not.toHaveProperty("lastMessageAt");
  });

  it("al enviar mensaje mueve lastMessageAt y la lectura del remitente", async () => {
    const { sendChatMessage } = await import("../../../services/messages.service.js");
    const messageCreatedAt = new Date("2026-07-06T15:00:00.000Z");
    mocks.prisma.chat.findUnique.mockResolvedValue(baseChat());
    mocks.prisma.message.create.mockResolvedValue({
      id: "5c24f6ce-84a7-4f0d-aaf2-25c5e8e6dd45",
      chatId: "9f70bd54-f65d-4a86-a934-6f0dd37af851",
      senderId: "buyer-1",
      content: "Sigue disponible?",
      createdAt: messageCreatedAt,
    });
    mocks.prisma.chat.update.mockResolvedValue(
      baseChat({
        lastMessage: "Sigue disponible?",
        lastMessageAt: messageCreatedAt,
        buyerLastReadAt: messageCreatedAt,
      })
    );

    await sendChatMessage("9f70bd54-f65d-4a86-a934-6f0dd37af851", "buyer-1", "Sigue disponible?");

    expect(mocks.prisma.chat.update).toHaveBeenCalledWith({
      where: { id: "9f70bd54-f65d-4a86-a934-6f0dd37af851" },
      data: {
        lastMessage: "Sigue disponible?",
        lastMessageAt: messageCreatedAt,
        buyerLastReadAt: messageCreatedAt,
      },
      include: expect.any(Object),
    });
  });
});
