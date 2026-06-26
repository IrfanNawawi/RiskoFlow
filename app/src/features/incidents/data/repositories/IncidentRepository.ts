import type { Incident } from "@/data/types";
import type { IIncidentRepository } from "@/features/incidents/domain/repositories/IIncidentRepository";
import type { NewIncidentInput } from "@/features/incidents/validation/newIncident.schema";
import type { IncidentMockDataSource } from "../datasources/IncidentMockDataSource";
import { incidentListToDomain } from "../mappers/incident.mapper";

/** Implementasi `IIncidentRepository`: datasource + mapper. DTO tidak bocor ke presentation. */
export class IncidentRepository implements IIncidentRepository {
  constructor(private readonly ds: IncidentMockDataSource) {}

  async list(): Promise<Incident[]> {
    return incidentListToDomain(await this.ds.list());
  }

  create(input: NewIncidentInput): Promise<string> {
    return this.ds.create(input);
  }

  linkRisk(incidentId: string, riskId: string): Promise<void> {
    return this.ds.linkRisk(incidentId, riskId);
  }

  approveClose(incidentId: string): Promise<void> {
    return this.ds.approveClose(incidentId);
  }
}
