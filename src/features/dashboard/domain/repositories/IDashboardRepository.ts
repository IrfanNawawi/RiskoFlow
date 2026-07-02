import type { Risk, Incident, Department, User, Company } from "@/data/types";

/**
 * Bundel data mentah dashboard untuk perusahaan aktif. Agregasi/derivasi dilakukan
 * oleh pure function `domain/entities/metrics`, bukan di sini.
 */
export interface DashboardOverview {
  /** Risiko aktif (termasuk draft AI; filter di domain bila perlu). */
  risks: Risk[];
  incidents: Incident[];
  /** Departemen perusahaan (termasuk terarsip) — untuk resolusi nama agenda/kartu. */
  departments: Department[];
  users: User[];
  company: Company;
}

/**
 * Kontrak akses data dashboard milik `domain`. Diimplementasikan layer `data`
 * (mock store / Supabase). `presentation` hanya menyentuh interface ini via DI hook.
 * Semua di-scope ke perusahaan aktif oleh implementasi (multi-tenant).
 */
export interface IDashboardRepository {
  getOverview(): Promise<DashboardOverview>;
}
