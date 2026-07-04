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
          description:
            "Autenticación exitosa. Devuelve access token y setea cookie HttpOnly con refresh token.",
          headers: {
            "Set-Cookie": {
              schema: { type: "string" },
              description: "Cookie refreshToken HttpOnly con duración de 14 días.",
            },
          },
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthResponse" },
            },
          },
        },
        401: {
          description: "Credenciales incorrectas",
        },
      },
    },
  },
  "/api/auth/refresh": {
    post: {
      summary: "Renovar access token",
      tags: ["Autenticación"],
      security: [{ RefreshTokenCookie: [] }],
      description:
        "Usa la cookie HttpOnly `refreshToken` para emitir un nuevo access token. El refresh token dura 14 días y se valida contra su hash persistido.",
      responses: {
        200: {
          description: "Access token renovado con éxito",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthResponse" },
            },
          },
        },
        401: {
          description: "Refresh token ausente, inválido, expirado o revocado",
        },
        429: {
          description: "Demasiadas renovaciones de sesión",
        },
      },
    },
  },
  "/api/auth/logout": {
    post: {
      summary: "Cerrar sesión",
      tags: ["Autenticación"],
      security: [{ RefreshTokenCookie: [] }],
      description:
        "Revoca el refresh token asociado a la cookie actual y limpia la cookie del navegador.",
      responses: {
        200: {
          description: "Sesión cerrada correctamente",
          headers: {
            "Set-Cookie": {
              schema: { type: "string" },
              description: "Cookie refreshToken expirada para limpiar la sesión.",
            },
          },
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", example: "success" },
                  message: { type: "string", example: "Sesion cerrada correctamente" },
                },
              },
            },
          },
        },
        429: {
          description: "Demasiadas acciones realizadas",
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
                avatarId: {
                  type: "string",
                  format: "uuid",
                  example: "99b3a4f6-8c1d-4b5a-90e8-0d1e2f3a4b5c",
                },
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
  "/api/auth/me/avatar": {
    post: {
      summary: "Subir y asignar avatar del usuario autenticado",
      tags: ["Autenticación"],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["file"],
              properties: {
                file: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Avatar actualizado con imagen WebP y placeholder base64",
        },
        400: {
          description: "Archivo ausente o invalido",
        },
        401: {
          description: "No autorizado",
        },
      },
    },
  },
};
