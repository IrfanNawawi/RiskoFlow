import type { Risk } from "@/data/types";
import type { IRiskRepository } from "@/features/risks/domain/repositories/IRiskRepository";
import type { NewRiskInput } from "@/features/risks/validation/newRisk.schema";
import type { TreatmentInput } from "@/features/risks/validation/treatment.schema";
import type { ReviewInput } from "@/features/risks/validation/review.schema";
import type { KriInput } from "@/features/risks/validation/kri.schema";
import type { RiskMockDataSource } from "../datasources/RiskMockDataSource";
import { riskListToDomain, riskToDomain } from "../mappers/risk.mapper";

/**
 * Implementasi `IRiskRepository`: gabungkan datasource + mapper. Yang keluar dari
 * sini SELALU entity domain (DTO tidak bocor ke presentation).
 */
export class RiskRepository implements IRiskRepository {
  constructor(private readonly ds: RiskMockDataSource) {}

  async list(): Promise<Risk[]> {
    return riskListToDomain(await this.ds.list());
  }

  async getById(id: string): Promise<Risk | undefined> {
    const dto = await this.ds.getById(id);
    return dto ? (riskToDomain(dto) ?? undefined) : undefined;
  }

  create(input: NewRiskInput): Promise<string> {
    return this.ds.create(input);
  }

  confirmAiSuggested(id: string): Promise<void> {
    return this.ds.confirmAiSuggested(id);
  }

  addTreatment(riskId: string, input: TreatmentInput): Promise<string> {
    return this.ds.addTreatment(riskId, input);
  }

  updateTreatment(riskId: string, treatmentId: string, input: TreatmentInput): Promise<void> {
    return this.ds.updateTreatment(riskId, treatmentId, input);
  }

  approveTreatment(riskId: string, treatmentId: string): Promise<void> {
    return this.ds.approveTreatment(riskId, treatmentId);
  }

  recordReview(riskId: string, input: ReviewInput): Promise<void> {
    return this.ds.recordReview(riskId, input);
  }

  addKri(riskId: string, input: KriInput): Promise<string> {
    return this.ds.addKri(riskId, input);
  }

  updateKri(riskId: string, kriId: string, input: KriInput): Promise<void> {
    return this.ds.updateKri(riskId, kriId, input);
  }

  removeKri(riskId: string, kriId: string): Promise<void> {
    return this.ds.removeKri(riskId, kriId);
  }
}
