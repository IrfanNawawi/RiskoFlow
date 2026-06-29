import { z } from "zod";
import type { Incident } from "@/data/types";
import type { IncidentDTO } from "../datasources/incident.dto";

// Validasi DTO sebelum jadi entity domain; bentuk rusak ditolak agar tidak meracuni agregat
// (total kerugian, jumlah insiden) di dashboard.
const incidentSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  occurredAt: z.string(),
  departmentId: z.string().min(1),
  type: z.enum(["LOSS", "NEAR_MISS"]),
  lossAmount: z.number().int().min(0),
  riskIds: z.array(z.string()),
  rootCause: z.string().optional(),
  correctiveAction: z.string().optional(),
  status: z.enum(["open", "investigating", "closed"]),
  approved: z.boolean().optional(),
});

/** Satu DTO → entity domain; bentuk tak valid → `null`. */
export function incidentToDomain(dto: IncidentDTO): Incident | null {
  return incidentSchema.safeParse(dto).success ? (dto as Incident) : null;
}

/** Daftar DTO → entity; item rusak difilter diam-diam. */
export function incidentListToDomain(dtos: IncidentDTO[]): Incident[] {
  return dtos.map(incidentToDomain).filter((i): i is Incident => i !== null);
}
