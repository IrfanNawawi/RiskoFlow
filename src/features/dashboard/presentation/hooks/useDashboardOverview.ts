import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/data/store";
import { useDashboardRepository } from "./useDashboardRepository";
import { dashboardKeys } from "./dashboardKeys";

/** Bundel data dashboard perusahaan aktif (server state → TanStack Query). */
export const useDashboardOverview = () => {
  const repo = useDashboardRepository();
  const companyId = useStore((s) => s.activeCompanyId);
  return useQuery({
    queryKey: dashboardKeys.overview(companyId),
    queryFn: () => repo.getOverview(),
    staleTime: 60_000,
  });
};
