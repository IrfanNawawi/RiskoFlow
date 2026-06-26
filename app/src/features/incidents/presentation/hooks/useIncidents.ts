import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/data/store";
import { useIncidentRepository } from "./useIncidentRepository";
import { incidentKeys } from "./incidentKeys";

/** Daftar insiden perusahaan aktif (server state → TanStack Query). */
export const useIncidents = () => {
  const repo = useIncidentRepository();
  const companyId = useStore((s) => s.activeCompanyId);
  return useQuery({
    queryKey: incidentKeys.list(companyId),
    queryFn: () => repo.list(),
    staleTime: 60_000,
  });
};
