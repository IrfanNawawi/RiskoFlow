import type { IRiskRepository } from "@/features/risks/domain";
import type { IIncidentRepository } from "@/features/incidents/domain";
import type { IDashboardRepository, DashboardOverview } from "@/features/dashboard/domain";
import type { DashboardMockDataSource } from "../datasources/DashboardMockDataSource";
import type { DashboardRemoteDataSource } from "../datasources/DashboardRemoteDataSource";

type ReferenceDataSource = DashboardMockDataSource | DashboardRemoteDataSource;

/**
 * Implementasi `IDashboardRepository`: meng-agregasi data lintas fitur untuk satu
 * tampilan dashboard. Daftar risiko & insiden di-compose dari repository fitur masing-masing
 * (reuse SELECT/mapper mereka — tidak menduplikasi kueri), data referensi (dept/user/company)
 * dari `ReferenceDataSource`. Yang keluar SELALU entity domain.
 */
export class DashboardRepository implements IDashboardRepository {
  constructor(
    private readonly risks: IRiskRepository,
    private readonly incidents: IIncidentRepository,
    private readonly reference: ReferenceDataSource,
  ) {}

  async getOverview(): Promise<DashboardOverview> {
    const [risks, incidents, ref] = await Promise.all([
      this.risks.list(),
      this.incidents.list(),
      this.reference.getReference(),
    ]);
    return { risks, incidents, ...ref };
  }
}
