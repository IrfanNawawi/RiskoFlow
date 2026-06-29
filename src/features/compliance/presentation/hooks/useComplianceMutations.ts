import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/data/store";
import { riskKeys } from "@/features/risks";
import type { ComplianceStatus } from "@/data/types";
import type { ComplianceFormInput } from "@/features/compliance/validation/compliance.schema";
import { useComplianceRepository } from "./useComplianceRepository";
import { complianceKeys } from "./complianceKeys";

/** Tambah requirement custom (FR-COMP-1) → invalidate daftar. Mengembalikan id. */
export const useCreateCompliance = () => {
  const repo = useComplianceRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: (input: ComplianceFormInput) => repo.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: complianceKeys.all(companyId) }),
  });
};

/** Ubah requirement custom (FR-COMP-1) → invalidate daftar. */
export const useUpdateCompliance = () => {
  const repo = useComplianceRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ComplianceFormInput }) => repo.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: complianceKeys.all(companyId) }),
  });
};

/** Hapus requirement custom → invalidate compliance + risks (referensi dibersihkan). */
export const useRemoveCompliance = () => {
  const repo = useComplianceRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: (id: string) => repo.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: complianceKeys.all(companyId) });
      qc.invalidateQueries({ queryKey: riskKeys.all(companyId) });
    },
  });
};

/** Duplikasi requirement (sistem → custom, FR-COMP-6) → invalidate daftar. */
export const useDuplicateCompliance = () => {
  const repo = useComplianceRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: (id: string) => repo.duplicate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: complianceKeys.all(companyId) }),
  });
};

/**
 * Petakan requirement ↔ risiko + status (FR-COMP-2). Karena mapping bersifat dua arah,
 * invalidate cache **compliance dan risks** tenant aktif.
 */
export const useSetComplianceMapping = () => {
  const repo = useComplianceRepository();
  const qc = useQueryClient();
  const companyId = useStore((s) => s.activeCompanyId);
  return useMutation({
    mutationFn: ({ complianceId, riskIds, status }: { complianceId: string; riskIds: string[]; status: ComplianceStatus }) =>
      repo.setMapping(complianceId, riskIds, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: complianceKeys.all(companyId) });
      qc.invalidateQueries({ queryKey: riskKeys.all(companyId) });
    },
  });
};
