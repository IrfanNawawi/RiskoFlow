import type { Risk, Department, User } from "@/data/types";

/** Data mentah untuk menyusun laporan Risk Register perusahaan aktif. */
export interface ReportRegisterData {
  /** Risiko aktif (termasuk draft AI; filter via `reportableRisks` di domain). */
  risks: Risk[];
  /** Departemen (termasuk terarsip) & user — untuk resolusi nama pada baris ekspor. */
  departments: Department[];
  users: User[];
}

/**
 * Kontrak akses data reports milik `domain`. Diimplementasikan layer `data`
 * (mock store / Supabase). `presentation` hanya menyentuh interface ini via DI hook.
 */
export interface IReportsRepository {
  getRegisterData(): Promise<ReportRegisterData>;
}
