import type { Incident } from "@/data/types";
import type { NewIncidentInput } from "@/features/incidents/validation/newIncident.schema";

/**
 * Kontrak akses data Incident milik `domain` (mock store; target Supabase).
 * Operasi di-scope ke perusahaan aktif oleh implementasi.
 */
export interface IIncidentRepository {
  /** Insiden milik perusahaan aktif. */
  list(): Promise<Incident[]>;
  /** Catat insiden baru (FR-INC-1); kembalikan id-nya. */
  create(input: NewIncidentInput): Promise<string>;
  /** Tautkan insiden ke risiko (FR-INC-2). */
  linkRisk(incidentId: string, riskId: string): Promise<void>;
  /** Tutup insiden kerugian besar (FR-INC-6). Gate peran ada di use-case domain. */
  approveClose(incidentId: string): Promise<void>;
}
