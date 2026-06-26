import { useMemo } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { RiskMockDataSource, RiskRemoteDataSource, RiskRepository } from "@/features/risks/data";
import type { IRiskRepository } from "@/features/risks/domain";

/**
 * DI factory — satu titik wiring `data → domain`. Presentation memakai tipe
 * `IRiskRepository`, tidak pernah tahu implementasi mock/Supabase di baliknya.
 * Memakai Supabase bila env terkonfigurasi; selain itu fallback mock (dev tanpa backend).
 */
export const useRiskRepository = (): IRiskRepository =>
  useMemo(
    () => new RiskRepository(isSupabaseConfigured ? new RiskRemoteDataSource(supabase) : new RiskMockDataSource()),
    [],
  );
