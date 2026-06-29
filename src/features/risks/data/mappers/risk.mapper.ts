import { z } from "zod";
import type { Risk } from "@/data/types";
import type { RiskDTO } from "../datasources/risk.dto";

// Skema runtime untuk memvalidasi DTO sebelum jadi entity domain. Data rusak ditolak
// (→ null) agar tidak meracuni agregat/heatmap. Saat sumber = Supabase, skema ini
// menangkap drift skema/bug backend lebih awal.
const assessmentSchema = z.object({
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  severity: z.number().int().min(1).max(25),
  level: z.enum(["LOW", "MEDIUM", "HIGH", "EXTREME"]),
  kind: z.enum(["inherent", "residual"]),
  note: z.string().optional(),
  financialImpact: z.number().optional(),
  at: z.string(),
  by: z.string(),
});

const riskSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  companyId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  category: z.enum(["FINANCIAL", "OPERATIONAL", "LEGAL", "REPUTATIONAL", "STRATEGIC"]),
  source: z.enum(["INTERNAL", "EXTERNAL"]),
  departmentId: z.string().min(1),
  ownerId: z.string().min(1),
  status: z.enum(["identified", "assessed", "treated", "monitored", "closed"]),
  aiSuggested: z.boolean(),
  inherent: assessmentSchema,
  residual: assessmentSchema.optional(),
  reviewFrequency: z.enum(["weekly", "monthly", "quarterly"]),
  nextReviewDate: z.string(),
  treatments: z.array(z.unknown()),
  kris: z.array(z.unknown()),
  complianceIds: z.array(z.string()),
  createdAt: z.string(),
  deletedAt: z.string().optional(),
});

/** Satu DTO → entity domain; bentuk tak valid → `null`. */
export function riskToDomain(dto: RiskDTO): Risk | null {
  const parsed = riskSchema.safeParse(dto);
  return parsed.success ? (dto as Risk) : null;
}

/** Daftar DTO → entity; item rusak difilter diam-diam (tetap render yang sehat). */
export function riskListToDomain(dtos: RiskDTO[]): Risk[] {
  return dtos.map(riskToDomain).filter((r): r is Risk => r !== null);
}
