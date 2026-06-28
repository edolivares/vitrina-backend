import { prisma } from "../lib/database.js";

export const getRegions = async () => {
  return await prisma.region.findMany({
    orderBy: { id: "asc" },
  });
};

export const getCitiesByRegion = async (regionId) => {
  const cities = await prisma.city.findMany({
    where: { regionId },
    orderBy: { name: "asc" },
  });

  return cities.map((city) => ({
    id: city.id,
    name: city.name,
    latitudeDefault: Number(city.latitudeDefault),
    longitudeDefault: Number(city.longitudeDefault),
  }));
};
