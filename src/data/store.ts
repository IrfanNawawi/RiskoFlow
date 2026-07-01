import { create } from "zustand";
import { computeRiskLevel, severityScore } from "@/lib/risk";
import * as seed from "./seed";
import type { HydrationData } from "./remote";
import type {
  Assessment,
  AuditEntry,
  Company,
  ComplianceRequirement,
  Department,
  Incident,
  IndustryType,
  Kri,
  Membership,
  MembershipRole,
  Risk,
  Treatment,
  User,
} from "./types";

interface NewRiskInput {
  title: string;
  description: string;
  category: Risk["category"];
  source: Risk["source"];
  departmentId: string;
  ownerId: string;
  likelihood: number;
  impact: number;
}

interface TreatmentInput {
  strategy: Treatment["strategy"];
  description: string;
  ownerId: string;
  dueDate: string;
  status: Treatment["status"];
  cost: number;
  justification?: string;
  transferProvider?: string;
  transferPremium?: number;
}

interface KriInput {
  name: string;
  current: string;
  threshold: string;
}

// Ambil angka dari string ber-unit ("85%" → 85). Tak ada angka → 0.
const parseMetric = (s: string): number => parseFloat(s.replace(/[^0-9.-]/g, "")) || 0;

// Bangun KRI: rasio bar (0..1) & status breach (asumsi makin tinggi makin buruk).
function buildKri(id: string, input: KriInput): Kri {
  const cur = parseMetric(input.current);
  const thr = parseMetric(input.threshold);
  return {
    id,
    name: input.name,
    current: input.current,
    threshold: input.threshold,
    ratio: thr !== 0 ? Math.min(1, Math.max(0, cur / thr)) : 0,
    breached: thr !== 0 && cur >= thr,
  };
}

interface DepartmentInput {
  name: string;
  description?: string;
  headUserId?: string;
}

interface InviteMemberInput {
  name: string;
  email: string;
  roles: MembershipRole[];
}

/** Hasil aksi org yang bergerbang (guard DB di target); UI pakai `reason` untuk toast. */
export type OrgResult = { ok: true } | { ok: false; reason: string };

interface ReviewInput {
  likelihood: number;
  impact: number;
  status: Risk["status"];
  reviewFrequency: Risk["reviewFrequency"];
  note?: string;
}

const REVIEW_DAYS: Record<Risk["reviewFrequency"], number> = { weekly: 7, monthly: 30, quarterly: 90 };

interface ComplianceFormInput {
  regulationName: string;
  description: string;
  authority: string;
  industryType: ComplianceRequirement["industryType"];
  status: ComplianceRequirement["status"];
}

interface NewIncidentInput {
  title: string;
  description: string;
  occurredAt: string;
  departmentId: string;
  type: Incident["type"];
  lossAmount: number;
  riskIds: string[];
  rootCause?: string;
  correctiveAction?: string;
}

interface State {
  users: User[];
  companies: Company[];
  memberships: Membership[];
  departments: Department[];
  risks: Risk[];
  incidents: Incident[];
  compliance: ComplianceRequirement[];
  audit: AuditEntry[];

  currentUserId: string;
  activeCompanyId: string;
  onboarded: boolean;
  hydrated: boolean; // true setelah store dihidrasi dari Supabase (atau saat memakai seed mock)

  // selectors
  activeCompany: () => Company;
  myRoles: () => MembershipRole[];
  myCompanies: () => Company[];
  can: (action: "edit" | "approve" | "admin") => boolean;
  userById: (id: string) => User | undefined;
  deptById: (id: string) => Department | undefined;
  activeDepartments: () => Department[];
  activeMembers: () => Array<{ membershipId: string; user: User; roles: MembershipRole[] }>;
  activeRisks: () => Risk[];
  activeIncidents: () => Incident[];
  activeCompliance: () => ComplianceRequirement[];
  activeAudit: () => AuditEntry[];

  // actions
  // FR-ORG: departemen & anggota (mock; guard ditiru dari trigger DB target)
  addDepartment: (input: DepartmentInput) => OrgResult;
  updateDepartment: (id: string, input: DepartmentInput) => OrgResult;
  archiveDepartment: (id: string) => OrgResult;
  inviteMember: (input: InviteMemberInput) => OrgResult;
  updateMemberRoles: (userId: string, roles: MembershipRole[]) => OrgResult;
  removeMember: (userId: string) => OrgResult;

