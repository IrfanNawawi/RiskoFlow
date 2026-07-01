import { z } from "zod";

/** Form departemen (FR-ORG). Pesan error Bahasa Indonesia. */
export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80, "Maksimal 80 karakter"),
  description: z.string().trim().max(200, "Maksimal 200 karakter").optional(),
  headUserId: z.string().optional(),
});

export type DepartmentFormInput = z.infer<typeof departmentSchema>;
