import type { ComplianceRequirement, ComplianceStatus } from "@/data/types";
import type { IComplianceRepository } from "@/features/compliance/domain/repositories/IComplianceRepository";
import type { ComplianceFormInput } from "@/features/compliance/validation/compliance.schema";
import type { ComplianceMockDataSource } from "../datasources/ComplianceMockDataSource";
import { complianceListToDomain } from "../mappers/compliance.mapper";

/** Implementasi `IComplianceRepository`: datasource + mapper. DTO tidak bocor ke presentation. */
export class ComplianceRepository implements IComplianceRepository {
  constructor(private readonly ds: ComplianceMockDataSource) {}

  async list(): Promise<ComplianceRequirement[]> {
    return complianceListToDomain(await this.ds.list());
  }

  create(input: ComplianceFormInput): Promise<string> {
    return this.ds.create(input);
  }

  update(id: string, input: ComplianceFormInput): Promise<void> {
    return this.ds.update(id, input);
  }

  remove(id: string): Promise<void> {
    return this.ds.remove(id);
  }

  duplicate(id: string): Promise<string> {
    return this.ds.duplicate(id);
  }

  setMapping(complianceId: string, riskIds: string[], status: ComplianceStatus): Promise<void> {
    return this.ds.setMapping(complianceId, riskIds, status);
  }
}
