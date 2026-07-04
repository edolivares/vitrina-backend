import "../setup.js";
import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../../app.js";

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

// Mock del servicio de ubicaciones
vi.mock("../../services/location.service.js", () => {
  return {
    getRegions: vi.fn(async () => [
      {
        id: 13,
        name: "Metropolitana de Santiago",
        shortName: "Región Metropolitana",
        romanNumber: "RM",
      },
      {
        id: 4,
        name: "Coquimbo",
        shortName: "Coquimbo",
        romanNumber: "IV",
      },
    ]),
    getCitiesByRegion: vi.fn(async (regionId) => {
      if (regionId === 13) {
        return [
          {
            id: 13101,
            name: "Santiago Centro",
            latitudeDefault: -33.4372,
            longitudeDefault: -70.6506,
          },
        ];
      }
      if (regionId === 4) {
        return [
          {
            id: 4101,
            name: "La Serena",
            latitudeDefault: -29.902,
            longitudeDefault: -71.251,
          },
        ];
      }
      return [];
    }),
  };
});

describe("Ubicaciones REST API (Mocked)", () => {
  it("Debería listar todas las regiones", async () => {
    const res = await request(app).get("/api/locations/regions");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].romanNumber).toBe("RM");
  });

  it("Debería listar las comunas de una región existente", async () => {
    const res = await request(app).get("/api/locations/regions/13/cities");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("success");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe("Santiago Centro");
  });

  it("Debería responder con error si la región no es un número", async () => {
    const res = await request(app).get("/api/locations/regions/not-a-number/cities");
    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe("error");
  });
});
