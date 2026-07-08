export const profilePaths = {
  "/api/profiles/{profileId}": {
    get: {
      summary: "Ver perfil público de un usuario",
      tags: ["Perfiles"],
      parameters: [
        {
          name: "profileId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "UUID del perfil del usuario",
        },
      ],
      responses: {
        200: {
          description:
            "Perfil público, historial de reseñas asociadas y publicaciones activas del vendedor.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  profile: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string" },
                      bio: { type: "string", nullable: true },
                      avatar: {
                        type: "object",
                        nullable: true,
                        properties: {
                          url: { type: "string", format: "uri" },
                          placeholder: {
                            type: "string",
                            description: "Placeholder base64 de la imagen",
                          },
                        },
                      },
                      joinedAt: { type: "string", format: "date-time" },
                      reviewScore: { type: "number", format: "float", nullable: true },
                      reviewCount: { type: "integer" },
                      reviewSummary: {
                        type: "object",
                        properties: {
                          1: { type: "integer" },
                          2: { type: "integer" },
                          3: { type: "integer" },
                          4: { type: "integer" },
                          5: { type: "integer" },
                        },
                      },
                      reviews: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            author: { type: "string" },
                            rating: { type: "integer" },
                            comment: { type: "string" },
                            date: { type: "string", format: "date-time" },
                            post: {
                              type: "object",
                              properties: {
                                id: { type: "string", format: "uuid" },
                                title: { type: "string" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  posts: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/Post",
                    },
                  },
                },
              },
            },
          },
        },
        404: { description: "Perfil no encontrado" },
      },
    },
  },
};
