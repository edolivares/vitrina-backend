import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

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

vi.mock("../../services/location.service.js", () => ({
  getRegions: vi.fn(async () => []),
  getCitiesByRegion: vi.fn(async () => []),
}));

vi.mock("../../services/auth.service.js", () => ({
  loginUser: vi.fn(async () => {
    throw new Error("Correo o contrasena incorrectos");
  }),
  registerUser: vi.fn(async (data) => ({
    id: "test-user-id",
    name: data.name,
    email: data.email,
    createdAt: new Date().toISOString(),
  })),
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}));

const loadApp = async (env = {}) => {
  vi.resetModules();
  Object.assign(process.env, {
    CORS_ALLOWED_ORIGINS: "http://localhost:5173",
    RATE_LIMIT_PUBLIC_WINDOW_MINUTES: "15",
    RATE_LIMIT_PUBLIC_MAX: "100",
    RATE_LIMIT_LOGIN_WINDOW_MINUTES: "15",
    RATE_LIMIT_LOGIN_MAX: "100",
    RATE_LIMIT_REGISTER_WINDOW_MINUTES: "60",
    RATE_LIMIT_REGISTER_MAX: "100",
    RATE_LIMIT_MEDIA_WINDOW_MINUTES: "15",
    RATE_LIMIT_MEDIA_MAX: "100",
    RATE_LIMIT_PRIVATE_WRITE_WINDOW_MINUTES: "15",
    RATE_LIMIT_PRIVATE_WRITE_MAX: "100",
    JWT_SECRET: "testsecret",
    ...env,
  });

  const mod = await import("../../app.js");
  return mod.default;
};

describe("Rate limit y CORS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite origenes configurados por CORS", async () => {
    const app = await loadApp();

    const res = await request(app)
      .get("/api/locations/regions")
      .set("Origin", "http://localhost:5173");

    expect(res.statusCode).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("rechaza origenes no configurados por CORS", async () => {
    const app = await loadApp();

    const res = await request(app)
      .get("/api/locations/regions")
      .set("Origin", "https://no-permitido.example");

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Origen no permitido por CORS");
  });

  it("limita rutas publicas segun RATE_LIMIT_PUBLIC_MAX", async () => {
    const app = await loadApp({ RATE_LIMIT_PUBLIC_MAX: "2" });

    await request(app).get("/api/locations/regions").expect(200);
    await request(app).get("/api/locations/regions").expect(200);

    const res = await request(app).get("/api/locations/regions");

    expect(res.statusCode).toBe(429);
    expect(res.body.message).toBe("Demasiadas solicitudes. Intenta nuevamente en unos minutos.");
  });

  it("limita login segun RATE_LIMIT_LOGIN_MAX", async () => {
    const app = await loadApp({
      RATE_LIMIT_PUBLIC_MAX: "100",
      RATE_LIMIT_LOGIN_MAX: "1",
    });

    await request(app)
      .post("/api/auth/login")
      .send({ email: "test@email.com", password: "wrongpassword" })
      .expect(401);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@email.com", password: "wrongpassword" });

    expect(res.statusCode).toBe(429);
    expect(res.body.message).toBe(
      "Demasiados intentos de inicio de sesion. Intenta nuevamente en unos minutos."
    );
  });
});
