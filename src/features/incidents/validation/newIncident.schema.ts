import { z } from "zod";

const today = () => new Date().toISOString().slice(0, 10);

// Schema input form "Catat Insiden" (FR-INC-1). Pesan error Bahasa Indonesia, dipakai RHF via
// zodResolver. `lossAmount` = integer Rupiah (≥ 0). Near-miss tidak boleh punya nilai kerugian.
export const newIncidentSchema = z
  .object({
    title: z.string().trim().min(3, "Judul minimal 3 karakter").max(150, "Maksimal 150 karakter"),
    description: z.string().max(2000, "Deskripsi maksimal 2000 karakter").optional(),
    occurredAt: z
      .string()
      .min(1, "Tanggal kejadian wajib diisi")
      .refine((d) => d <= today(), "Tanggal tidak boleh di masa depan"),
    departmentId: z.string().min(1, "Departemen wajib dipilih"),
    type: z.enum(["LOSS", "NEAR_MISS"]),
    lossAmount: z.number().int("Harus bilangan bulat").min(0, "Tidak boleh negatif"),
    riskIds: z.array(z.string()).optional(),
    rootCause: z.string().max(1000).optional(),
    correctiveAction: z.string().max(1000).optional(),
  })
  .refine((v) => v.type !== "NEAR_MISS" || v.lossAmount === 0, {
    path: ["lossAmount"],
    message: "Near-miss tidak memiliki nilai kerugian (harus 0)",
  });

export type NewIncidentInput = z.infer<typeof newIncidentSchema>;
