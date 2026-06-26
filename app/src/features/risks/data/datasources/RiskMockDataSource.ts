import { useStore } from "@/data/store";
import type { NewRiskInput } from "@/features/risks/validation/newRisk.schema";
import type { TreatmentInput } from "@/features/risks/validation/treatment.schema";
import type { ReviewInput } from "@/features/risks/validation/review.schema";
import type { KriInput } from "@/features/risks/validation/kri.schema";
import type { RiskDTO } from "./risk.dto";

/**
 * Data source mock — membaca/menulis ke Zustand store (`@/data/store`).
 *
 * ⚠️ Pengganti sementara untuk Supabase. Pertahankan signature method agar saat
 * `RiskRemoteDataSource` (Supabase) menggantikannya, repository & presentation
 * tidak berubah. Async by design supaya kontrak sudah Promise sejak sekarang.
 */
export class RiskMockDataSource {
  async list(): Promise<RiskDTO[]> {
    return useStore.getState().activeRisks();
  }

  async getById(id: string): Promise<RiskDTO | undefined> {
    return useStore.getState().activeRisks().find((r) => r.id === id);
  }

  async create(input: NewRiskInput): Promise<string> {
    return useStore.getState().addRisk({ ...input, description: input.description ?? "" });
  }

  async confirmAiSuggested(id: string): Promise<void> {
    useStore.getState().confirmAiRisk(id);
  }

  async addTreatment(riskId: string, input: TreatmentInput): Promise<string> {
    return useStore.getState().addTreatment(riskId, input);
  }

  async updateTreatment(riskId: string, treatmentId: string, input: TreatmentInput): Promise<void> {
    useStore.getState().updateTreatment(riskId, treatmentId, input);
  }

  async recordReview(riskId: string, input: ReviewInput): Promise<void> {
    useStore.getState().recordReview(riskId, input);
  }

  async addKri(riskId: string, input: KriInput): Promise<string> {
    return useStore.getState().addKri(riskId, input);
  }

  async updateKri(riskId: string, kriId: string, input: KriInput): Promise<void> {
    useStore.getState().updateKri(riskId, kriId, input);
  }

  async removeKri(riskId: string, kriId: string): Promise<void> {
    useStore.getState().removeKri(riskId, kriId);
  }

  async approveTreatment(riskId: string, treatmentId: string): Promise<void> {
    useStore.getState().approveTreatment(riskId, treatmentId);
  }
}
