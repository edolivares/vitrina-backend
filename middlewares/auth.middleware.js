import jwt from "jsonwebtoken";
import { config } from "../lib/config.js";

export const authMiddleware = (req, res, next) => {
  try {
    const authorization = req.header("Authorization");

    if (!authorization) {
      return res.status(401).json({ status: "error", message: "Token no proporcionado" });
    }

    const token = authorization.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({ status: "error", message: "Formato de token inválido" });
    }

    jwt.verify(token, config.jwt.secret);
    const decoded = jwt.decode(token);

    if (!decoded) {
      return res.status(401).json({ status: "error", message: "Token inválido" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ status: "error", message: "Token expirado" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ status: "error", message: "Token inválido" });
    }
    console.error("Error en authMiddleware:", error.message);
    res.status(500).json({ status: "error", message: "Error al validar el token" });
  }
};
