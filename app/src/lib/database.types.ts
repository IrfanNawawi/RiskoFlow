/**
 * Tipe skema database — REFERENSI.
 *
 * ⚠️ File ini idealnya **ter-generate** dari skema Supabase:
 *
 *   supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 *
 * Versi di bawah ditulis tangan agar mencerminkan `supabase/migrations/*.sql` dan
 * memberi referensi bentuk baris (snake_case) bagi `*RemoteDataSource`. Setelah
 * `gen types` dijalankan, timpa file ini & wire ke `createClient<Database>` di
 * `@/lib/supabase`.
 */

export type IndustryType = "JASA" | "DAGANG" | "MANUFACTURE";
export type MembershipRole = "admin" | "risk_manager" | "dept_head" | "executive" | "compliance";
export type RiskCategory = "FINANCIAL" | "OPERATIONAL" | "LEGAL" | "REPUTATIONAL" | "STRATEGIC";
export type RiskSource = "INTERNAL" | "EXTERNAL";
export type RiskStatus = "identified" | "assessed" | "treated" | "monitored" | "closed";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
export type TreatmentStrategy = "AVOID" | "REDUCE" | "TRANSFER" | "ACCEPT";
export type TreatmentStatus = "planned" | "in_progress" | "done";
export type IncidentType = "LOSS" | "NEAR_MISS";
export type IncidentStatus = "open" | "investigating" | "closed";
export type ReviewFrequency = "weekly" | "monthly" | "quarterly";
export type ComplianceStatus = "compliant" | "partial" | "non_compliant";
export type AssessmentKind = "inherent" | "residual";

/** Bentuk baris tabel (snake_case) — selaras dengan migrations. */
export interface Database {
  public: {
    Tables: {
      companies: Row<{
        id: string;
        name: string;
        industry_type: IndustryType;
        employee_count: number;
        close_approval_threshold: number;
        ai_enabled: boolean;
      }>;
      departments: Row<{
        id: string;
        company_id: string;
        name: string;
        description: string | null;
        head_user_id: string | null;
      }>;
      users: Row<{ id: string; name: string; email: string; initials: string }>;
      memberships: Row<{ id: string; company_id: string; user_id: string; roles: MembershipRole[] }>;
      risks: Row<{
        id: string;
        code: string;
        company_id: string;
        title: string;
        description: string;
        category: RiskCategory;
        source: RiskSource;
        department_id: string;
        owner_id: string;
        status: RiskStatus;
        ai_suggested: boolean;
        review_frequency: ReviewFrequency;
        next_review_date: string;
        created_at: string;
        deleted_at: string | null;
      }>;
      assessments: Row<{
        id: string;
        risk_id: string;
        likelihood: number;
        impact: number;
        severity: number; // generated: likelihood * impact
        level: RiskLevel; // generated via risk_level()
        kind: AssessmentKind;
        note: string | null;
        financial_impact: number | null;
        at: string;
        by: string;
      }>;
      treatments: Row<{
        id: string;
        risk_id: string;
        strategy: TreatmentStrategy;
        description: string;
        owner_id: string;
        due_date: string;
        status: TreatmentStatus;
        cost: number;
        justification: string | null;
        approved: boolean | null;
        approved_by: string | null;
        transfer_provider: string | null;
        transfer_premium: number | null;
      }>;
      kris: Row<{
        id: string;
        risk_id: string;
        name: string;
        current: string;
        threshold: string;
        ratio: number;
        breached: boolean;
      }>;
      incidents: Row<{
        id: string;
        company_id: string;
        title: string;
        description: string;
        occurred_at: string;
        department_id: string;
        type: IncidentType;
        loss_amount: number;
        root_cause: string | null;
        corrective_action: string | null;
        status: IncidentStatus;
        approved: boolean | null;
        deleted_at: string | null;
      }>;
      compliance_requirements: Row<{
        id: string;
        company_id: string;
        industry_type: IndustryType | "GENERAL";
        regulation_name: string;
        description: string;
        authority: string;
        is_system: boolean;
        status: ComplianceStatus;
        progress: number;
      }>;
      audit_entries: Row<{
        id: string;
        company_id: string;
        at: string;
        actor: string;
        action: string;
        entity: string;
        detail: string;
      }>;
      risk_compliance: Row<{ risk_id: string; compliance_id: string }>;
      incident_risks: Row<{ incident_id: string; risk_id: string }>;
    };
  };
}

type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T> };
