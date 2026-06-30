import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { config } from "./lib/config.js";
import { serveSwagger, setupSwagger } from "./lib/swagger.js";
import {
  apiRateLimiter,
  loginRateLimiter,
  mediaRateLimiter,
  privateWriteRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
} from "./middlewares/rate-limit.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import locationRoutes from "./routes/location.routes.js";
import postRoutes from "./routes/posts.routes.js";
import mediaRoutes from "./routes/media.routes.js";
import savedRoutes from "./routes/saved.routes.js";
import messageRoutes from "./routes/messages.routes.js";
import profileRoutes from "./routes/profiles.routes.js";

const app = express();

const corsOptions = {
  origin(origin, callback) {
    if (!origin || config.cors.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error("Origen no permitido por CORS");
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true,
};

// Middlewares
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

// Serve static uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Conditional Swagger UI route
if (config.server.env !== "production") {
  app.use("/api-docs", serveSwagger, setupSwagger);
}

// API Routes
app.use("/api", apiRateLimiter);
app.use("/api/auth/login", loginRateLimiter);
app.use("/api/auth/register", registerRateLimiter);
app.use("/api/auth/refresh", refreshRateLimiter);
app.use("/api/auth/logout", privateWriteRateLimiter);
app.use("/api/media/upload", mediaRateLimiter);
app.use("/api/posts/:postId/media", mediaRateLimiter);
app.use("/api/posts", privateWriteRateLimiter);
app.use("/api/media", privateWriteRateLimiter);
app.use("/api/saved-posts", privateWriteRateLimiter);
app.use("/api/chats", privateWriteRateLimiter);
app.use("/api/auth/me", privateWriteRateLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/saved-posts", savedRoutes);
app.use("/api/chats", messageRoutes);
app.use("/api/profiles", profileRoutes);

// API placeholder route
app.get("/", (req, res) => {
  res.json({
    message: "Bienvenido a la API REST de Vitrina.cl",
    status: "online",
    version: "1.0.0"
  });
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({ message: "Esta ruta no existe" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  if (statusCode === 500) {
    console.error(err.stack);
  }
  const message = statusCode === 500 ? "Error interno del servidor" : err.message;
  res.status(statusCode).json({ message });
});

export default app;
