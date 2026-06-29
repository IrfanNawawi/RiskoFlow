import type { MembershipRole } from "@/data/types";
import type { IIncidentRepository } from "@/features/incidents/domain/repositories/IIncidentRepository";

/**
 * Business rule (FR-INC-6 / D13): menutup insiden `LOSS` ≥ `close_approval_threshold`
 * wajib approval `risk_manager` (atau `admin`). Di produksi di-mirror trigger Postgres (D22).
 */
export const approveIncidentClose =
  (repo: IIncidentRepository, roles: MembershipRole[]) =>
  (incidentId: string): Promise<void> => {
    if (!roles.includes("risk_manager") && !roles.includes("admin")) {
      throw new Error("Hanya risk manager atau admin yang dapat menyetujui penutupan insiden.");
    }
    return repo.approveClose(incidentId);
  };
