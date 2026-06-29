import { z } from "zod";

// Schema form CRUD requirement kepatuhan custom (FR-COMP-1). Pesan error Bahasa Indonesia.
export const complianceFormSchema = z.object({
  regulationName: z.string().trim().min(2, "Nama regulasi wajib diisi").max(150, "Maksimal 150 karakter"),
  description: z.string().trim().min(3, "Deskripsi minimal 3 karakter").max(500, "Maksimal 500 karakter"),
  authority: z.string().trim().min(2, "Otoritas wajib diisi").max(100, "Maksimal 100 karakter"),
  industryType: z.enum(["JASA", "DAGANG", "MANUFACTURE", "GENERAL"]),
  status: z.enum(["compliant", "partial", "non_compliant"]),
});

export type ComplianceFormInput = z.infer<typeof complianceFormSchema>;
