import { useStore } from "@/data/store";
import type { ComplianceStatus } from "@/data/types";
import type { ComplianceFormInput } from "@/features/compliance/validation/compliance.schema";
import type { ComplianceDTO } from "./compliance.dto";

/**
 * Data source mock untuk compliance — membaca Zustand store.
 * ⚠️ Pengganti sementara Supabase; pertahankan signature untuk `ComplianceRemoteDataSource`.
 */
export class ComplianceMockDataSource {
  async list(): Promise<ComplianceDTO[]> {
    return useStore.getState().activeCompliance();
  }

  async create(input: ComplianceFormInput): Promise<string> {
    return useStore.getState().addCompliance(input);
  }

  async update(id: string, input: ComplianceFormInput): Promise<void> {
    useStore.getState().updateCompliance(id, input);
  }

  async remove(id: string): Promise<void> {
    useStore.getState().removeCompliance(id);
  }

  async duplicate(id: string): Promise<string> {
    return useStore.getState().duplicateCompliance(id);
  }

  async setMapping(complianceId: string, riskIds: string[], status: ComplianceStatus): Promise<void> {
    useStore.getState().setComplianceMapping(complianceId, riskIds, status);
  }
}
