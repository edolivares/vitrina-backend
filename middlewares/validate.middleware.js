import { z } from "zod";

export const validateBody = (schema) => (req, res, next) => {
  try {
    req.validatedBody = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Error de validación",
        details: error.errors.map((e) => e.message),
      });
    }
    next(error);
  }
};

export const validateParams = (schema) => (req, res, next) => {
  try {
    req.validatedParams = schema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Error de validación en parámetros",
        details: error.errors.map((e) => e.message),
      });
    }
    next(error);
  }
};
