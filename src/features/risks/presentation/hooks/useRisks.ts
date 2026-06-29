import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/data/store";
import { useRiskRepository } from "./useRiskRepository";
import { riskKeys } from "./riskKeys";

/** Daftar risiko aktif perusahaan aktif (server state → TanStack Query). */
export const useRisks = () => {
  const repo = useRiskRepository();
  const companyId = useStore((s) => s.activeCompanyId);
  return useQuery({
    queryKey: riskKeys.list(companyId),
    queryFn: () => repo.list(),
    staleTime: 60_000,
  });
};

/** Satu risiko by id. */
export const useRisk = (id: string) => {
  const repo = useRiskRepository();
  const companyId = useStore((s) => s.activeCompanyId);
  return useQuery({
    queryKey: riskKeys.detail(companyId, id),
    queryFn: () => repo.getById(id),
    staleTime: 60_000,
  });
};
