import type { IRiskRepository } from "@/features/risks/domain";
import type { IReportsRepository, ReportRegisterData } from "@/features/reports/domain";
import type { ReportsMockDataSource } from "../datasources/ReportsMockDataSource";
import type { ReportsRemoteDataSource } from "../datasources/ReportsRemoteDataSource";

type ReferenceDataSource = ReportsMockDataSource | ReportsRemoteDataSource;

/**
 * Implementasi `IReportsRepository`: daftar risiko di-compose dari repository fitur risks
 * (reuse SELECT/mapper-nya), data referensi (dept/user) dari `ReferenceDataSource`.
 * Yang keluar SELALU entity domain.
 */
export class ReportsRepository implements IReportsRepository {
  constructor(
    private readonly risks: IRiskRepository,
    private readonly reference: ReferenceDataSource,
  ) {}

  async getRegisterData(): Promise<ReportRegisterData> {
    const [risks, ref] = await Promise.all([this.risks.list(), this.reference.getReference()]);
    return { risks, ...ref };
  }
}
