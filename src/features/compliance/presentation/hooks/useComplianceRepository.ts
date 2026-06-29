import { useMemo } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { ComplianceMockDataSource, ComplianceRemoteDataSource, ComplianceRepository } from "@/features/compliance/data";
import type { IComplianceRepository } from "@/features/compliance/domain";

/** DI factory — wiring `data → domain`. Supabase bila terkonfigurasi; selain itu fallback mock. */
export const useComplianceRepository = (): IComplianceRepository =>
  useMemo(
    () => new ComplianceRepository(isSupabaseConfigured ? new ComplianceRemoteDataSource(supabase) : new ComplianceMockDataSource()),
    [],
  );
