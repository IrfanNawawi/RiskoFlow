import type { ComplianceRequirement, ComplianceStatus } from "@/data/types";
import type { ComplianceFormInput } from "@/features/compliance/validation/compliance.schema";

/**
 * Kontrak akses data Compliance milik `domain` (mock store; target Supabase).
 */
export interface IComplianceRepository {
  /** Requirement kepatuhan milik perusahaan aktif (seed + custom). */
  list(): Promise<ComplianceRequirement[]>;
  /** Tambah requirement custom (FR-COMP-1); kembalikan id. */
  create(input: ComplianceFormInput): Promise<string>;
  /** Ubah requirement custom (regulasi sistem read-only — FR-COMP-6). */
  update(id: string, input: ComplianceFormInput): Promise<void>;
  /** Hapus requirement custom + bersihkan referensi di risk. */
  remove(id: string): Promise<void>;
  /** Duplikasi requirement (mis. regulasi sistem) menjadi custom editable (FR-COMP-6). */
  duplicate(id: string): Promise<string>;
  /**
   * Petakan requirement ↔ risiko (m:n) + set status (FR-COMP-2). Implementasi menjaga
   * konsistensi dua arah (`risk.complianceIds` ↔ `requirement.linkedRiskIds`).
   */
  setMapping(complianceId: string, riskIds: string[], status: ComplianceStatus): Promise<void>;
}
