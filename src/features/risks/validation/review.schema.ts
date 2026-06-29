import { z } from "zod";

// Schema form "Catat Review" (FR-MON-2). likelihood/impact memperbarui penilaian aktif
// (residual bila ada mitigasi, selain itu inherent). Pesan error Bahasa Indonesia.
export const reviewSchema = z.object({
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  status: z.enum(["identified", "assessed", "treated", "monitored", "closed"]),
  reviewFrequency: z.enum(["weekly", "monthly", "quarterly"]),
  note: z.string().max(1000, "Maksimal 1000 karakter").optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
