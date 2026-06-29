import { useMemo } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { IncidentMockDataSource, IncidentRemoteDataSource, IncidentRepository } from "@/features/incidents/data";
import type { IIncidentRepository } from "@/features/incidents/domain";

/** DI factory — wiring `data → domain`. Supabase bila terkonfigurasi; selain itu fallback mock. */
export const useIncidentRepository = (): IIncidentRepository =>
  useMemo(
    () => new IncidentRepository(isSupabaseConfigured ? new IncidentRemoteDataSource(supabase) : new IncidentMockDataSource()),
    [],
  );
