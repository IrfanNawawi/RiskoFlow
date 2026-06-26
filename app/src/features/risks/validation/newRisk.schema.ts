import { z } from "zod";

// Schema input form "Risiko Baru" (FR-RISK-1). Pesan error Bahasa Indonesia, dipakai
// react-hook-form via zodResolver. Enum disinkronkan dengan tipe domain di @/data/types.
export const newRiskSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(150, "Maksimal 150 karakter"),
  description: z.string().max(2000, "Deskripsi maksimal 2000 karakter").optional(),
  category: z.enum(["FINANCIAL", "OPERATIONAL", "LEGAL", "REPUTATIONAL", "STRATEGIC"]),
  source: z.enum(["INTERNAL", "EXTERNAL"]),
  departmentId: z.string().min(1, "Departemen wajib dipilih"),
  ownerId: z.string().min(1, "Risk owner wajib dipilih"),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
});

export type NewRiskInput = z.infer<typeof newRiskSchema>;
