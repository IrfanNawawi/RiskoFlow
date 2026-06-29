import type { SupabaseClient } from "@supabase/supabase-js";
import { useStore } from "@/data/store";
import type { Assessment, Kri, Risk } from "@/data/types";
import type { NewRiskInput } from "@/features/risks/validation/newRisk.schema";
import type { TreatmentInput } from "@/features/risks/validation/treatment.schema";
import type { ReviewInput } from "@/features/risks/validation/review.schema";
import type { KriInput } from "@/features/risks/validation/kri.schema";
import type { RiskDTO } from "./risk.dto";

const REVIEW_DAYS: Record<Risk["reviewFrequency"], number> = { weekly: 7, monthly: 30, quarterly: 90 };
const DAY_MS = 86_400_000;

// Ambil angka dari string ber-unit ("85%" → 85). Cermin dari buildKri di store.
const parseMetric = (s: string): number => parseFloat(s.replace(/[^0-9.-]/g, "")) || 0;
function kriRatioBreach(input: KriInput): { ratio: number; breached: boolean } {
  const cur = parseMetric(input.current);
  const thr = parseMetric(input.threshold);
  return { ratio: thr !== 0 ? Math.min(1, Math.max(0, cur / thr)) : 0, breached: thr !== 0 && cur >= thr };
}

// Bentuk baris Postgres (snake_case) yang dikembalikan embedded select.
interface AssessmentRow {
  likelihood: number; impact: number; severity: number; level: Assessment["level"];
  kind: Assessment["kind"]; note: string | null; financial_impact: number | null; at: string; by: string;
}
interface RiskRow {
  id: string; code: string; company_id: string; title: string; description: string;
  category: Risk["category"]; source: Risk["source"]; department_id: string; owner_id: string;
  status: Risk["status"]; ai_suggested: boolean; review_frequency: Risk["reviewFrequency"];
  next_review_date: string; created_at: string; deleted_at: string | null;
  assessments: AssessmentRow[];
  treatments: Array<Record<string, unknown>>;
  kris: Array<Record<string, unknown>>;
  risk_compliance: Array<{ compliance_id: string }>;
}

const SELECT = `
  id, code, company_id, title, description, category, source, department_id, owner_id,
  status, ai_suggested, review_frequency, next_review_date, created_at, deleted_at,
  assessments ( likelihood, impact, severity, level, kind, note, financial_impact, at, by ),
  treatments ( id, risk_id, strategy, description, owner_id, due_date, status, cost, justification, approved, approved_by, transfer_provider, transfer_premium ),
  kris ( id, name, current, threshold, ratio, breached ),
  risk_compliance ( compliance_id )
`;

function mapAssessment(r: AssessmentRow): Assessment {
  return {
    likelihood: r.likelihood, impact: r.impact, severity: r.severity, level: r.level, kind: r.kind,
    note: r.note ?? undefined, financialImpact: r.financial_impact ?? undefined, at: r.at, by: r.by,
  };
}
// Penilaian aktif = yang terbaru per kind (mirror "penilaian terbaru = nilai aktif", FR-ASSESS-5).
function latest(rows: AssessmentRow[], kind: Assessment["kind"]): Assessment | undefined {
  const m = rows.filter((a) => a.kind === kind).sort((a, b) => b.at.localeCompare(a.at))[0];
  return m ? mapAssessment(m) : undefined;
}

// Baris DB (snake_case + relasi) → DTO berbentuk domain. Pemusatan transform di sini
// menjaga mapper (validator) & presentation tidak berubah.
function toDTO(row: RiskRow): RiskDTO {
  return {
    id: row.id, code: row.code, companyId: row.company_id, title: row.title, description: row.description,
    category: row.category, source: row.source, departmentId: row.department_id, ownerId: row.owner_id,
    status: row.status, aiSuggested: row.ai_suggested,
    inherent: latest(row.assessments, "inherent") ?? {
      likelihood: 1, impact: 1, severity: 1, level: "LOW", kind: "inherent", at: row.created_at, by: row.owner_id,
    },
    residual: latest(row.assessments, "residual"),
    reviewFrequency: row.review_frequency, nextReviewDate: row.next_review_date,
    treatments: row.treatments.map((t) => ({
      id: t.id as string, riskId: t.risk_id as string, strategy: t.strategy as Risk["treatments"][number]["strategy"],
      description: t.description as string, ownerId: t.owner_id as string, dueDate: t.due_date as string,
      status: t.status as Risk["treatments"][number]["status"], cost: t.cost as number,
      justification: (t.justification as string) ?? undefined,
      approved: (t.approved as boolean) ?? undefined, approvedBy: (t.approved_by as string) ?? undefined,
      transferProvider: (t.transfer_provider as string) ?? undefined,
      transferPremium: (t.transfer_premium as number) ?? undefined,
    })),
    kris: row.kris.map((k) => ({
      id: k.id as string, name: k.name as string, current: k.current as string,
      threshold: k.threshold as string, ratio: k.ratio as number, breached: k.breached as boolean,
    })) as Kri[],
    complianceIds: row.risk_compliance.map((rc) => rc.compliance_id),
    createdAt: row.created_at, deletedAt: row.deleted_at ?? undefined,
  };
}

