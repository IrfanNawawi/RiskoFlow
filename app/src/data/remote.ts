/* eslint-disable @typescript-eslint/no-explicit-any -- baris Supabase tak bertipe; dipetakan ke domain di sini */
import { supabase } from "@/lib/supabase";
import type {
  Assessment, AuditEntry, Company, ComplianceRequirement, Department,
  Incident, Kri, Membership, Risk, Treatment, User,
} from "./types";

/** Query key snapshot store — di-invalidate tiap mutasi sukses (lihat main.tsx). */
export const SNAPSHOT_KEY = ["remote-snapshot"] as const;

/**
 * Snapshot lengkap dari Supabase untuk menghidrasi Zustand store.
 *
 * ⚠️ Auth ditunda: snapshot diambil lintas tenant (RLS permissive); store memfilter
 * per `activeCompanyId` di selector seperti biasa. Saat auth masuk, batasi ke
 * perusahaan milik user (auth.uid() + membership) lewat RLS.
 */
export interface HydrationData {
  users: User[];
  companies: Company[];
  memberships: Membership[];
  departments: Department[];
  risks: Risk[];
  incidents: Incident[];
  compliance: ComplianceRequirement[];
  audit: AuditEntry[];
}

// ── helpers pemetaan baris (snake_case) → entity domain ──
interface AssessmentRow {
  likelihood: number; impact: number; severity: number; level: Assessment["level"];
  kind: Assessment["kind"]; note: string | null; financial_impact: number | null; at: string; by: string;
}
const mapAssessment = (r: AssessmentRow): Assessment => ({
  likelihood: r.likelihood, impact: r.impact, severity: r.severity, level: r.level, kind: r.kind,
  note: r.note ?? undefined, financialImpact: r.financial_impact ?? undefined, at: r.at, by: r.by,
});
const latest = (rows: AssessmentRow[], kind: Assessment["kind"]): Assessment | undefined => {
  const m = rows.filter((a) => a.kind === kind).sort((a, b) => b.at.localeCompare(a.at))[0];
  return m ? mapAssessment(m) : undefined;
};

const RISK_SELECT = `
  id, code, company_id, title, description, category, source, department_id, owner_id,
  status, ai_suggested, review_frequency, next_review_date, created_at, deleted_at,
  assessments ( likelihood, impact, severity, level, kind, note, financial_impact, at, by ),
  treatments ( id, risk_id, strategy, description, owner_id, due_date, status, cost, justification, approved, approved_by, transfer_provider, transfer_premium ),
  kris ( id, name, current, threshold, ratio, breached ),
  risk_compliance ( compliance_id )
`;

function mapRisk(row: any): Risk {
  return {
    id: row.id, code: row.code, companyId: row.company_id, title: row.title, description: row.description,
    category: row.category, source: row.source, departmentId: row.department_id, ownerId: row.owner_id,
    status: row.status, aiSuggested: row.ai_suggested,
    inherent: latest(row.assessments ?? [], "inherent") ?? {
      likelihood: 1, impact: 1, severity: 1, level: "LOW", kind: "inherent", at: row.created_at, by: row.owner_id,
    },
    residual: latest(row.assessments ?? [], "residual"),
    reviewFrequency: row.review_frequency, nextReviewDate: row.next_review_date,
    treatments: (row.treatments ?? []).map((t: any): Treatment => ({
      id: t.id, riskId: t.risk_id, strategy: t.strategy, description: t.description, ownerId: t.owner_id,
      dueDate: t.due_date, status: t.status, cost: t.cost, justification: t.justification ?? undefined,
      approved: t.approved ?? undefined, approvedBy: t.approved_by ?? undefined,
      transferProvider: t.transfer_provider ?? undefined, transferPremium: t.transfer_premium ?? undefined,
    })),
    kris: (row.kris ?? []).map((k: any): Kri => ({
      id: k.id, name: k.name, current: k.current, threshold: k.threshold, ratio: k.ratio, breached: k.breached,
    })),
    complianceIds: (row.risk_compliance ?? []).map((rc: any) => rc.compliance_id),
    createdAt: row.created_at, deletedAt: row.deleted_at ?? undefined,
  };
}

function mapCompany(c: any): Company {
  return { id: c.id, name: c.name, industryType: c.industry_type, employeeCount: c.employee_count,
    closeApprovalThreshold: c.close_approval_threshold, aiEnabled: c.ai_enabled };
}
function mapDepartment(d: any): Department {
  return { id: d.id, companyId: d.company_id, name: d.name, description: d.description ?? undefined, headUserId: d.head_user_id ?? undefined };
}
function mapIncident(i: any): Incident {
  return { id: i.id, companyId: i.company_id, title: i.title, description: i.description, occurredAt: i.occurred_at,
    departmentId: i.department_id, type: i.type, lossAmount: i.loss_amount, riskIds: (i.incident_risks ?? []).map((r: any) => r.risk_id),
    rootCause: i.root_cause ?? undefined, correctiveAction: i.corrective_action ?? undefined, status: i.status, approved: i.approved ?? undefined };
}
function mapCompliance(c: any): ComplianceRequirement {
  return { id: c.id, companyId: c.company_id, industryType: c.industry_type, regulationName: c.regulation_name,
    description: c.description, authority: c.authority, isSystem: c.is_system, status: c.status, progress: c.progress,
    linkedRiskIds: (c.risk_compliance ?? []).map((rc: any) => rc.risk_id) };
}
function mapMembership(m: any): Membership {
  return { id: m.id, companyId: m.company_id, userId: m.user_id, roles: m.roles ?? [] };
}
function mapAudit(a: any): AuditEntry {
  return { id: a.id, companyId: a.company_id, at: a.at, actor: a.actor, action: a.action, entity: a.entity, detail: a.detail };
}

const must = <T>(res: { data: T | null; error: unknown }): T => {
  if (res.error) throw res.error;
  return (res.data ?? []) as T;
};

/** Ambil seluruh data dari Supabase lalu petakan ke bentuk domain (untuk hidrasi store). */
export async function fetchSnapshot(): Promise<HydrationData> {
  const [users, companies, memberships, departments, risks, incidents, compliance, audit] = await Promise.all([
    supabase.from("users").select("*"),
    supabase.from("companies").select("*"),
    supabase.from("memberships").select("*"),
    supabase.from("departments").select("*"),
    supabase.from("risks").select(RISK_SELECT).is("deleted_at", null),
    supabase.from("incidents").select("*, incident_risks ( risk_id )").is("deleted_at", null),
    supabase.from("compliance_requirements").select("*, risk_compliance ( risk_id )"),
    supabase.from("audit_entries").select("*").order("at", { ascending: false }),
  ]);

  return {
    users: must<User[]>(users),
    companies: must<any[]>(companies).map(mapCompany),
    memberships: must<any[]>(memberships).map(mapMembership),
    departments: must<any[]>(departments).map(mapDepartment),
    risks: must<any[]>(risks).map(mapRisk),
    incidents: must<any[]>(incidents).map(mapIncident),
    compliance: must<any[]>(compliance).map(mapCompliance),
    audit: must<any[]>(audit).map(mapAudit),
  };
}
