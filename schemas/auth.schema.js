import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z
    .string({ required_error: "El correo electrónico es obligatorio" })
    .email("Correo electrónico no válido"),
  password: z
    .string({ required_error: "La contraseña es obligatoria" })
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "El correo electrónico es obligatorio" })
    .email("Correo electrónico no válido"),
  password: z
    .string({ required_error: "La contraseña es obligatoria" })
    .min(1, "La contraseña es obligatoria"),
});

export const updateProfileSchema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
    bio: z
      .string()
      .max(280, "La descripcion no puede superar los 280 caracteres")
      .refine((bio) => bio.split(/\r\n|\r|\n/).length <= 5, {
        message: "La bio no puede superar las 5 lineas",
      })
      .nullable()
      .optional(),
    avatarId: z.string().uuid("El id del avatar debe ser un UUID válido").nullable().optional(),
  })
  .strict();
