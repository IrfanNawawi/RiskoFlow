import type { MembershipRole } from "@/data/types";
import type { IRiskRepository } from "@/features/risks/domain/repositories/IRiskRepository";

/**
 * Business rule (FR-TREAT-3 / D5): hanya `risk_manager` atau `admin` yang boleh
 * menyetujui treatment `ACCEPT`. Di produksi gate ini di-mirror oleh RLS/trigger
 * Postgres (D22); di klien ia menjaga UX + integritas mock store.
 */
export const approveTreatment =
  (repo: IRiskRepository, roles: MembershipRole[]) =>
  (riskId: string, treatmentId: string): Promise<void> => {
    if (!roles.includes("risk_manager") && !roles.includes("admin")) {
      throw new Error("Hanya risk manager atau admin yang dapat menyetujui mitigasi.");
    }
    return repo.approveTreatment(riskId, treatmentId);
  };
