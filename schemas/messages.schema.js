import { z } from "zod";

export const chatIdParamSchema = z.object({
  chatId: z.string().uuid("El chatId debe ser un UUID valido"),
});

export const messageBodySchema = z.object({
  content: z
    .string({ required_error: "El mensaje es obligatorio" })
    .min(1, "El mensaje no puede estar vacio")
    .max(1000, "El mensaje no puede superar los 1000 caracteres"),
});
