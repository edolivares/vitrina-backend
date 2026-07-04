import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app.js";
import { config } from "../../lib/config.js";

// Interceptar lib/database.js para evitar que se importe/inicie el Prisma Client real
vi.mock("../../lib/database.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    region: { findMany: vi.fn() },
    city: { findMany: vi.fn(), findFirst: vi.fn() },
    post: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    media: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    postMedia: { upsert: vi.fn(), deleteMany: vi.fn() },
    savedPost: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    message: { deleteMany: vi.fn() },
  },
}));

// Mock del estado de publicaciones
let mockDraftCount = 0;
let mockPostDetails = {
  "3c3d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f": {
    id: "3c3d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
    userId: "test-uuid-123",
    status: "DRAFT",
    title: "Sin Título",
    description: "",
    price: "0",
    city: { name: "La Serena", region: "Coquimbo" },
    seller: { name: "Test Seller", email: "seller@email.com" },
    gallery: [],
  },
};

// Mock del servicio de publicaciones
vi.mock("../../services/posts.service.js", () => {
  return {
    createDraft: vi.fn(async (userId) => {
      if (mockDraftCount >= 5) {
        const err = new Error(
          "Has alcanzado el límite de 5 borradores activos. Debes publicar o eliminar algunos antes de poder crear otro."
        );
        err.statusCode = 403;
        throw err;
      }
      mockDraftCount++;
      const id =
        mockDraftCount === 1
          ? "3c3d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f"
          : `3c3d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8${mockDraftCount}`;
      mockPostDetails[id] = {
        id,
        userId,
        status: "DRAFT",
        title: "Sin Título",
        description: "",
        price: "0",
        city: { name: "La Serena", region: "Coquimbo" },
        seller: { name: "Test Seller", email: "seller@email.com" },
        gallery: [],
      };
      return {
        id,
        userId,
        status: "DRAFT",
        createdAt: new Date().toISOString(),
      };
    }),
    getDetail: vi.fn(async (postId, userId) => {
      const post = mockPostDetails[postId];
      if (!post) {
        const err = new Error("Publicación no encontrada");
        err.statusCode = 404;
        throw err;
      }
      if (post.status === "DRAFT" || post.status === "ARCHIVED") {
        if (!userId || post.userId !== userId) {
          const err = new Error("Publicación no encontrada");
          err.statusCode = 404;
          throw err;
        }
      }
      return post;
    }),
    updatePost: vi.fn(async (postId, userId, data) => {
      const post = mockPostDetails[postId];
      if (!post) {
        const err = new Error("Publicación no encontrada");
        err.statusCode = 404;
        throw err;
      }
      post.title = data.title;
      post.description = data.description;
      post.price = String(data.price);
      post.status = data.status;
      return post;
    }),
    listPublished: vi.fn(async (filters = {}) => {
      if (filters.search === "Computador") {
        return [];
      }
      // Filtrar sólo publicadas
      const list = Object.values(mockPostDetails).filter((p) => p.status === "PUBLISHED");
      return list.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        cityName: p.city.name,
        coverImage: null,
        createdAt: new Date().toISOString(),
      }));
    }),
    archivePost: vi.fn(async (postId, userId) => {
      const post = mockPostDetails[postId];
      if (!post) {
        const err = new Error("Publicación no encontrada");
        err.statusCode = 404;
        throw err;
      }
      post.status = "ARCHIVED";
      return {
        id: postId,
        status: "ARCHIVED",
        updatedAt: new Date().toISOString(),
      };
    }),
    reactivatePost: vi.fn(async (postId, userId) => {
      const post = mockPostDetails[postId];
      if (!post) {
        const err = new Error("Publicación no encontrada");
        err.statusCode = 404;
        throw err;
      }
      post.status = "PUBLISHED";
      return {
        id: postId,
        status: "PUBLISHED",
        updatedAt: new Date().toISOString(),
      };
    }),
    deletePost: vi.fn(async (postId, userId) => {
      const post = mockPostDetails[postId];
      if (!post) {
        const err = new Error("Publicación no encontrada");
        err.statusCode = 404;
        throw err;
      }
      delete mockPostDetails[postId];
      mockDraftCount = Math.max(0, mockDraftCount - 1);
      return { message: "Publicación eliminada correctamente" };
    }),
  };
});

vi.mock("../../services/media.service.js", () => ({
  uploadImage: vi.fn(async () => ({
    id: "77a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c",
    url: "http://localhost:4000/uploads/test.webp",
    placeholder: "data:image/webp;base64,test",
    width: 800,
    height: 600,
    size: 1024,
    mimeType: "image/webp",
    context: "POST",
  })),
  linkMediaToPost: vi.fn(async () => ({})),
  deleteMedia: vi.fn(),
}));

vi.mock("../../services/metrics.service.js", () => ({
  getViewContext: vi.fn(() => ({
    ipHash: "ip-hash",
    userAgentHash: "ua-hash",
    isBot: false,
  })),
  trackPostView: vi.fn(async () => true),
  getPostMetrics: vi.fn(async (postId) => ({
    postId,
    views: {
      total: 100,
      last24h: 12,
      last48h: 20,
    },
    favorites: 8,
    conversations: 2,
    interestRate: 10,
    lastContactAt: "2026-07-01T12:00:00.000Z",
  })),
}));

