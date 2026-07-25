import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/database.js", () => ({
  prisma: {
    city: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    post: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../../lib/database.js";
import { listPublished } from "../../../services/posts.service.js";

const buildPost = ({ id, latitude, longitude, cityName }) => ({
  id,
  userId: `user-${id}`,
  title: `Publicación ${id}`,
  price: "10000",
  condition: "USED",
  latitude,
  longitude,
  createdAt: new Date("2026-07-25T12:00:00.000Z"),
  city: {
    name: cityName,
    latitudeDefault: latitude,
    longitudeDefault: longitude,
  },
  media: [],
});

describe("listPublished - filtro geográfico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.post.findMany.mockResolvedValue([]);
  });

  it("rechaza un radio sin comuna de origen ni coordenadas", async () => {
    await expect(listPublished({ radius: "10" })).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(prisma.post.findMany).not.toHaveBeenCalled();
  });

  it("no inventa una comuna de origen a partir de una región", async () => {
    await expect(listPublished({ regionId: "13", radius: "10" })).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(prisma.city.findFirst).not.toHaveBeenCalled();
    expect(prisma.post.findMany).not.toHaveBeenCalled();
  });

  it("usa originCityId como centro y filtra publicaciones fuera del radio", async () => {
    prisma.city.findUnique.mockResolvedValue({
      id: 13101,
      latitudeDefault: -33.4489,
      longitudeDefault: -70.6693,
    });
    prisma.post.findMany.mockResolvedValue([
      buildPost({
        id: "santiago",
        latitude: -33.4489,
        longitude: -70.6693,
        cityName: "Santiago",
      }),
      buildPost({
        id: "valparaiso",
        latitude: -33.036,
        longitude: -71.6296,
        cityName: "Valparaíso",
      }),
    ]);

    const posts = await listPublished({
      originCityId: "13101",
      radius: "50",
    });

    expect(prisma.city.findUnique).toHaveBeenCalledWith({
      where: { id: 13101 },
    });
    expect(posts.map((post) => post.id)).toEqual(["santiago"]);
  });

  it("usa coordenadas GPS explícitas como centro del radio", async () => {
    prisma.post.findMany.mockResolvedValue([
      buildPost({
        id: "santiago",
        latitude: -33.4489,
        longitude: -70.6693,
        cityName: "Santiago",
      }),
      buildPost({
        id: "valparaiso",
        latitude: -33.036,
        longitude: -71.6296,
        cityName: "Valparaíso",
      }),
    ]);

    const posts = await listPublished({
      lat: "-33.4489",
      lng: "-70.6693",
      radius: "50",
    });

    expect(posts.map((post) => post.id)).toEqual(["santiago"]);
    expect(prisma.city.findUnique).not.toHaveBeenCalled();
  });
});