/**
 * Data source Supabase untuk Risk — signature identik `RiskMockDataSource`.
 * Scoping tenant sementara via `activeCompanyId` dari store (auth ditunda); ganti
 * dengan `auth.uid()` + RLS saat auth masuk.
 */
export class RiskRemoteDataSource {
  constructor(private readonly sb: SupabaseClient) {}

  private companyId(): string { return useStore.getState().activeCompanyId; }
  private userId(): string { return useStore.getState().currentUserId; }

  async list(): Promise<RiskDTO[]> {
    const { data, error } = await this.sb
      .from("risks").select(SELECT).eq("company_id", this.companyId()).is("deleted_at", null);
    if (error) throw error;
    return (data as unknown as RiskRow[]).map(toDTO);
  }

  async getById(id: string): Promise<RiskDTO | undefined> {
    const { data, error } = await this.sb.from("risks").select(SELECT).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toDTO(data as unknown as RiskRow) : undefined;
  }

  async create(input: NewRiskInput): Promise<string> {
    const id = `r-${Date.now()}`;
    const { count } = await this.sb
      .from("risks").select("id", { count: "exact", head: true }).eq("company_id", this.companyId());
    const code = `R-${String((count ?? 0) + 80).padStart(3, "0")}`;
    const { error } = await this.sb.from("risks").insert({
      id, code, company_id: this.companyId(), title: input.title, description: input.description ?? "",
      category: input.category, source: input.source, department_id: input.departmentId, owner_id: input.ownerId,
      status: "assessed", ai_suggested: false, review_frequency: "quarterly",
      next_review_date: new Date(Date.now() + 90 * DAY_MS).toISOString(),
    });
    if (error) throw error;
    const { error: aErr } = await this.sb.from("assessments").insert({
      id: `as-${Date.now()}`, risk_id: id, likelihood: input.likelihood, impact: input.impact,
      kind: "inherent", at: new Date().toISOString(), by: this.userId(),
    });
    if (aErr) throw aErr;
    return id;
  }

  async addSuggested(inputs: NewRiskInput[]): Promise<string[]> {
    if (inputs.length === 0) return [];
    const { count } = await this.sb
      .from("risks").select("id", { count: "exact", head: true }).eq("company_id", this.companyId());
    const base = (count ?? 0) + 80;
    const now = Date.now();
    const ids = inputs.map((_, i) => `r-${now}-${i}`);
    // Draft AI (FR-RISK-5): ai_suggested=true, status "identified".
    const { error } = await this.sb.from("risks").insert(
      inputs.map((input, i) => ({
        id: ids[i], code: `R-${String(base + i).padStart(3, "0")}`, company_id: this.companyId(),
        title: input.title, description: input.description ?? "", category: input.category, source: input.source,
        department_id: input.departmentId, owner_id: input.ownerId, status: "identified", ai_suggested: true,
        review_frequency: "quarterly", next_review_date: new Date(now + 90 * DAY_MS).toISOString(),
      })),
    );
    if (error) throw error;
    const { error: aErr } = await this.sb.from("assessments").insert(
      inputs.map((input, i) => ({
        id: `as-${now}-${i}`, risk_id: ids[i], likelihood: input.likelihood, impact: input.impact,
        kind: "inherent", at: new Date().toISOString(), by: this.userId(),
      })),
    );
    if (aErr) throw aErr;
    return ids;
  }

