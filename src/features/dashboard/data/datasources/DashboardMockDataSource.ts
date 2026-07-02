import { useStore } from "@/data/store";
import type { DashboardReferenceDTO } from "./dashboard.dto";

/**
 * Data source referensi dashboard (mock) — membaca Zustand store.
 * ⚠️ Pengganti sementara Supabase; pertahankan signature agar `DashboardRemoteDataSource`
 * bisa menggantikannya tanpa menyentuh repository/presentation.
 */
export class DashboardMockDataSource {
  async getReference(): Promise<DashboardReferenceDTO> {
    const s = useStore.getState();
    const companyId = s.activeCompanyId;
    return {
      // Sertakan departemen terarsip juga: risiko lama bisa menunjuk dept terarsip → nama tetap ter-resolve.
      departments: s.departments.filter((d) => d.companyId === companyId),
      users: s.users,
      company: s.activeCompany(),
    };
  }
}
