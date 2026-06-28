import swaggerUi from "swagger-ui-express";
import { authPaths } from "../routes/docs/auth.swagger.js";
import { postPaths } from "../routes/docs/posts.swagger.js";
import { locationPaths } from "../routes/docs/locations.swagger.js";
import { mediaPaths } from "../routes/docs/media.swagger.js";
import { savedPaths } from "../routes/docs/saved.swagger.js";
import { messagePaths } from "../routes/docs/messages.swagger.js";
import { profilePaths } from "../routes/docs/profiles.swagger.js";

const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Vitrina REST API",
    version: "1.0.0",
    description: "Documentación de la API REST para el marketplace.",
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Servidor Local de Desarrollo",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Ingresa el token JWT en el formato: `Bearer <token>`",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Post: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          cityId: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          price: { type: "number" },
          latitude: { type: "number", format: "float", nullable: true },
          longitude: { type: "number", format: "float", nullable: true },
          status: { type: "string", enum: ["DRAFT", "PUBLISHED", "SOLD", "ARCHIVED"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Chat: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          postId: { type: "string", format: "uuid" },
          lastMessage: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          chatId: { type: "string", format: "uuid" },
          senderId: { type: "string", format: "uuid" },
          content: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    ...authPaths,
    ...postPaths,
    ...locationPaths,
    ...mediaPaths,
    ...savedPaths,
    ...messagePaths,
    ...profilePaths,
  },
};

export const serveSwagger = swaggerUi.serve;
export const setupSwagger = swaggerUi.setup(openApiSpec);
