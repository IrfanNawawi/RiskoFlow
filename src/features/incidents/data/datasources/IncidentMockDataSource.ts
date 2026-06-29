import { useStore } from "@/data/store";
import type { NewIncidentInput } from "@/features/incidents/validation/newIncident.schema";
import type { IncidentDTO } from "./incident.dto";

/**
 * Data source mock untuk incidents — membaca/menulis ke Zustand store.
 * ⚠️ Pengganti sementara Supabase; pertahankan signature agar `IncidentRemoteDataSource`
 * bisa menggantikannya tanpa menyentuh repository/presentation.
 */
export class IncidentMockDataSource {
  async list(): Promise<IncidentDTO[]> {
    return useStore.getState().activeIncidents();
  }

  async create(input: NewIncidentInput): Promise<string> {
    return useStore.getState().addIncident({
      ...input,
      description: input.description ?? "",
      riskIds: input.riskIds ?? [],
    });
  }

  async linkRisk(incidentId: string, riskId: string): Promise<void> {
    useStore.getState().linkIncidentRisk(incidentId, riskId);
  }

  async approveClose(incidentId: string): Promise<void> {
    useStore.getState().approveIncidentClose(incidentId);
  }
}