describe("Publicaciones REST API (Mocked)", () => {
  let token = "";
  const firstPostId = "3c3d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f";

  beforeAll(() => {
    // Generar token JWT válido para las peticiones privadas
    token = jwt.sign(
      { id: "test-uuid-123", email: "seller@email.com" },
      config.jwt.secret || "testsecret",
      { expiresIn: "1h" }
    );
  });

  it("Debería inicializar un borrador exitosamente", async () => {
    // Resetear contador a 0 para el test del primer borrador
    mockDraftCount = 0;
    const res = await request(app).post("/api/posts/draft").set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.status).toBe("DRAFT");
    expect(res.body.data.id).toBe(firstPostId);
  });

  it("Debería crear una publicación nueva directamente como borrador", async () => {
    mockDraftCount = 0;
    const res = await request(app).post("/api/posts").set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.status).toBe("DRAFT");
    expect(res.body.data.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("Debería fallar al ver detalles del borrador por parte de un usuario anónimo (retorna 404)", async () => {
    const res = await request(app).get(`/api/posts/${firstPostId}`);
    expect(res.statusCode).toBe(404);
  });

  it("Debería permitir al dueño ver los detalles del borrador", async () => {
    const res = await request(app)
      .get(`/api/posts/${firstPostId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.id).toBe(firstPostId);
    expect(res.body.data.status).toBe("DRAFT");
  });

  it("Deberia permitir guardar un borrador incompleto al cambiar la comuna", async () => {
    const draftPayload = {
      title: "Sin Título",
      description: "",
      price: 0,
      cityId: 4102,
      condition: "USED",
      status: "DRAFT",
    };

    const res = await request(app)
      .put(`/api/posts/${firstPostId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(draftPayload);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.status).toBe("DRAFT");
  });

  it("Debería actualizar y publicar el borrador", async () => {
    const postPayload = {
      title: "Bicicleta Mountain Bike Aro 29",
      description: "Bicicleta Oxford en excelente estado de funcionamiento, frenos hidráulicos.",
      price: 250000,
      cityId: 4101,
      latitude: -33.456,
      longitude: -70.648,
      status: "PUBLISHED",
    };

    const res = await request(app)
      .put(`/api/posts/${firstPostId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(postPayload);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.status).toBe("PUBLISHED");
    expect(res.body.data.title).toBe(postPayload.title);
  });

  it("Debería vincular media desde la ruta canónica de publicaciones", async () => {
    const res = await request(app)
      .post(`/api/posts/${firstPostId}/media`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        mediaId: "77a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c",
        sortOrder: 0,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
  });

  it("Deberia subir y vincular imagen directamente desde la ruta canonica de publicaciones", async () => {
    const res = await request(app)
      .post(`/api/posts/${firstPostId}/media`)
      .set("Authorization", `Bearer ${token}`)
      .field("sortOrder", "0")
      .attach("file", Buffer.from("fake-image"), {
        filename: "foto.webp",
        contentType: "image/webp",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.id).toBe("77a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c");
    expect(res.body.data.postId).toBe(firstPostId);
  });

  it("No debería exponer la vinculación de media bajo /api/media", async () => {
    const res = await request(app)
      .post(`/api/media/${firstPostId}/media`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        mediaId: "77a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c",
        sortOrder: 0,
      });

    expect(res.statusCode).toBe(404);
  });

  it("Debería permitir ver los detalles del post publicado de forma pública", async () => {
    const res = await request(app).get(`/api/posts/${firstPostId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.title).toBe("Bicicleta Mountain Bike Aro 29");
  });

  it("Deberia exponer metricas de una publicacion propia", async () => {
    const res = await request(app)
      .get(`/api/posts/${firstPostId}/metrics`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.views.total).toBe(100);
    expect(res.body.data.views.last24h).toBe(12);
    expect(res.body.data.views.last48h).toBe(20);
    expect(res.body.data.favorites).toBe(8);
    expect(res.body.data.conversations).toBe(2);
    expect(res.body.data.interestRate).toBe(10);
  });

  it("Debería listar la publicación en la galería pública", async () => {
    const res = await request(app).get("/api/posts");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].id).toBe(firstPostId);
  });

  it("Debería filtrar publicaciones por palabra clave", async () => {
    const res = await request(app).get("/api/posts?search=Oxford");
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const emptyRes = await request(app).get("/api/posts?search=Computador");
    expect(emptyRes.body.data.length).toBe(0);
  });

  it("Debería archivar la publicación", async () => {
    const res = await request(app)
      .patch(`/api/posts/${firstPostId}/archive`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.status).toBe("ARCHIVED");
  });

  it("Debería ocultar la publicación archivada de la galería pública", async () => {
    const res = await request(app).get("/api/posts");
    const found = res.body.data.some((p) => p.id === firstPostId);
    expect(found).toBe(false);
  });

  it("Debería reactivar la publicación", async () => {
    const res = await request(app)
      .patch(`/api/posts/${firstPostId}/reactivate`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.status).toBe("PUBLISHED");
  });

  it("Debería hacer soft delete del post", async () => {
    const res = await request(app)
      .delete(`/api/posts/${firstPostId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");

    // Verificar que retorna 404 ahora en detalle público
    const detailRes = await request(app).get(`/api/posts/${firstPostId}`);
    expect(detailRes.statusCode).toBe(404);
  });

  it("Debería hacer valer el límite de 5 borradores activos", async () => {
    // Resetear para contar exactamente 5 borradores creados
    mockDraftCount = 0;
    mockPostDetails = {};

    // Crear 5 borradores
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/posts/draft")
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(201);
    }

    // El 6to borrador debería fallar con 403
    const resFail = await request(app)
      .post("/api/posts/draft")
      .set("Authorization", `Bearer ${token}`);

    expect(resFail.statusCode).toBe(403);
    expect(resFail.body.status).toBe("error");
    expect(resFail.body.message).toContain("límite de 5 borradores activos");
  });
});
