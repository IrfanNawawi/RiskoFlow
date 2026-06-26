import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/data/store";
import { useComplianceRepository } from "./useComplianceRepository";
import { complianceKeys } from "./complianceKeys";

/** Daftar requirement kepatuhan perusahaan aktif (server state → TanStack Query). */
export const useCompliances = () => {
  const repo = useComplianceRepository();
  const companyId = useStore((s) => s.activeCompanyId);
  return useQuery({
    queryKey: complianceKeys.list(companyId),
    queryFn: () => repo.list(),
    staleTime: 60_000,
  });
};
