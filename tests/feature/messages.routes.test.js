import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app.js";
import { config } from "../../lib/config.js";

vi.mock("../../lib/database.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    region: { findMany: vi.fn() },
    city: { findMany: vi.fn(), findFirst: vi.fn() },
    post: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    chat: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    media: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    postMedia: { upsert: vi.fn(), deleteMany: vi.fn() },
    savedPost: { upsert: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    message: { create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
  },
}));

const mockChat = {
  id: "9f70bd54-f65d-4a86-a934-6f0dd37af851",
  postId: "3c3d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
  postTitle: "Bicicleta Trek Marlin 5 Aro 29",
  postPrice: "420000.00",
  postImage: null,
  seller: {
    id: "0f2391a4-ef26-4712-a63f-4c41dbbd9d44",
    name: "Rodrigo Araya",
  },
  buyer: {
    id: "test-uuid-123",
    name: "Diego Valdivia",
  },
  lastMessage: "Conversacion iniciada",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

vi.mock("../../services/messages.service.js", () => ({
  createOrGetPostChat: vi.fn(async () => ({
    chat: mockChat,
    created: true,
  })),
  listPostChats: vi.fn(async () => [mockChat]),
  listOwnChats: vi.fn(async () => [mockChat]),
  listChatMessages: vi.fn(async () => [
    {
      id: "f3f9fd3f-5e76-4f8d-9df1-8cb4b2cf6001",
      chatId: mockChat.id,
      senderId: "test-uuid-123",
      content: "Hola, sigue disponible?",
      createdAt: new Date().toISOString(),
    },
  ]),
  sendChatMessage: vi.fn(async (chatId, senderId, content) => ({
    id: "5c24f6ce-84a7-4f0d-aaf2-25c5e8e6dd45",
    chatId,
    senderId,
    content,
    createdAt: new Date().toISOString(),
  })),
}));

describe("Mensajes y conversaciones REST API (Mocked)", () => {
  let token = "";

  beforeAll(() => {
    token = jwt.sign(
      { id: "test-uuid-123", email: "buyer@email.com" },
      config.jwt.secret || "testsecret",
      { expiresIn: "1h" },
    );
  });

  it("Deberia crear o recuperar una conversacion desde una publicacion", async () => {
    const res = await request(app)
      .post(`/api/posts/${mockChat.postId}/chats`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.id).toBe(mockChat.id);
    expect(res.body.data.postId).toBe(mockChat.postId);
  });

  it("Deberia listar conversaciones propias", async () => {
    const res = await request(app)
      .get("/api/chats")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("Deberia listar conversaciones de una publicacion", async () => {
    const res = await request(app)
      .get(`/api/posts/${mockChat.postId}/chats`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data[0].postId).toBe(mockChat.postId);
  });

  it("Deberia listar y enviar mensajes dentro de un chat", async () => {
    const listRes = await request(app)
      .get(`/api/chats/${mockChat.id}/messages`)
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.data[0].chatId).toBe(mockChat.id);

    const sendRes = await request(app)
      .post(`/api/chats/${mockChat.id}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Me interesa coordinar entrega." });

    expect(sendRes.statusCode).toBe(201);
    expect(sendRes.body.data.content).toBe("Me interesa coordinar entrega.");
  });
});
