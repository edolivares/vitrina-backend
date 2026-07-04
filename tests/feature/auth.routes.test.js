import { describe, it, expect, vi } from "vitest";
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
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  },
}));

// Mock del servicio de autenticación
vi.mock("../../services/auth.service.js", () => {
  return {
    registerUser: vi.fn(async (data) => {
      if (data.email === "existing@email.com") {
        throw new Error("El correo electrónico ya se encuentra registrado");
      }
      return {
        id: "test-uuid-123",
        name: data.name,
        email: data.email,
        createdAt: new Date().toISOString(),
      };
    }),
    loginUser: vi.fn(async (data) => {
      if (data.email === "wrong@email.com" || data.password === "wrongpassword") {
        throw new Error("Correo o contraseña incorrectos");
      }
      // Emitir un token válido para pasar el middleware de autenticación
      const token = jwt.sign(
        { id: "test-uuid-123", email: data.email },
        config.jwt.secret || "testsecret",
        { expiresIn: "1h" }
      );
      return {
        token,
        refreshToken: "mock-refresh-token",
        user: {
          id: "test-uuid-123",
          name: "Juan Pérez Test",
          email: data.email,
          avatarId: null,
        },
      };
    }),
    refreshAccessToken: vi.fn(async (refreshToken) => {
      if (!refreshToken) {
        const error = new Error("Refresh token no proporcionado");
        error.statusCode = 401;
        throw error;
      }

      const token = jwt.sign(
        { id: "test-uuid-123", email: "juan.test@email.com" },
        config.jwt.secret || "testsecret",
        { expiresIn: "15m" }
      );

      return {
        token,
        user: {
          id: "test-uuid-123",
          name: "Juan PÃ©rez Test",
          email: "juan.test@email.com",
          avatarId: null,
        },
      };
    }),
    logoutUser: vi.fn(async () => undefined),
    getUserProfile: vi.fn(async (userId) => {
      if (userId !== "test-uuid-123") {
        throw new Error("Usuario no encontrado");
      }
      return {
        id: "test-uuid-123",
        name: "Juan Pérez Test",
        email: "juan.test@email.com",
        avatar: null,
        createdAt: new Date().toISOString(),
      };
    }),
    updateUserProfile: vi.fn(async (userId, data) => {
      return {
        id: "test-uuid-123",
        name: data.name || "Juan Pérez Test",
        email: "juan.test@email.com",
        avatar: null,
        createdAt: new Date().toISOString(),
      };
    }),
    uploadUserAvatar: vi.fn(async () => ({
      id: "test-uuid-123",
      name: "Juan Pérez Test",
      email: "juan.test@email.com",
      avatar: {
        id: "77a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c",
        url: "http://localhost:4000/storage/media/avatars/test-uuid-123/avatar.webp",
        placeholder: "data:image/webp;base64,test",
        width: 80,
        height: 60,
        size: 1024,
        mimeType: "image/webp",
      },
      createdAt: new Date().toISOString(),
    })),
  };
});

describe("Autenticación y Usuarios REST API (Mocked)", () => {
  const testUser = {
    name: "Juan Pérez Test",
    email: "juan.test@email.com",
    password: "securepassword123",
  };

  let token = "";

  it("Debería registrar un nuevo usuario exitosamente", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.name).toBe(testUser.name);
    expect(res.body.data.email).toBe(testUser.email);
  });

  it("Debería fallar al registrar un usuario con correo ya existente", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Juan Pérez Test",
      email: "existing@email.com",
      password: "securepassword123",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.message).toContain("ya se encuentra registrado");
  });

  it("Debería iniciar sesión correctamente", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body).toHaveProperty("token");
    expect(res.headers["set-cookie"]?.[0]).toContain("refreshToken=mock-refresh-token");
    expect(res.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(res.body.data.email).toBe(testUser.email);
    token = res.body.token;
  });

  it("DeberÃ­a renovar el token usando refresh token en cookie", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", ["refreshToken=mock-refresh-token"]);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body).toHaveProperty("token");
    expect(res.body.data.email).toBe("juan.test@email.com");
  });

  it("DeberÃ­a denegar refresh sin cookie", async () => {
    const res = await request(app).post("/api/auth/refresh");

    expect(res.statusCode).toBe(401);
    expect(res.body.status).toBe("error");
  });

  it("DeberÃ­a cerrar sesiÃ³n limpiando la cookie de refresh token", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", ["refreshToken=mock-refresh-token"]);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.headers["set-cookie"]?.[0]).toContain("refreshToken=");
    expect(res.headers["set-cookie"]?.[0]).toContain("Expires=Thu, 01 Jan 1970");
  });

  it("Debería fallar al iniciar sesión con contraseña incorrecta", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: "wrongpassword",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.status).toBe("error");
  });

  it("Debería denegar el acceso a /api/auth/me sin token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.statusCode).toBe(401);
  });

  it("Debería obtener el perfil del usuario autenticado", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.email).toBe("juan.test@email.com");
  });

  it("Debería actualizar el perfil del usuario autenticado", async () => {
    const res = await request(app)
      .put("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Juan Actualizado",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.name).toBe("Juan Actualizado");
  });

  it("Debería subir avatar y devolver placeholder base64", async () => {
    const res = await request(app)
      .post("/api/auth/me/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", "tests/fixtures/images/sample.svg");

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.avatar.url).toContain("/storage/media/avatars/");
    expect(res.body.data.avatar.placeholder).toMatch(/^data:image\/webp;base64,/);
  });
});
