import { z } from "zod";

// Typed URL search params untuk Risk Register (FR-RISK-2). Nilai dari URL berupa string,
// jadi `l`/`i` (sel heatmap) di-coerce ke angka. Field kosong → undefined (dihapus dari URL).
export const riskSearchSchema = z.object({
  dept: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  level: z.string().optional(),
  l: z.coerce.number().int().min(1).max(5).optional(),
  i: z.coerce.number().int().min(1).max(5).optional(),
});

export type RiskSearch = z.infer<typeof riskSearchSchema>;
