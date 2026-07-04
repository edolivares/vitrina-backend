export const profilePaths = {
  "/api/profiles/{profileId}": {
    get: {
      summary: "Ver perfil publico de un usuario",
      tags: ["Perfiles"],
      parameters: [
        {
          name: "profileId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        200: { description: "Perfil publico y publicaciones activas" },
        404: { description: "Perfil no encontrado" },
      },
    },
  },
};
