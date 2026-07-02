import { useMemo } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useRiskRepository } from "@/features/risks/presentation/hooks/useRiskRepository";
import { ReportsMockDataSource, ReportsRemoteDataSource, ReportsRepository } from "@/features/reports/data";
import type { IReportsRepository } from "@/features/reports/domain";

/**
 * DI factory reports — meng-compose repository risks (reuse wiring-nya) dengan data source
 * referensi (mock store / Supabase). Presentation memakai tipe `IReportsRepository`.
 */
export const useReportsRepository = (): IReportsRepository => {
  const riskRepo = useRiskRepository();
  return useMemo(
    () =>
      new ReportsRepository(
        riskRepo,
        isSupabaseConfigured ? new ReportsRemoteDataSource(supabase) : new ReportsMockDataSource(),
      ),
    [riskRepo],
  );
};