  setActiveCompany: (id: string) => void;
  setRole: (role: MembershipRole | "all") => void; // demo role impersonation
  demoRole: MembershipRole | "all";
  toggleAi: () => void;
  addRisk: (input: NewRiskInput) => string;
  addAiSuggestedRisks: (inputs: NewRiskInput[]) => string[];
  confirmAiRisk: (riskId: string) => void;
  addTreatment: (riskId: string, input: TreatmentInput) => string;
  updateTreatment: (riskId: string, treatmentId: string, input: TreatmentInput) => void;
  approveTreatment: (riskId: string, treatmentId: string) => void;
  recordReview: (riskId: string, input: ReviewInput) => void;
  addKri: (riskId: string, input: KriInput) => string;
  updateKri: (riskId: string, kriId: string, input: KriInput) => void;
  removeKri: (riskId: string, kriId: string) => void;
  addIncident: (input: NewIncidentInput) => string;
  linkIncidentRisk: (incidentId: string, riskId: string) => void;
  approveIncidentClose: (incidentId: string) => void;
  setComplianceMapping: (complianceId: string, riskIds: string[], status: ComplianceRequirement["status"]) => void;
  addCompliance: (input: ComplianceFormInput) => string;
  updateCompliance: (id: string, input: ComplianceFormInput) => void;
  removeCompliance: (id: string) => void;
  duplicateCompliance: (id: string) => string;
  createCompanyWithAdmin: (input: {
    name: string;
    industryType: IndustryType;
    employeeCount: number;
    departments: string[];
  }) => void;
  /** Ganti seluruh data store dengan snapshot Supabase (lihat `@/data/remote`). */
  hydrate: (data: HydrationData) => void;
}

function logAudit(get: () => State, entry: Omit<AuditEntry, "id" | "at" | "companyId">): AuditEntry {
  return {
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    companyId: get().activeCompanyId,
    ...entry,
  };
}

const GENERAL_SEED = [
  { regulationName: "ISO 31000:2018", description: "Kerangka & proses manajemen risiko.", authority: "ISO", industryType: "GENERAL" as const },
  { regulationName: "Prinsip GCG", description: "Tata kelola perusahaan yang baik.", authority: "KNKG", industryType: "GENERAL" as const },
];

const INDUSTRY_SEED: Record<IndustryType, Array<{ regulationName: string; description: string; authority: string }>> = {
  MANUFACTURE: [
    { regulationName: "UU No. 1/1970", description: "Keselamatan Kerja.", authority: "Pemerintah RI" },
    { regulationName: "PP No. 50/2012 (SMK3)", description: "Sistem Manajemen K3.", authority: "Kemnaker" },
    { regulationName: "PP No. 22/2021", description: "PPLH + limbah B3.", authority: "KLHK" },
    { regulationName: "UU No. 33/2014", description: "Jaminan Produk Halal.", authority: "BPJPH" },
  ],
  DAGANG: [
    { regulationName: "UU No. 7/2014", description: "Perdagangan.", authority: "Kemendag" },
    { regulationName: "UU No. 8/1999", description: "Perlindungan Konsumen.", authority: "Pemerintah RI" },
    { regulationName: "Perizinan OSS/NIB", description: "Perizinan berusaha.", authority: "BKPM/OSS" },
    { regulationName: "UU No. 27/2022", description: "Pelindungan Data Pribadi.", authority: "Kominfo" },
  ],
  JASA: [
    { regulationName: "UU Ketenagakerjaan jo. UU Cipta Kerja", description: "Hubungan kerja.", authority: "Kemnaker" },
    { regulationName: "UU No. 8/1999", description: "Perlindungan Konsumen.", authority: "Pemerintah RI" },
    { regulationName: "UU No. 27/2022", description: "Pelindungan Data Pribadi.", authority: "Kominfo" },
    { regulationName: "ISO/IEC 27001", description: "Keamanan informasi (sukarela).", authority: "ISO" },
  ],
};

