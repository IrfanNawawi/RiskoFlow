import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/data/store";
import { useReportsRepository } from "./useReportsRepository";
import { reportsKeys } from "./reportsKeys";

/** Data Risk Register perusahaan aktif untuk laporan (server state → TanStack Query). */
export const useReportRegister = () => {
  const repo = useReportsRepository();
  const companyId = useStore((s) => s.activeCompanyId);
  return useQuery({
    queryKey: reportsKeys.register(companyId),
    queryFn: () => repo.getRegisterData(),
    staleTime: 60_000,
  });
};
