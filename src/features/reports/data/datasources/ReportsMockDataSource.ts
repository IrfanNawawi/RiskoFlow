import { useStore } from "@/data/store";
import type { ReportsReferenceDTO } from "./reports.dto";

/**
 * Data source referensi reports (mock) — membaca Zustand store.
 * ⚠️ Pengganti sementara Supabase; signature dijaga agar `ReportsRemoteDataSource`
 * bisa menggantikannya tanpa menyentuh repository/presentation.
 */
export class ReportsMockDataSource {
  async getReference(): Promise<ReportsReferenceDTO> {
    const s = useStore.getState();
    const companyId = s.activeCompanyId;
    return {
      departments: s.departments.filter((d) => d.companyId === companyId),
      users: s.users,
    };
  }
}
