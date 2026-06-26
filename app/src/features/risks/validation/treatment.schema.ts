import { z } from "zod";

// Schema input form mitigasi (FR-TREAT-1..4). Pesan error Bahasa Indonesia, dipakai RHF.
// `cost`/`transferPremium` = integer Rupiah. Aturan kondisional via superRefine.
export const treatmentSchema = z
  .object({
    strategy: z.enum(["AVOID", "REDUCE", "TRANSFER", "ACCEPT"]),
    description: z.string().trim().min(3, "Deskripsi minimal 3 karakter").max(300, "Maksimal 300 karakter"),
    ownerId: z.string().min(1, "PIC wajib dipilih"),
    dueDate: z.string().min(1, "Tenggat wajib diisi"),
    status: z.enum(["planned", "in_progress", "done"]),
    cost: z.number().int("Harus bilangan bulat").min(0, "Tidak boleh negatif"),
    justification: z.string().max(500, "Maksimal 500 karakter").optional(),
    transferProvider: z.string().max(150, "Maksimal 150 karakter").optional(),
    transferPremium: z.number().int("Harus bilangan bulat").min(0, "Tidak boleh negatif").optional(),
  })
  .superRefine((v, ctx) => {
    if (v.strategy === "ACCEPT" && !v.justification?.trim()) {
      ctx.addIssue({ path: ["justification"], code: "custom", message: "Justifikasi wajib untuk strategi Terima (ACCEPT)" });
    }
    if (v.strategy === "TRANSFER" && !v.transferProvider?.trim()) {
      ctx.addIssue({ path: ["transferProvider"], code: "custom", message: "Penyedia transfer wajib diisi" });
    }
  });

export type TreatmentInput = z.infer<typeof treatmentSchema>;
