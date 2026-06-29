import { z } from "zod";

// Schema form KRI / Key Risk Indicator (FR-MON-4). `current`/`threshold` string bebas-unit
// (mis. "85%", "12 jt"); rasio & status breach dihitung di store dari angka yang ter-parse.
export const kriSchema = z.object({
  name: z.string().trim().min(2, "Nama indikator wajib diisi").max(100, "Maksimal 100 karakter"),
  current: z.string().trim().min(1, "Nilai saat ini wajib diisi").max(40),
  threshold: z.string().trim().min(1, "Ambang wajib diisi").max(40),
});

export type KriInput = z.infer<typeof kriSchema>;
