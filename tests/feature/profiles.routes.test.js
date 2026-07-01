import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../../app.js";

vi.mock("../../lib/database.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    region: { findMany: vi.fn() },
    city: { findMany: vi.fn(), findFirst: vi.fn() },
    post: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    chat: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    media: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    postMedia: { upsert: vi.fn(), count: vi.fn(), deleteMany: vi.fn() },
    savedPost: { upsert: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    message: { create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
  },
}));

const profileId = "0f2391a4-ef26-4712-a63f-4c41dbbd9d44";

vi.mock("../../services/profiles.service.js", () => ({
  getPublicProfile: vi.fn(async (id) => {
    if (id !== profileId) {
      const err = new Error("Perfil no encontrado");
      err.statusCode = 404;
      throw err;
    }

    return {
      profile: {
        id,
        name: "Rodrigo Araya",
        bio: "Vendo barato y seguro.",
        avatar: null,
        joinedAt: new Date().toISOString(),
        reviewScore: null,
        reviewCount: 0,
        reviewSummary: [],
        recentReviews: [],
      },
      posts: [
        {
          id: "3c3d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
          title: "Bicicleta Trek Marlin 5 Aro 29",
          price: "420000.00",
          condition: "USED",
          cityName: "La Serena",
          regionName: "Coquimbo",
          coverImage: null,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }),
}));

describe("Perfiles publicos REST API (Mocked)", () => {
  it("Deberia retornar un perfil publico con publicaciones activas", async () => {
    const res = await request(app).get(`/api/profiles/${profileId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.profile.id).toBe(profileId);
    expect(res.body.data.posts).toHaveLength(1);
  });

  it("Deberia retornar 404 para un perfil inexistente", async () => {
    const res = await request(app).get("/api/profiles/11111111-1111-4111-8111-111111111111");

    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe("error");
  });
});
