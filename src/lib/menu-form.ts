import { z } from "zod";

export const menuFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a burger name")
    .max(120, "Name must be 120 characters or fewer"),
  description: z.string().trim().max(1000, "Description must be 1000 characters or fewer"),
  price: z
    .string()
    .trim()
    .min(1, "Enter a price")
    .refine(
      (value) => Number.isFinite(Number(value)) && Number(value) > 0,
      "Price must be greater than zero",
    )
    .transform(Number),
  available: z.boolean(),
});
