import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { approveTreatment as approveTreatmentUseCase } from "@/features/risks/domain";
import type { NewRiskInput } from "@/features/risks/validation/newRisk.schema";
import type { TreatmentInput } from "@/features/risks/validation/treatment.schema";
import type { ReviewInput } from "@/features/risks/validation/review.schema";
import type { KriInput } from "@/features/risks/validation/kri.schema";
import { useRiskRepository } from "./useRiskRepository";
import { riskKeys } from "./riskKeys";

/** Buat risiko baru → invalidate daftar tenant aktif. Mengembalikan id baru. */
export const useCreateRisk = () => {
  const repo = useRiskRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: (input: NewRiskInput) => repo.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: riskKeys.all(companyId) }),
  });
};

/** Konfirmasi draft AI (FR-RISK-5) → invalidate daftar + detail. */
export const useConfirmAiRisk = () => {
  const repo = useRiskRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: (id: string) => repo.confirmAiSuggested(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: riskKeys.all(companyId) }),
  });
};

/** Tambah rencana mitigasi (FR-TREAT-1) → invalidate. Mengembalikan id treatment. */
export const useAddTreatment = () => {
  const repo = useRiskRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: ({ riskId, input }: { riskId: string; input: TreatmentInput }) => repo.addTreatment(riskId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: riskKeys.all(companyId) }),
  });
};

/** Ubah rencana mitigasi (FR-TREAT-4) → invalidate. */
export const useUpdateTreatment = () => {
  const repo = useRiskRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: ({ riskId, treatmentId, input }: { riskId: string; treatmentId: string; input: TreatmentInput }) =>
      repo.updateTreatment(riskId, treatmentId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: riskKeys.all(companyId) }),
  });
};

/** Catat review berkala (FR-MON-2) → invalidate. */
export const useRecordReview = () => {
  const repo = useRiskRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: ({ riskId, input }: { riskId: string; input: ReviewInput }) => repo.recordReview(riskId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: riskKeys.all(companyId) }),
  });
};

/** Tambah/ubah/hapus KRI (FR-MON-4) → invalidate. */
export const useAddKri = () => {
  const repo = useRiskRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: ({ riskId, input }: { riskId: string; input: KriInput }) => repo.addKri(riskId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: riskKeys.all(companyId) }),
  });
};

export const useUpdateKri = () => {
  const repo = useRiskRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: ({ riskId, kriId, input }: { riskId: string; kriId: string; input: KriInput }) =>
      repo.updateKri(riskId, kriId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: riskKeys.all(companyId) }),
  });
};

export const useRemoveKri = () => {
  const repo = useRiskRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: ({ riskId, kriId }: { riskId: string; kriId: string }) => repo.removeKri(riskId, kriId),
    onSuccess: () => qc.invalidateQueries({ queryKey: riskKeys.all(companyId) }),
  });
};

/** Setujui treatment ACCEPT lewat use-case domain (gate peran) → invalidate. */
export const useApproveTreatment = () => {
  const repo = useRiskRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  const roles = useStore(useShallow((s) => s.myRoles()));
  return useMutation({
    mutationFn: ({ riskId, treatmentId }: { riskId: string; treatmentId: string }) =>
      approveTreatmentUseCase(repo, roles)(riskId, treatmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: riskKeys.all(companyId) }),
  });
};
