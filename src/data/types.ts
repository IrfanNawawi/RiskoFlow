/**
 * Domain types — mirror the RiskoFlow PRD schema (§7) and enums (§9 Decision Log).
 * Financial values are integer Rupiah, never float (PRD constraint).
 */

export type IndustryType = "JASA" | "DAGANG" | "MANUFACTURE";

export type MembershipRole =
  | "admin"
  | "risk_manager"
  | "dept_head"
  | "executive"
  | "compliance";

export type RiskCategory =
  | "FINANCIAL"
  | "OPERATIONAL"
  | "LEGAL"
  | "REPUTATIONAL"
  | "STRATEGIC";

export type RiskSource = "INTERNAL" | "EXTERNAL";

export type RiskStatus =
  | "identified"
  | "assessed"
  | "treated"
  | "monitored"
  | "closed";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

export type TreatmentStrategy = "AVOID" | "REDUCE" | "TRANSFER" | "ACCEPT";
export type TreatmentStatus = "planned" | "in_progress" | "done";

export type IncidentType = "LOSS" | "NEAR_MISS";
export type IncidentStatus = "open" | "investigating" | "closed";

export type ReviewFrequency = "weekly" | "monthly" | "quarterly";

export type ComplianceStatus = "compliant" | "partial" | "non_compliant";

export interface Company {
  id: string;
  name: string;
  industryType: IndustryType;
  employeeCount: number;
  closeApprovalThreshold: number; // IDR; default 50_000_000 (FR-INC-6)
  aiEnabled: boolean;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  headUserId?: string;
  archivedAt?: string; // soft delete (FR-ORG); departemen tetap terekam untuk audit
}

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
}

export interface Membership {
  id: string;
  companyId: string;
  userId: string;
  roles: MembershipRole[]; // D27: multi-role per user per company
}

export interface Assessment {
  likelihood: number; // 1..5
  impact: number; // 1..5
  severity: number; // likelihood * impact (DB-generated in prod)
  level: RiskLevel;
  kind: "inherent" | "residual";
  note?: string;
  financialImpact?: number; // IDR
  at: string;
  by: string;
}

export interface Treatment {
  id: string;
  riskId: string;
  strategy: TreatmentStrategy;
  description: string;
  ownerId: string;
  dueDate: string;
  status: TreatmentStatus;
  cost: number; // IDR integer
  // ACCEPT gate (FR-TREAT-3)
  justification?: string;
  approved?: boolean;
  approvedBy?: string;
  // TRANSFER detail (FR-TREAT-2)
  transferProvider?: string;
  transferPremium?: number;
}

export interface Kri {
  id: string;
  name: string;
  current: string;
  threshold: string;
  ratio: number; // 0..1 for the bar
  breached: boolean;
}

export interface Risk {
  id: string;
  code: string; // e.g. R-014
  companyId: string;
  title: string;
  description: string;
  category: RiskCategory;
  source: RiskSource;
  departmentId: string;
  ownerId: string;
  status: RiskStatus;
  aiSuggested: boolean;
  inherent: Assessment;
  residual?: Assessment;
  reviewFrequency: ReviewFrequency;
  nextReviewDate: string;
  treatments: Treatment[];
  kris: Kri[];
  complianceIds: string[];
  createdAt: string;
  deletedAt?: string;
}

export interface Incident {
  id: string;
  companyId: string;
  title: string;
  description: string;
  occurredAt: string;
  departmentId: string;
  type: IncidentType;
  lossAmount: number; // IDR integer >= 0
  riskIds: string[];
  rootCause?: string;
  correctiveAction?: string;
  status: IncidentStatus;
  approved?: boolean;
}

export interface ComplianceRequirement {
  id: string;
  companyId: string;
  industryType: IndustryType | "GENERAL";
  regulationName: string;
  description: string;
  authority: string;
  isSystem: boolean;
  status: ComplianceStatus;
  progress: number; // 0..100
  linkedRiskIds: string[];
}

export interface AuditEntry {
  id: string;
  companyId: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
}