  async confirmAiSuggested(id: string): Promise<void> {
    const { error } = await this.sb.from("risks").update({ ai_suggested: false, status: "assessed" }).eq("id", id);
    if (error) throw error;
  }

  async addTreatment(riskId: string, input: TreatmentInput): Promise<string> {
    const id = `t-${Date.now()}`;
    const { error } = await this.sb.from("treatments").insert({
      id, risk_id: riskId, strategy: input.strategy, description: input.description, owner_id: input.ownerId,
      due_date: input.dueDate, status: input.status, cost: input.cost,
      justification: input.justification || null,
      approved: input.strategy === "ACCEPT" ? false : null, // ACCEPT mulai belum disetujui (FR-TREAT-3)
      transfer_provider: input.transferProvider || null, transfer_premium: input.transferPremium ?? null,
    });
    if (error) throw error;
    // Treatment pertama memajukan status ke "treated" (FR-TREAT-5).
    const { data } = await this.sb.from("risks").select("status").eq("id", riskId).maybeSingle();
    const status = (data as { status?: string } | null)?.status;
    if (status === "identified" || status === "assessed") {
      await this.sb.from("risks").update({ status: "treated" }).eq("id", riskId);
    }
    return id;
  }

  async updateTreatment(_riskId: string, treatmentId: string, input: TreatmentInput): Promise<void> {
    const { data } = await this.sb.from("treatments").select("strategy, approved, approved_by").eq("id", treatmentId).maybeSingle();
    const prev = data as { strategy?: string; approved?: boolean; approved_by?: string } | null;
    // Pertahankan persetujuan bila tetap ACCEPT; reset bila pindah ke/dari ACCEPT.
    const approved = input.strategy === "ACCEPT" ? (prev?.strategy === "ACCEPT" ? (prev?.approved ?? false) : false) : null;
    const approvedBy = input.strategy === "ACCEPT" ? (prev?.approved_by ?? null) : null;
    const { error } = await this.sb.from("treatments").update({
      strategy: input.strategy, description: input.description, owner_id: input.ownerId, due_date: input.dueDate,
      status: input.status, cost: input.cost, justification: input.justification || null,
      approved, approved_by: approvedBy,
      transfer_provider: input.transferProvider || null, transfer_premium: input.transferPremium ?? null,
    }).eq("id", treatmentId);
    if (error) throw error;
  }

  async approveTreatment(_riskId: string, treatmentId: string): Promise<void> {
    const { error } = await this.sb.from("treatments")
      .update({ approved: true, approved_by: this.userId() }).eq("id", treatmentId);
    if (error) throw error;
  }

  async recordReview(riskId: string, input: ReviewInput): Promise<void> {
    const { count } = await this.sb.from("treatments").select("id", { count: "exact", head: true }).eq("risk_id", riskId);
    const kind: Assessment["kind"] = (count ?? 0) > 0 ? "residual" : "inherent";
    const { error: aErr } = await this.sb.from("assessments").insert({
      id: `as-${Date.now()}`, risk_id: riskId, likelihood: input.likelihood, impact: input.impact,
      kind, note: input.note || null, at: new Date().toISOString(), by: this.userId(),
    });
    if (aErr) throw aErr;
    const nextReviewDate = new Date(Date.now() + REVIEW_DAYS[input.reviewFrequency] * DAY_MS).toISOString();
    const { error } = await this.sb.from("risks")
      .update({ review_frequency: input.reviewFrequency, next_review_date: nextReviewDate, status: input.status })
      .eq("id", riskId);
    if (error) throw error;
  }

  async addKri(riskId: string, input: KriInput): Promise<string> {
    const id = `kri-${Date.now()}`;
    const { error } = await this.sb.from("kris").insert({
      id, risk_id: riskId, name: input.name, current: input.current, threshold: input.threshold, ...kriRatioBreach(input),
    });
    if (error) throw error;
    return id;
  }

  async updateKri(_riskId: string, kriId: string, input: KriInput): Promise<void> {
    const { error } = await this.sb.from("kris").update({
      name: input.name, current: input.current, threshold: input.threshold, ...kriRatioBreach(input),
    }).eq("id", kriId);
    if (error) throw error;
  }

  async removeKri(_riskId: string, kriId: string): Promise<void> {
    const { error } = await this.sb.from("kris").delete().eq("id", kriId);
    if (error) throw error;
  }
}
