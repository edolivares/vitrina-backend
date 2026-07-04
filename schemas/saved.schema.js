import { z } from "zod";

export const savePostSchema = z.object({
  postId: z
    .string({ required_error: "El postId es obligatorio" })
    .uuid("El postId debe ser un UUID válido"),
});
