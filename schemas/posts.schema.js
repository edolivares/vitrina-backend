import { z } from "zod";

export const updatePostSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    price: z
      .number({ invalid_type_error: "El precio debe ser un número" })
      .nonnegative("El precio no puede ser negativo")
      .optional(),
    cityId: z
      .number({ invalid_type_error: "El id de la ciudad debe ser un número entero" })
      .int("El id de la ciudad debe ser un número entero")
      .optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    condition: z.enum(["NEW", "USED"]).default("USED"),
    status: z.enum(["DRAFT", "PUBLISHED", "SOLD", "ARCHIVED"]).default("PUBLISHED"),
  })
  .superRefine((data, ctx) => {
    if (data.status === "DRAFT") return;

    if (!data.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: "El título es obligatorio",
      });
    } else if (data.title.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: "El título debe tener al menos 3 caracteres",
      });
    }

    if (!data.description) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["description"],
        message: "La descripción es obligatoria",
      });
    } else if (data.description.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["description"],
        message: "La descripción debe tener al menos 10 caracteres",
      });
    }

    if (data.price === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "El precio es obligatorio",
      });
    }

    if (data.cityId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cityId"],
        message: "La comuna/ciudad es obligatoria",
      });
    }
  })
  .transform((data) => ({
    ...data,
    title: data.status === "DRAFT" ? data.title || "Sin Título" : data.title,
    description: data.status === "DRAFT" ? data.description || "" : data.description,
    price: data.status === "DRAFT" ? (data.price ?? 0) : data.price,
  }));

export const uuidParamSchema = z.object({
  id: z.string().uuid("El ID provisto debe ser un UUID válido"),
});

export const postIdParamSchema = z.object({
  postId: z.string().uuid("El postId debe ser un UUID válido"),
});
