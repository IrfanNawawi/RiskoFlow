import type { SupabaseClient } from "@supabase/supabase-js";
import { useStore } from "@/data/store";
import type { ComplianceRequirement, ComplianceStatus } from "@/data/types";
import type { ComplianceFormInput } from "@/features/compliance/validation/compliance.schema";
import type { ComplianceDTO } from "./compliance.dto";

interface ComplianceRow {
  id: string; company_id: string; industry_type: ComplianceRequirement["industryType"];
  regulation_name: string; description: string; authority: string; is_system: boolean;
  status: ComplianceStatus; progress: number; risk_compliance: Array<{ risk_id: string }>;
}

const SELECT = `
  id, company_id, industry_type, regulation_name, description, authority, is_system, status, progress,
  risk_compliance ( risk_id )
`;

// Mirror store: progress diturunkan dari status saat tak diisi manual.
const progressOf = (s: ComplianceStatus): number => (s === "compliant" ? 100 : s === "partial" ? 50 : 0);

function toDTO(row: ComplianceRow): ComplianceDTO {
  return {
    id: row.id, companyId: row.company_id, industryType: row.industry_type, regulationName: row.regulation_name,
    description: row.description, authority: row.authority, isSystem: row.is_system, status: row.status,
    progress: row.progress, linkedRiskIds: row.risk_compliance.map((r) => r.risk_id),
  };
}

/** Data source Supabase untuk Compliance — signature identik `ComplianceMockDataSource`. */
export class ComplianceRemoteDataSource {
  constructor(private readonly sb: SupabaseClient) {}

  async list(): Promise<ComplianceDTO[]> {
    const { data, error } = await this.sb
      .from("compliance_requirements").select(SELECT).eq("company_id", useStore.getState().activeCompanyId);
    if (error) throw error;
    return (data as unknown as ComplianceRow[]).map(toDTO);
  }

  async create(input: ComplianceFormInput): Promise<string> {
    const id = `c-${Date.now()}`;
    const { error } = await this.sb.from("compliance_requirements").insert({
      id, company_id: useStore.getState().activeCompanyId, industry_type: input.industryType,
      regulation_name: input.regulationName, description: input.description, authority: input.authority,
      is_system: false, status: input.status, progress: progressOf(input.status),
    });
    if (error) throw error;
    return id;
  }

  async update(id: string, input: ComplianceFormInput): Promise<void> {
    // Regulasi sistem read-only (FR-COMP-6).
    const { error } = await this.sb.from("compliance_requirements").update({
      regulation_name: input.regulationName, description: input.description, authority: input.authority,
      industry_type: input.industryType, status: input.status, progress: progressOf(input.status),
    }).eq("id", id).eq("is_system", false);
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    // risk_compliance ter-cascade saat baris dihapus (FK on delete cascade).
    const { error } = await this.sb.from("compliance_requirements").delete().eq("id", id).eq("is_system", false);
    if (error) throw error;
  }

  async duplicate(id: string): Promise<string> {
    // Salinan jadi custom editable (FR-COMP-6); pemetaan risiko mulai kosong.
    const { data, error } = await this.sb
      .from("compliance_requirements").select(SELECT).eq("id", id).single();
    if (error) throw error;
    const src = toDTO(data as unknown as ComplianceRow);
    const newId = `c-${Date.now()}`;
    const { error: iErr } = await this.sb.from("compliance_requirements").insert({
      id: newId, company_id: src.companyId, industry_type: src.industryType,
      regulation_name: `${src.regulationName} (salinan)`, description: src.description,
      authority: src.authority, is_system: false, status: src.status, progress: src.progress,
    });
    if (iErr) throw iErr;
    return newId;
  }

  async setMapping(complianceId: string, riskIds: string[], status: ComplianceStatus): Promise<void> {
    const { error: dErr } = await this.sb.from("risk_compliance").delete().eq("compliance_id", complianceId);
    if (dErr) throw dErr;
    if (riskIds.length > 0) {
      const { error: iErr } = await this.sb.from("risk_compliance")
        .insert(riskIds.map((rid) => ({ risk_id: rid, compliance_id: complianceId })));
      if (iErr) throw iErr;
    }
    const { error } = await this.sb.from("compliance_requirements").update({ status }).eq("id", complianceId);
    if (error) throw error;
  }
}
