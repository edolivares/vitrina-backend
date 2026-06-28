export const postPaths = {
  "/api/posts": {
    get: {
      summary: "Listar publicaciones activas (Galería pública)",
      tags: ["Publicaciones"],
      parameters: [
        { name: "search", in: "query", schema: { type: "string" }, description: "Búsqueda por palabra clave" },
        { name: "cityId", in: "query", schema: { type: "integer" }, description: "ID de comuna" },
        { name: "minPrice", in: "query", schema: { type: "number" }, description: "Precio mínimo" },
        { name: "maxPrice", in: "query", schema: { type: "number" }, description: "Precio máximo" },
        { name: "condition", in: "query", schema: { type: "string", enum: ["NEW", "USED"] }, description: "CondiciÃ³n del artÃ­culo" },
        { name: "limit", in: "query", schema: { type: "integer" }, description: "Paginación limit" },
        { name: "offset", in: "query", schema: { type: "integer" }, description: "Paginación offset" },
      ],
      responses: {
        200: {
          description: "Galería de publicaciones",
        },
      },
    },
    post: {
      summary: "Crear publicación nueva como borrador",
      tags: ["Publicaciones"],
      security: [{ BearerAuth: [] }],
      responses: {
        201: {
          description: "Borrador creado con UUID de publicación",
        },
        403: {
          description: "Límite de borradores activos alcanzado",
        },
      },
    },
  },
  "/api/posts/{id}": {
    get: {
      summary: "Ver detalles de una publicación",
      tags: ["Publicaciones"],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "UUID de la publicación" },
      ],
      responses: {
        200: { description: "Detalles del post" },
        404: { description: "Post no encontrado o sin permisos" },
      },
    },
    put: {
      summary: "Actualizar y publicar una publicación",
      tags: ["Publicaciones"],
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "UUID de la publicación" },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                price: { type: "number" },
                cityId: { type: "integer" },
                latitude: { type: "number" },
                longitude: { type: "number" },
                condition: { type: "string", enum: ["NEW", "USED"] },
                status: { type: "string", enum: ["PUBLISHED", "SOLD", "ARCHIVED", "DRAFT"] },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Publicación actualizada" },
        403: { description: "No propietario" },
      },
    },
    delete: {
      summary: "Eliminar publicación (Soft Delete)",
      tags: ["Publicaciones"],
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "UUID de la publicación" },
      ],
      responses: {
        200: { description: "Eliminado con éxito" },
        403: { description: "No propietario" },
      },
    },
  },
  "/api/posts/me": {
    get: {
      summary: "Listar publicaciones del usuario autenticado (Dashboard)",
      tags: ["Publicaciones"],
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "status", in: "query", schema: { type: "string" }, description: "Filtrar por estado" },
        { name: "limit", in: "query", schema: { type: "integer" } },
        { name: "offset", in: "query", schema: { type: "integer" } },
      ],
      responses: {
        200: { description: "Listado de posts propios" },
      },
    },
  },
  "/api/posts/{id}/archive": {
    patch: {
      summary: "Archivar publicación",
      tags: ["Publicaciones"],
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        200: { description: "Publicación archivada" },
      },
    },
  },
  "/api/posts/{id}/reactivate": {
    patch: {
      summary: "Reactivar publicación",
      tags: ["Publicaciones"],
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        200: { description: "Publicación reactivada" },
      },
    },
  },
};
