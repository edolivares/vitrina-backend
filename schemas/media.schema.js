import { z } from "zod";

export const linkMediaSchema = z.object({
  mediaId: z.string({ required_error: "El mediaId es obligatorio" }).uuid("El mediaId debe ser un UUID válido"),
  sortOrder: z.number().int("El ordenamiento debe ser un número entero").default(0),
});
