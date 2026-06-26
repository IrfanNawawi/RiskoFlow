import type { SupabaseClient } from "@supabase/supabase-js";
import { useStore } from "@/data/store";
import type { Incident } from "@/data/types";
import type { NewIncidentInput } from "@/features/incidents/validation/newIncident.schema";
import type { IncidentDTO } from "./incident.dto";

interface IncidentRow {
  id: string; company_id: string; title: string; description: string; occurred_at: string;
  department_id: string; type: Incident["type"]; loss_amount: number; root_cause: string | null;
  corrective_action: string | null; status: Incident["status"]; approved: boolean | null;
  incident_risks: Array<{ risk_id: string }>;
}

const SELECT = `
  id, company_id, title, description, occurred_at, department_id, type, loss_amount,
  root_cause, corrective_action, status, approved, incident_risks ( risk_id )
`;

function toDTO(row: IncidentRow): IncidentDTO {
  return {
    id: row.id, companyId: row.company_id, title: row.title, description: row.description,
    occurredAt: row.occurred_at, departmentId: row.department_id, type: row.type,
    lossAmount: row.loss_amount, riskIds: row.incident_risks.map((r) => r.risk_id),
    rootCause: row.root_cause ?? undefined, correctiveAction: row.corrective_action ?? undefined,
    status: row.status, approved: row.approved ?? undefined,
  };
}

/**
 * Data source Supabase untuk Incident — signature identik `IncidentMockDataSource`.
 * Insiden ter-link memajukan `next_review_date` risiko via trigger DB (FR-INC-4); gate
 * penutupan kerugian besar ditegakkan trigger DB (FR-INC-6).
 */
export class IncidentRemoteDataSource {
  constructor(private readonly sb: SupabaseClient) {}

  async list(): Promise<IncidentDTO[]> {
    const { data, error } = await this.sb
      .from("incidents").select(SELECT)
      .eq("company_id", useStore.getState().activeCompanyId).is("deleted_at", null);
    if (error) throw error;
    return (data as unknown as IncidentRow[]).map(toDTO);
  }

  async create(input: NewIncidentInput): Promise<string> {
    const id = `inc-${Date.now()}`;
    const { error } = await this.sb.from("incidents").insert({
      id, company_id: useStore.getState().activeCompanyId, title: input.title,
      description: input.description ?? "", occurred_at: input.occurredAt, department_id: input.departmentId,
      type: input.type, loss_amount: input.lossAmount, root_cause: input.rootCause || null,
      corrective_action: input.correctiveAction || null, status: "open",
    });
    if (error) throw error;
    const riskIds = input.riskIds ?? [];
    if (riskIds.length > 0) {
      const { error: jErr } = await this.sb.from("incident_risks")
        .insert(riskIds.map((rid) => ({ incident_id: id, risk_id: rid })));
      if (jErr) throw jErr;
    }
    return id;
  }

  async linkRisk(incidentId: string, riskId: string): Promise<void> {
    // Upsert ke join table agar idempoten (PK gabungan incident_id+risk_id) — FR-INC-2.
    const { error } = await this.sb
      .from("incident_risks")
      .upsert({ incident_id: incidentId, risk_id: riskId }, { onConflict: "incident_id,risk_id" });
    if (error) throw error;
  }

  async approveClose(incidentId: string): Promise<void> {
    // Set approved + closed bersamaan → gate trigger (FR-INC-6) lolos.
    const { error } = await this.sb.from("incidents")
      .update({ approved: true, status: "closed" }).eq("id", incidentId);
    if (error) throw error;
  }
}
