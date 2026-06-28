export const savedPaths = {
  "/api/saved-posts": {
    get: {
      summary: "Listar favoritos del usuario autenticado",
      tags: ["Favoritos"],
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: "Favoritos guardados" },
      },
    },
    post: {
      summary: "Guardar publicación en favoritos",
      tags: ["Favoritos"],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["postId"],
              properties: {
                postId: { type: "string", format: "uuid" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Guardado exitosamente" },
      },
    },
  },
  "/api/saved-posts/{postId}": {
    delete: {
      summary: "Eliminar publicación de favoritos",
      tags: ["Favoritos"],
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "postId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        200: { description: "Eliminado con éxito" },
      },
    },
  },
};
