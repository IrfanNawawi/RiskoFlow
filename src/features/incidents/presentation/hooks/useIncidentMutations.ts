import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { approveIncidentClose as approveIncidentCloseUseCase } from "@/features/incidents/domain";
import type { NewIncidentInput } from "@/features/incidents/validation/newIncident.schema";
import { useIncidentRepository } from "./useIncidentRepository";
import { incidentKeys } from "./incidentKeys";

/** Catat insiden baru (FR-INC-1) → invalidate daftar tenant aktif. Mengembalikan id baru. */
export const useCreateIncident = () => {
  const repo = useIncidentRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: (input: NewIncidentInput) => repo.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: incidentKeys.all(companyId) }),
  });
};

/** Tautkan insiden ke risiko (FR-INC-2) → invalidate daftar insiden. */
export const useLinkIncidentRisk = () => {
  const repo = useIncidentRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: ({ incidentId, riskId }: { incidentId: string; riskId: string }) => repo.linkRisk(incidentId, riskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: incidentKeys.all(companyId) }),
  });
};

/** Setujui & tutup insiden besar (FR-INC-6) lewat use-case domain (gate peran) → invalidate. */
export const useApproveIncidentClose = () => {
  const repo = useIncidentRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  const roles = useStore(useShallow((s) => s.myRoles()));
  return useMutation({
    mutationFn: (incidentId: string) => approveIncidentCloseUseCase(repo, roles)(incidentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: incidentKeys.all(companyId) }),
  });
};
