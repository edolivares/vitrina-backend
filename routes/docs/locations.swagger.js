export const locationPaths = {
  "/api/locations/regions": {
    get: {
      summary: "Listar todas las regiones",
      tags: ["Ubicaciones"],
      responses: {
        200: {
          description: "Listado de regiones",
        },
      },
    },
  },
  "/api/locations/regions/{regionId}/cities": {
    get: {
      summary: "Listar ciudades por región",
      tags: ["Ubicaciones"],
      parameters: [
        {
          name: "regionId",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "ID de la región",
        },
      ],
      responses: {
        200: {
          description: "Listado de comunas/ciudades",
        },
      },
    },
  },
};
