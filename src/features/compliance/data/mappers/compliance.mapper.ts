import { z } from "zod";
import type { ComplianceRequirement } from "@/data/types";
import type { ComplianceDTO } from "../datasources/compliance.dto";

// Validasi DTO sebelum jadi entity domain; bentuk rusak ditolak agar skor kepatuhan
// & deteksi gap tidak salah hitung.
const complianceSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  industryType: z.enum(["JASA", "DAGANG", "MANUFACTURE", "GENERAL"]),
  regulationName: z.string().min(1),
  description: z.string(),
  authority: z.string(),
  isSystem: z.boolean(),
  status: z.enum(["compliant", "partial", "non_compliant"]),
  progress: z.number().int().min(0).max(100),
  linkedRiskIds: z.array(z.string()),
});

/** Satu DTO → entity domain; bentuk tak valid → `null`. */
export function complianceToDomain(dto: ComplianceDTO): ComplianceRequirement | null {
  return complianceSchema.safeParse(dto).success ? (dto as ComplianceRequirement) : null;
}

/** Daftar DTO → entity; item rusak difilter diam-diam. */
export function complianceListToDomain(dtos: ComplianceDTO[]): ComplianceRequirement[] {
  return dtos.map(complianceToDomain).filter((c): c is ComplianceRequirement => c !== null);
}