export const useStore = create<State>((set, get) => ({
  users: seed.users,
  companies: [seed.company, seed.company2],
  memberships: seed.memberships,
  departments: seed.departments,
  risks: seed.risks,
  incidents: seed.incidents,
  compliance: seed.compliance,
  audit: seed.audit,

  currentUserId: seed.currentUserId,
  activeCompanyId: seed.company.id,
  onboarded: true,
  hydrated: false,
  demoRole: "all",

  activeCompany: () => {
    const { companies, activeCompanyId } = get();
    return companies.find((c) => c.id === activeCompanyId) ?? companies[0];
  },
  myRoles: () => {
    const { memberships, currentUserId, activeCompanyId, demoRole } = get();
    const m = memberships.find((x) => x.userId === currentUserId && x.companyId === activeCompanyId);
    const roles = m?.roles ?? [];
    if (demoRole !== "all") return roles.includes(demoRole) ? [demoRole] : [demoRole];
    return roles;
  },
  myCompanies: () => {
    const { memberships, companies, currentUserId } = get();
    const ids = new Set(memberships.filter((m) => m.userId === currentUserId).map((m) => m.companyId));
    return companies.filter((c) => ids.has(c.id));
  },
  can: (action) => {
    const roles = get().myRoles();
    if (action === "admin") return roles.includes("admin");
    if (action === "approve") return roles.includes("admin") || roles.includes("risk_manager");
    // edit
    return roles.some((r) => r === "admin" || r === "risk_manager" || r === "dept_head" || r === "compliance");
  },
  userById: (id) => get().users.find((u) => u.id === id),
  deptById: (id) => get().departments.find((d) => d.id === id),
  activeDepartments: () => get().departments.filter((d) => d.companyId === get().activeCompanyId && !d.archivedAt),
  activeMembers: () => {
    const { memberships, activeCompanyId, users } = get();
    return memberships
      .filter((m) => m.companyId === activeCompanyId)
      .map((m) => ({ membershipId: m.id, user: users.find((u) => u.id === m.userId)!, roles: m.roles }))
      .filter((x) => x.user); // buang membership tanpa user (data tak konsisten)
  },
  activeRisks: () => get().risks.filter((r) => r.companyId === get().activeCompanyId && !r.deletedAt),
  activeIncidents: () => get().incidents.filter((i) => i.companyId === get().activeCompanyId),
  activeCompliance: () => get().compliance.filter((c) => c.companyId === get().activeCompanyId),
  activeAudit: () => get().audit.filter((a) => a.companyId === get().activeCompanyId),

  setActiveCompany: (id) => set({ activeCompanyId: id, demoRole: "all" }),
  setRole: (role) => set({ demoRole: role }),
  toggleAi: () =>
    set((s) => ({
      companies: s.companies.map((c) =>
        c.id === s.activeCompanyId ? { ...c, aiEnabled: !c.aiEnabled } : c,
      ),
    })),

  addDepartment: (input) => {
    const name = input.name.trim();
    const cid = get().activeCompanyId;
    if (!name) return { ok: false, reason: "Nama departemen wajib diisi" };
    const dup = get().departments.some(
      (d) => d.companyId === cid && !d.archivedAt && d.name.toLowerCase() === name.toLowerCase(),
    );
    if (dup) return { ok: false, reason: `Departemen "${name}" sudah ada` };
    const dept: Department = {
      id: `d-${cid}-${Date.now()}`,
      companyId: cid,
      name,
      description: input.description?.trim() || undefined,
      headUserId: input.headUserId || undefined,
    };
    set((s) => ({
      departments: [...s.departments, dept],
      audit: [logAudit(get, { actor: nameOf(get), action: "CREATE", entity: `Department ${name}`, detail: `Departemen "${name}" dibuat` }), ...s.audit],
    }));
    return { ok: true };
  },

  updateDepartment: (id, input) => {
    const name = input.name.trim();
    const cid = get().activeCompanyId;
    if (!name) return { ok: false, reason: "Nama departemen wajib diisi" };
    const dup = get().departments.some(
      (d) => d.id !== id && d.companyId === cid && !d.archivedAt && d.name.toLowerCase() === name.toLowerCase(),
    );
    if (dup) return { ok: false, reason: `Departemen "${name}" sudah ada` };
    set((s) => ({
      departments: s.departments.map((d) =>
        d.id === id ? { ...d, name, description: input.description?.trim() || undefined, headUserId: input.headUserId || undefined } : d,
      ),
      audit: [logAudit(get, { actor: nameOf(get), action: "UPDATE", entity: `Department ${name}`, detail: `Departemen "${name}" diperbarui` }), ...s.audit],
    }));
    return { ok: true };
  },

  archiveDepartment: (id) => {
    const dept = get().departments.find((d) => d.id === id);
    if (!dept) return { ok: false, reason: "Departemen tidak ditemukan" };
    // Guard (FR-ORG-002): tak boleh arsip bila masih ada risiko/insiden aktif.
    const hasRisk = get().risks.some((r) => r.departmentId === id && !r.deletedAt);
    const hasIncident = get().incidents.some((i) => i.departmentId === id && i.status !== "closed");
    if (hasRisk || hasIncident) return { ok: false, reason: "Pindahkan/arsipkan risiko & insiden aktif departemen ini dahulu" };
    set((s) => ({
      departments: s.departments.map((d) => (d.id === id ? { ...d, archivedAt: new Date().toISOString() } : d)),
      audit: [logAudit(get, { actor: nameOf(get), action: "DELETE", entity: `Department ${dept.name}`, detail: `Departemen "${dept.name}" diarsipkan` }), ...s.audit],
    }));
    return { ok: true };
  },

  inviteMember: (input) => {
    const cid = get().activeCompanyId;
    const email = input.email.trim();
    if (input.roles.length === 0) return { ok: false, reason: "Pilih minimal satu peran" };
    const existingUser = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser && get().memberships.some((m) => m.companyId === cid && m.userId === existingUser.id)) {
      return { ok: false, reason: "Pengguna sudah menjadi anggota perusahaan ini" };
    }
    const userId = existingUser?.id ?? `u-${Date.now()}`;
    const user: User = existingUser ?? { id: userId, name: input.name.trim(), email, initials: initialsOf(input.name) };
    const membership: Membership = { id: `mem-${cid}-${userId}`, companyId: cid, userId, roles: input.roles };
    set((s) => ({
      users: existingUser ? s.users : [...s.users, user],
      memberships: [...s.memberships, membership],
      audit: [logAudit(get, { actor: nameOf(get), action: "CREATE", entity: `Member ${user.name}`, detail: `${user.name} diundang (${input.roles.join(", ")})` }), ...s.audit],
    }));
    return { ok: true };
  },

  updateMemberRoles: (userId, roles) => {
    const cid = get().activeCompanyId;
    if (roles.length === 0) return { ok: false, reason: "Pilih minimal satu peran" };
    const target = get().memberships.find((m) => m.companyId === cid && m.userId === userId);
    if (!target) return { ok: false, reason: "Anggota tidak ditemukan" };
    const admins = get().memberships.filter((m) => m.companyId === cid && m.roles.includes("admin"));
    // Guard last-admin (FR-ORG-002): cegah menurunkan admin terakhir.
    if (target.roles.includes("admin") && !roles.includes("admin") && admins.length === 1) {
      return { ok: false, reason: "Minimal satu admin aktif diperlukan" };
    }
    set((s) => ({
      memberships: s.memberships.map((m) => (m.companyId === cid && m.userId === userId ? { ...m, roles } : m)),
      audit: [logAudit(get, { actor: nameOf(get), action: "UPDATE", entity: `Member ${userNameOf(get, userId)}`, detail: `Peran diperbarui: ${roles.join(", ")}` }), ...s.audit],
    }));
    return { ok: true };
  },

  removeMember: (userId) => {
    const cid = get().activeCompanyId;
    const target = get().memberships.find((m) => m.companyId === cid && m.userId === userId);
    if (!target) return { ok: false, reason: "Anggota tidak ditemukan" };
    const admins = get().memberships.filter((m) => m.companyId === cid && m.roles.includes("admin"));
    if (target.roles.includes("admin") && admins.length === 1) {
      return { ok: false, reason: "Minimal satu admin aktif diperlukan" };
    }
    set((s) => ({
      memberships: s.memberships.filter((m) => !(m.companyId === cid && m.userId === userId)),
      audit: [logAudit(get, { actor: nameOf(get), action: "DELETE", entity: `Member ${userNameOf(get, userId)}`, detail: "Anggota dikeluarkan dari perusahaan" }), ...s.audit],
    }));
    return { ok: true };
  },

  addRisk: (input) => {
    const level = computeRiskLevel(input.likelihood, input.impact);
    const newId = `r-${Date.now()}`;
    const codeNum = String(get().risks.length + 80).padStart(3, "0");
    const inherent: Assessment = {
      likelihood: input.likelihood,
      impact: input.impact,
      severity: severityScore(input.likelihood, input.impact),
      level,
      kind: "inherent",
      at: new Date().toISOString(),
      by: get().currentUserId,
    };
    const risk: Risk = {
      id: newId,
      code: `R-${codeNum}`,
      companyId: get().activeCompanyId,
      title: input.title,
      description: input.description,
      category: input.category,
      source: input.source,
      departmentId: input.departmentId,
      ownerId: input.ownerId,
      status: "assessed",
      aiSuggested: false,
      inherent,
      reviewFrequency: "quarterly",
      nextReviewDate: new Date(Date.now() + 90 * 86_400_000).toISOString(),
      treatments: [],
      kris: [],
      complianceIds: [],
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      risks: [risk, ...s.risks],
      audit: [logAudit(get, { actor: nameOf(get), action: "CREATE", entity: `Risk ${risk.code}`, detail: `Risiko baru "${risk.title}" dibuat (${level})` }), ...s.audit],
    }));
    return newId;
  },

  addAiSuggestedRisks: (inputs) => {
    const baseNum = get().risks.length + 80;
    const now = Date.now();
    // Draft AI (FR-RISK-5): aiSuggested=true, status "identified", dikecualikan dari
    // agregat/heatmap sampai dikonfirmasi manusia.
    const drafts: Risk[] = inputs.map((input, i) => ({
      id: `r-${now}-${i}`,
      code: `R-${String(baseNum + i).padStart(3, "0")}`,
      companyId: get().activeCompanyId,
      title: input.title,
      description: input.description,
      category: input.category,
      source: input.source,
      departmentId: input.departmentId,
      ownerId: input.ownerId,
      status: "identified",
      aiSuggested: true,
      inherent: {
        likelihood: input.likelihood,
        impact: input.impact,
        severity: severityScore(input.likelihood, input.impact),
        level: computeRiskLevel(input.likelihood, input.impact),
        kind: "inherent",
        at: new Date().toISOString(),
        by: get().currentUserId,
      },
      reviewFrequency: "quarterly",
      nextReviewDate: new Date(now + 90 * 86_400_000).toISOString(),
      treatments: [],
      kris: [],
      complianceIds: [],
      createdAt: new Date().toISOString(),
    }));
    set((s) => ({
      risks: [...drafts, ...s.risks],
      audit: [logAudit(get, { actor: nameOf(get), action: "CREATE", entity: "Risk (AI draft)", detail: `${drafts.length} draft risiko AI ditambahkan (perlu konfirmasi)` }), ...s.audit],
    }));
    return drafts.map((d) => d.id);
  },

  confirmAiRisk: (riskId) =>
    set((s) => ({
      risks: s.risks.map((r) => (r.id === riskId ? { ...r, aiSuggested: false, status: "assessed" } : r)),
      audit: [logAudit(get, { actor: nameOf(get), action: "CONFIRM", entity: `Risk ${idCode(get, riskId)}`, detail: "Draft AI dikonfirmasi & masuk register aktif" }), ...s.audit],
    })),

  addTreatment: (riskId, input) => {
    const id = `t-${Date.now()}`;
    const treatment: Treatment = {
      id,
      riskId,
      strategy: input.strategy,
      description: input.description,
      ownerId: input.ownerId,
      dueDate: input.dueDate,
      status: input.status,
      cost: input.cost,
      justification: input.justification || undefined,
      // ACCEPT butuh approval risk_manager sebelum aktif (FR-TREAT-3) → mulai belum disetujui.
      approved: input.strategy === "ACCEPT" ? false : undefined,
      transferProvider: input.transferProvider || undefined,
      transferPremium: input.transferPremium,
    };
    set((s) => ({
      risks: s.risks.map((r) => {
        if (r.id !== riskId) return r;
        // Treatment pertama memajukan status risiko ke "treated" (FR-TREAT-5).
        const status = r.status === "identified" || r.status === "assessed" ? "treated" : r.status;
        return { ...r, treatments: [...r.treatments, treatment], status };
      }),
      audit: [logAudit(get, { actor: nameOf(get), action: "CREATE", entity: `Treatment ${idCode(get, riskId)}`, detail: `Mitigasi "${treatment.description}" (${treatment.strategy}) ditambahkan` }), ...s.audit],
    }));
    return id;
  },

  updateTreatment: (riskId, treatmentId, input) =>
    set((s) => ({
      risks: s.risks.map((r) =>
        r.id === riskId
          ? {
              ...r,
              treatments: r.treatments.map((t: Treatment) =>
                t.id === treatmentId
                  ? {
                      ...t,
                      strategy: input.strategy,
                      description: input.description,
                      ownerId: input.ownerId,
                      dueDate: input.dueDate,
                      status: input.status,
                      cost: input.cost,
                      justification: input.justification || undefined,
                      // Pertahankan persetujuan bila tetap ACCEPT; reset bila pindah ke/dari ACCEPT.
                      approved: input.strategy === "ACCEPT" ? (t.strategy === "ACCEPT" ? t.approved : false) : undefined,
                      approvedBy: input.strategy === "ACCEPT" ? t.approvedBy : undefined,
                      transferProvider: input.transferProvider || undefined,
                      transferPremium: input.transferPremium,
                    }
                  : t,
              ),
            }
          : r,
      ),
      audit: [logAudit(get, { actor: nameOf(get), action: "UPDATE", entity: `Treatment ${idCode(get, riskId)}`, detail: `Mitigasi diperbarui (${input.strategy}, ${input.status})` }), ...s.audit],
    })),

  approveTreatment: (riskId, treatmentId) =>
    set((s) => ({
      risks: s.risks.map((r) =>
        r.id === riskId
          ? { ...r, treatments: r.treatments.map((t: Treatment) => (t.id === treatmentId ? { ...t, approved: true, approvedBy: s.currentUserId } : t)) }
          : r,
      ),
      audit: [logAudit(get, { actor: nameOf(get), action: "APPROVE", entity: `Treatment ${idCode(get, riskId)}`, detail: "Strategi ACCEPT disetujui risk_manager" }), ...s.audit],
    })),

  recordReview: (riskId, input) =>
    set((s) => ({
      risks: s.risks.map((r) => {
        if (r.id !== riskId) return r;
        // Penilaian dari review: residual bila sudah ada mitigasi, selain itu re-assess inherent.
        const kind: Assessment["kind"] = r.treatments.length > 0 ? "residual" : "inherent";
        const assessment: Assessment = {
          likelihood: input.likelihood,
          impact: input.impact,
          severity: severityScore(input.likelihood, input.impact),
          level: computeRiskLevel(input.likelihood, input.impact),
          kind,
          note: input.note || undefined,
          at: new Date().toISOString(),
          by: get().currentUserId,
        };
        const nextReviewDate = new Date(Date.now() + REVIEW_DAYS[input.reviewFrequency] * 86_400_000).toISOString();
        const base = { ...r, reviewFrequency: input.reviewFrequency, nextReviewDate, status: input.status };
        return kind === "residual" ? { ...base, residual: assessment } : { ...base, inherent: assessment };
      }),
      audit: [logAudit(get, { actor: nameOf(get), action: "REVIEW", entity: `Risk ${idCode(get, riskId)}`, detail: `Review dicatat → status ${input.status}, review berikutnya ${input.reviewFrequency}` }), ...s.audit],
    })),

  addKri: (riskId, input) => {
    const id = `kri-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({
      risks: s.risks.map((r) => (r.id === riskId ? { ...r, kris: [...r.kris, buildKri(id, input)] } : r)),
      audit: [logAudit(get, { actor: nameOf(get), action: "CREATE", entity: `KRI ${idCode(get, riskId)}`, detail: `Indikator "${input.name}" ditambahkan` }), ...s.audit],
    }));
    return id;
  },

  updateKri: (riskId, kriId, input) =>
    set((s) => ({
      risks: s.risks.map((r) =>
        r.id === riskId ? { ...r, kris: r.kris.map((k) => (k.id === kriId ? buildKri(kriId, input) : k)) } : r,
      ),
      audit: [logAudit(get, { actor: nameOf(get), action: "UPDATE", entity: `KRI ${idCode(get, riskId)}`, detail: `Indikator "${input.name}" diperbarui` }), ...s.audit],
    })),

  removeKri: (riskId, kriId) =>
    set((s) => ({
      risks: s.risks.map((r) => (r.id === riskId ? { ...r, kris: r.kris.filter((k) => k.id !== kriId) } : r)),
      audit: [logAudit(get, { actor: nameOf(get), action: "DELETE", entity: `KRI ${idCode(get, riskId)}`, detail: "Indikator dihapus" }), ...s.audit],
    })),

  addIncident: (input) => {
    const id = `inc-${Date.now()}`;
    const incident: Incident = {
      id,
      companyId: get().activeCompanyId,
      title: input.title,
      description: input.description,
      occurredAt: input.occurredAt,
      departmentId: input.departmentId,
      type: input.type,
      lossAmount: input.lossAmount,
      riskIds: input.riskIds,
      rootCause: input.rootCause,
      correctiveAction: input.correctiveAction,
      status: "open",
    };
    set((s) => ({
      incidents: [incident, ...s.incidents],
      audit: [logAudit(get, { actor: nameOf(get), action: "CREATE", entity: "Incident", detail: `Insiden "${incident.title}" dicatat (${incident.type})` }), ...s.audit],
    }));
    return id;
  },

  linkIncidentRisk: (incidentId, riskId) =>
    set((s) => ({
      incidents: s.incidents.map((i) =>
        i.id === incidentId && !i.riskIds.includes(riskId) ? { ...i, riskIds: [...i.riskIds, riskId] } : i,
      ),
      audit: [logAudit(get, { actor: nameOf(get), action: "UPDATE", entity: `Incident ${incidentId}`, detail: `Ditautkan ke risiko ${idCode(get, riskId)}` }), ...s.audit],
    })),

  approveIncidentClose: (incidentId) =>
    set((s) => ({
      incidents: s.incidents.map((i) => (i.id === incidentId ? { ...i, approved: true, status: "closed" } : i)),
      audit: [logAudit(get, { actor: nameOf(get), action: "APPROVE", entity: `Incident ${incidentId}`, detail: "Penutupan insiden kerugian besar disetujui" }), ...s.audit],
    })),

  addCompliance: (input) => {
    const id = `c-${Date.now()}`;
    const requirement: ComplianceRequirement = {
      id,
      companyId: get().activeCompanyId,
      industryType: input.industryType,
      regulationName: input.regulationName,
      description: input.description,
      authority: input.authority,
      isSystem: false, // requirement custom; bukan seed sistem (FR-COMP-6)
      status: input.status,
      progress: input.status === "compliant" ? 100 : input.status === "partial" ? 50 : 0,
      linkedRiskIds: [],
    };
    set((s) => ({
      compliance: [...s.compliance, requirement],
      audit: [logAudit(get, { actor: nameOf(get), action: "CREATE", entity: "Compliance", detail: `Regulasi custom "${requirement.regulationName}" ditambahkan` }), ...s.audit],
    }));
    return id;
  },

  duplicateCompliance: (id) => {
    const src = get().compliance.find((c) => c.id === id);
    const newId = `c-${Date.now()}`;
    if (src) {
      // Salinan = custom editable (FR-COMP-6); pemetaan risiko mulai kosong.
      const copy: ComplianceRequirement = {
        ...src,
        id: newId,
        regulationName: `${src.regulationName} (salinan)`,
        isSystem: false,
        linkedRiskIds: [],
      };
      set((s) => ({
        compliance: [...s.compliance, copy],
        audit: [logAudit(get, { actor: nameOf(get), action: "CREATE", entity: "Compliance", detail: `Regulasi "${src.regulationName}" diduplikasi → custom` }), ...s.audit],
      }));
    }
    return newId;
  },

  updateCompliance: (id, input) =>
    set((s) => ({
      compliance: s.compliance.map((c) =>
        c.id === id && !c.isSystem
          ? {
              ...c,
              regulationName: input.regulationName,
              description: input.description,
              authority: input.authority,
              industryType: input.industryType,
              status: input.status,
              progress: input.status === "compliant" ? 100 : input.status === "partial" ? 50 : 0,
            }
          : c,
      ),
      audit: [logAudit(get, { actor: nameOf(get), action: "UPDATE", entity: `Compliance ${id}`, detail: `Regulasi custom diperbarui (${input.status})` }), ...s.audit],
    })),

  removeCompliance: (id) =>
    set((s) => {
      const target = s.compliance.find((c) => c.id === id);
      if (!target || target.isSystem) return s; // regulasi sistem read-only (FR-COMP-6)
      return {
        compliance: s.compliance.filter((c) => c.id !== id),
        // Bersihkan referensi di sisi risk (jaga konsistensi m:n).
        risks: s.risks.map((r) =>
          r.complianceIds.includes(id) ? { ...r, complianceIds: r.complianceIds.filter((cid) => cid !== id) } : r,
        ),
        audit: [logAudit(get, { actor: nameOf(get), action: "DELETE", entity: `Compliance ${id}`, detail: `Regulasi custom "${target.regulationName}" dihapus` }), ...s.audit],
      };
    }),

  setComplianceMapping: (complianceId, riskIds, status) =>
    set((s) => {
      const linked = new Set(riskIds);
      return {
        // Sisi requirement: simpan linkedRiskIds + status.
        compliance: s.compliance.map((c) => (c.id === complianceId ? { ...c, linkedRiskIds: riskIds, status } : c)),
        // Sisi risk: sinkronkan complianceIds (m:n dua arah konsisten).
        risks: s.risks.map((r) => {
          const has = r.complianceIds.includes(complianceId);
          const should = linked.has(r.id);
          if (has === should) return r;
          const complianceIds = should
            ? [...r.complianceIds, complianceId]
            : r.complianceIds.filter((id) => id !== complianceId);
          return { ...r, complianceIds };
        }),
        audit: [logAudit(get, { actor: nameOf(get), action: "UPDATE", entity: `Compliance ${complianceId}`, detail: `Pemetaan diperbarui: ${riskIds.length} risiko tertaut, status ${status}` }), ...s.audit],
      };
    }),

  createCompanyWithAdmin: (input) => {
    const cid = `co-${Date.now()}`;
    const company: Company = {
      id: cid,
      name: input.name.trim(),
      industryType: input.industryType,
      employeeCount: input.employeeCount,
      closeApprovalThreshold: 50_000_000,
      aiEnabled: true,
    };
    // dedupe departments case-insensitive
    const seen = new Set<string>();
    const depts: Department[] = [];
    for (const raw of input.departments) {
      const name = raw.trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      depts.push({ id: `d-${cid}-${depts.length}`, companyId: cid, name });
    }
    const membership: Membership = {
      id: `mem-${cid}`,
      companyId: cid,
      userId: get().currentUserId,
      roles: ["admin", "risk_manager"], // D27
    };
    const seededCompliance: ComplianceRequirement[] = [...GENERAL_SEED, ...INDUSTRY_SEED[input.industryType].map((x) => ({ ...x, industryType: input.industryType }))].map((c, i) => ({
      id: `c-${cid}-${i}`,
      companyId: cid,
      industryType: c.industryType,
      regulationName: c.regulationName,
      description: c.description,
      authority: c.authority,
      isSystem: true,
      status: "partial" as const,
      progress: 0,
      linkedRiskIds: [],
    }));
    set((s) => ({
      companies: [...s.companies, company],
      departments: [...s.departments, ...depts],
      memberships: [...s.memberships, membership],
      compliance: [...s.compliance, ...seededCompliance],
      activeCompanyId: cid,
      onboarded: true,
      demoRole: "all",
      audit: [{ id: `a-${cid}`, at: new Date().toISOString(), companyId: cid, actor: nameOf(get), action: "CREATE", entity: "Company", detail: `RPC create_company_with_admin: ${company.name} + ${depts.length} departemen + ${seededCompliance.length} regulasi ter-seed` }, ...s.audit],
    }));
  },

  hydrate: (data) =>
    set((s) => {
      // Pertahankan perusahaan aktif bila masih valid; selain itu ambil yang pertama.
      const activeOk = data.companies.some((c) => c.id === s.activeCompanyId);
      return {
        users: data.users,
        companies: data.companies,
        memberships: data.memberships,
        departments: data.departments,
        risks: data.risks,
        incidents: data.incidents,
        compliance: data.compliance,
        audit: data.audit,
        activeCompanyId: activeOk ? s.activeCompanyId : (data.companies[0]?.id ?? s.activeCompanyId),
        hydrated: true,
      };
    }),
}));

function nameOf(get: () => State): string {
  return get().users.find((u) => u.id === get().currentUserId)?.name ?? "System";
}
function idCode(get: () => State, riskId: string): string {
  return get().risks.find((r) => r.id === riskId)?.code ?? riskId;
}
function userNameOf(get: () => State, userId: string): string {
  return get().users.find((u) => u.id === userId)?.name ?? userId;
}
// Inisial dari nama: 1 kata → 2 huruf pertama; >1 kata → huruf pertama depan+belakang.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
