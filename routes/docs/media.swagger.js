export const mediaPaths = {
  "/api/media/upload": {
    post: {
      summary: "Subir imagen optimizada",
      tags: ["Multimedia"],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                file: { type: "string", format: "binary" },
                context: { type: "string", enum: ["AVATAR", "POST", "avatar", "post"] },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Imagen subida exitosamente" },
      },
    },
  },
  "/api/posts/{postId}/media": {
    post: {
      summary: "Subir imagen y vincularla a una publicacion",
      tags: ["Multimedia"],
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "postId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["file"],
              properties: {
                file: { type: "string", format: "binary" },
                sortOrder: { type: "integer", default: 0 },
              },
            },
          },
          "application/json": {
            schema: {
              type: "object",
              required: ["mediaId"],
              properties: {
                mediaId: { type: "string", format: "uuid" },
                sortOrder: { type: "integer", default: 0 },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Imagen subida y vinculada" },
        200: { description: "Media existente vinculada" },
        409: { description: "Limite de imagenes alcanzado" },
      },
    },
  },
  "/api/media/{id}": {
    delete: {
      summary: "Eliminar multimedia",
      tags: ["Multimedia"],
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Archivo y registro eliminados" },
      },
    },
  },
};
