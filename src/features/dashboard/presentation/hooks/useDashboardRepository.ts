import { useMemo } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useRiskRepository } from "@/features/risks/presentation/hooks/useRiskRepository";
import { useIncidentRepository } from "@/features/incidents/presentation/hooks/useIncidentRepository";
import { DashboardMockDataSource, DashboardRemoteDataSource, DashboardRepository } from "@/features/dashboard/data";
import type { IDashboardRepository } from "@/features/dashboard/domain";

/**
 * DI factory dashboard — meng-compose repository risks + incidents (reuse wiring mereka)
 * dengan data source referensi (mock store / Supabase). Presentation memakai tipe
 * `IDashboardRepository`, tak tahu implementasi di baliknya.
 */
export const useDashboardRepository = (): IDashboardRepository => {
  const riskRepo = useRiskRepository();
  const incidentRepo = useIncidentRepository();
  return useMemo(
    () =>
      new DashboardRepository(
        riskRepo,
        incidentRepo,
        isSupabaseConfigured ? new DashboardRemoteDataSource(supabase) : new DashboardMockDataSource(),
      ),
    [riskRepo, incidentRepo],
  );
};
