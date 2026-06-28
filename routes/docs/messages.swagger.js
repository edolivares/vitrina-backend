export const messagePaths = {
  "/api/chats": {
    get: {
      summary: "Listar conversaciones del usuario autenticado",
      tags: ["Mensajes"],
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: "Listado de conversaciones" },
      },
    },
  },
  "/api/posts/{postId}/chats": {
    get: {
      summary: "Listar conversaciones propias asociadas a una publicacion",
      tags: ["Mensajes"],
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "postId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        200: { description: "Conversaciones filtradas por publicacion" },
      },
    },
    post: {
      summary: "Crear o recuperar conversacion para una publicacion",
      tags: ["Mensajes"],
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "postId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        201: { description: "Conversacion creada" },
        200: { description: "Conversacion existente recuperada" },
      },
    },
  },
  "/api/chats/{chatId}/messages": {
    get: {
      summary: "Listar mensajes de una conversacion",
      tags: ["Mensajes"],
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "chatId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        200: { description: "Mensajes de la conversacion" },
      },
    },
    post: {
      summary: "Enviar mensaje en una conversacion",
      tags: ["Mensajes"],
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "chatId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["content"],
              properties: {
                content: { type: "string", maxLength: 1000 },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Mensaje enviado" },
      },
    },
  },
};
