import { z } from "zod";

export const updatePostSchema = z.object({
  title: z.string({ required_error: "El título es obligatorio" }).min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string({ required_error: "La descripción es obligatoria" }).min(10, "La descripción debe tener al menos 10 caracteres"),
  price: z.number({ required_error: "El precio es obligatorio" }).nonnegative("El precio no puede ser negativo"),
  cityId: z.number({ required_error: "La comuna/ciudad es obligatoria" }).int("El id de la ciudad debe ser un número entero"),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  condition: z.enum(["NEW", "USED"]).default("USED"),
  status: z.enum(["DRAFT", "PUBLISHED", "SOLD", "ARCHIVED"]).default("PUBLISHED"),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid("El ID provisto debe ser un UUID válido"),
});

export const postIdParamSchema = z.object({
  postId: z.string().uuid("El postId debe ser un UUID válido"),
});
