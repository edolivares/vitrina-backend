import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { config } from "./lib/config.js";
import { serveSwagger, setupSwagger } from "./lib/swagger.js";

import authRoutes from "./routes/auth.routes.js";
import locationRoutes from "./routes/location.routes.js";
import postRoutes from "./routes/posts.routes.js";
import mediaRoutes from "./routes/media.routes.js";
import savedRoutes from "./routes/saved.routes.js";

const app = express();

// Middlewares
app.use(cors());
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
app.use("/api/auth", authRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/saved-posts", savedRoutes);

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
  console.error(err.stack);
  res.status(500).json({ message: "Error interno del servidor" });
});

export default app;
