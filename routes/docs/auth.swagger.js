export const authPaths = {
  "/api/auth/register": {
    post: {
      summary: "Registrar un nuevo usuario",
      tags: ["Autenticación"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "email", "password"],
              properties: {
                name: { type: "string", example: "Juan Pérez" },
                email: { type: "string", format: "email", example: "juan.perez@email.com" },
                password: { type: "string", example: "securepassword123" },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Usuario registrado con éxito",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", example: "success" },
                  message: { type: "string", example: "Usuario registrado exitosamente" },
                  data: { $ref: "#/components/schemas/User" },
                },
              },
            },
          },
        },
        400: {
          description: "Error de validación o conflicto de email",
        },
      },
    },
  },
  "/api/auth/login": {
    post: {
      summary: "Iniciar sesión",
      tags: ["Autenticación"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: { type: "string", format: "email", example: "juan.perez@email.com" },
                password: { type: "string", example: "securepassword123" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Autenticación exitosa",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", example: "success" },
                  token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                  data: { $ref: "#/components/schemas/User" },
                },
              },
            },
          },
        },
        401: {
          description: "Credenciales incorrectas",
        },
      },
    },
  },
  "/api/auth/me": {
    get: {
      summary: "Obtener perfil del usuario autenticado",
      tags: ["Autenticación"],
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Datos del perfil del usuario",
        },
        401: {
          description: "No autorizado",
        },
      },
    },
    put: {
      summary: "Actualizar perfil del usuario",
      tags: ["Autenticación"],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string", example: "Juan P. Pérez" },
                email: { type: "string", format: "email", example: "juan.perez@email.com" },
                bio: { type: "string", nullable: true, example: "Vendo barato y seguro." },
                avatarId: { type: "string", format: "uuid", example: "99b3a4f6-8c1d-4b5a-90e8-0d1e2f3a4b5c" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Perfil actualizado con éxito",
        },
        401: {
          description: "No autorizado",
        },
      },
    },
  },
};
