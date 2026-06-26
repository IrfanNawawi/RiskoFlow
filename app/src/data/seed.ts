import { computeRiskLevel, severityScore } from "@/lib/risk";
import type {
  Assessment,
  AuditEntry,
  Company,
  ComplianceRequirement,
  Department,
  Incident,
  Membership,
  Risk,
  User,
} from "./types";

let seq = 1;
const id = (p: string) => `${p}-${seq++}`;

function daysFromNow(d: number): string {
  return new Date(Date.now() + d * 86_400_000).toISOString();
}

function mkAssessment(
  likelihood: number,
  impact: number,
  kind: "inherent" | "residual",
  by: string,
  note?: string,
  financialImpact?: number,
): Assessment {
  return {
    likelihood,
    impact,
    severity: severityScore(likelihood, impact),
    level: computeRiskLevel(likelihood, impact),
    kind,
    note,
    financialImpact,
    at: daysFromNow(-30),
    by,
  };
}

// ---- Users ----
export const users: User[] = [
  { id: "u-budi", name: "Budi Santoso", email: "budi@majumanufaktur.id", initials: "BS" },
  { id: "u-sari", name: "Sari Wibowo", email: "sari@majumanufaktur.id", initials: "SW" },
  { id: "u-andi", name: "Andi Pratama", email: "andi@majumanufaktur.id", initials: "AP" },
  { id: "u-dewi", name: "Dewi Lestari", email: "dewi@majumanufaktur.id", initials: "DL" },
  { id: "u-rio", name: "Rio Hartono", email: "rio@majumanufaktur.id", initials: "RH" },
];

export const currentUserId = "u-budi";

// ---- Company ----
export const company: Company = {
  id: "co-maju",
  name: "PT Maju Manufaktur",
  industryType: "MANUFACTURE",
  employeeCount: 240,
  closeApprovalThreshold: 50_000_000,
  aiEnabled: true,
};

// A second tenant so the company switcher (FR-ORG-6) is real.
export const company2: Company = {
  id: "co-sentosa",
  name: "PT Sentosa Niaga",
  industryType: "DAGANG",
  employeeCount: 85,
  closeApprovalThreshold: 50_000_000,
  aiEnabled: true,
};

export const memberships: Membership[] = [
  { id: id("mem"), companyId: company.id, userId: "u-budi", roles: ["admin", "risk_manager"] },
  { id: id("mem"), companyId: company.id, userId: "u-sari", roles: ["dept_head"] },
  { id: id("mem"), companyId: company.id, userId: "u-andi", roles: ["compliance"] },
  { id: id("mem"), companyId: company.id, userId: "u-dewi", roles: ["executive"] },
  { id: id("mem"), companyId: company2.id, userId: "u-budi", roles: ["risk_manager"] },
];

export const departments: Department[] = [
  { id: "d-prod", companyId: company.id, name: "Produksi", description: "Lini produksi & manufaktur", headUserId: "u-sari" },
  { id: "d-fin", companyId: company.id, name: "Keuangan", description: "Akuntansi, treasury, pajak", headUserId: "u-rio" },
  { id: "d-hse", companyId: company.id, name: "HSE", description: "Health, Safety & Environment", headUserId: "u-andi" },
  { id: "d-log", companyId: company.id, name: "Logistik", description: "Gudang & rantai pasok" },
  { id: "d-it", companyId: company.id, name: "IT & Data", description: "Sistem informasi & keamanan data" },
  { id: "d2-ops", companyId: company2.id, name: "Operasional", description: "Operasi ritel" },
  { id: "d2-fin", companyId: company2.id, name: "Keuangan", description: "Keuangan" },
];

// ---- Risks (manufacturing tenant) ----
type RiskSeed = Omit<Risk, "companyId" | "createdAt">;

const riskSeeds: RiskSeed[] = [
  {
    id: "r-001",
    code: "R-014",
    title: "Kegagalan mesin produksi line 2",
    description:
      "Risiko operasional kritis yang melibatkan penghentian tiba-tiba pada mesin produksi utama Line 2. Kegagalan ini dapat menyebabkan downtime signifikan, mengganggu jadwal pengiriman, dan berpotensi merusak bahan baku yang sedang diproses.",
    category: "OPERATIONAL",
    source: "INTERNAL",
    departmentId: "d-prod",
    ownerId: "u-sari",
    status: "treated",
    aiSuggested: false,
    inherent: mkAssessment(4, 5, "inherent", "u-sari", "Mesin berusia >8 tahun, frekuensi gangguan meningkat.", 1_200_000_000),
    residual: mkAssessment(3, 4, "residual", "u-sari", "Setelah preventive maintenance terjadwal."),
    reviewFrequency: "monthly",
    nextReviewDate: daysFromNow(-2),
    treatments: [
      {
        id: id("t"), riskId: "r-001", strategy: "REDUCE", description: "Preventive Maintenance Schedule Update",
        ownerId: "u-sari", dueDate: daysFromNow(8), status: "in_progress", cost: 75_000_000,
      },
      {
        id: id("t"), riskId: "r-001", strategy: "REDUCE", description: "Stockpile Critical Spare Parts",
        ownerId: "u-rio", dueDate: daysFromNow(14), status: "planned", cost: 120_000_000,
      },
    ],
    kris: [
      { id: id("k"), name: "Suhu Motor Rata-rata", current: "85°C", threshold: "< 70°C", ratio: 0.85, breached: true },
      { id: id("k"), name: "MTBF (Mean Time Between Failures)", current: "32 Hari", threshold: "> 60 Hari", ratio: 0.4, breached: false },
    ],
    complianceIds: ["c-smk3", "c-uu1-1970"],
  },
  {
    id: "r-002",
    code: "R-021",
    title: "Kebocoran data pelanggan (Data Breach)",
    description: "Eksposur kredensial dan data pribadi pelanggan akibat serangan siber atau kelalaian akses internal.",
    category: "OPERATIONAL",
    source: "EXTERNAL",
    departmentId: "d-it",
    ownerId: "u-budi",
    status: "treated",
    aiSuggested: false,
    inherent: mkAssessment(4, 5, "inherent", "u-budi", undefined, 800_000_000),
    reviewFrequency: "monthly",
    nextReviewDate: daysFromNow(5),
    treatments: [
      { id: id("t"), riskId: "r-002", strategy: "REDUCE", description: "Rollout MFA & SIEM monitoring", ownerId: "u-budi", dueDate: daysFromNow(20), status: "in_progress", cost: 60_000_000 },
    ],
    kris: [{ id: id("k"), name: "Patch Coverage", current: "78%", threshold: "> 95%", ratio: 0.78, breached: true }],
    complianceIds: ["c-uu27-2022", "c-iso27001"],
  },
  {
    id: "r-003",
    code: "R-008",
    title: "Vendor compliance — keterlambatan sertifikasi",
    description: "Pemasok utama belum melengkapi sertifikasi mutu, berisiko menghentikan pasokan bahan baku.",
    category: "LEGAL",
    source: "EXTERNAL",
    departmentId: "d-log",
    ownerId: "u-rio",
    status: "assessed",
    aiSuggested: false,
    inherent: mkAssessment(3, 4, "inherent", "u-rio"),
    reviewFrequency: "quarterly",
    nextReviewDate: daysFromNow(40),
    treatments: [],
    kris: [],
    complianceIds: ["c-iso31000"],
  },
  {
    id: "r-004",
    code: "R-033",
    title: "Fluktuasi nilai tukar bahan baku impor",
    description: "Volatilitas kurs USD/IDR menaikkan biaya bahan baku impor di luar anggaran.",
    category: "FINANCIAL",
    source: "EXTERNAL",
    departmentId: "d-fin",
    ownerId: "u-rio",
    status: "treated",
    aiSuggested: false,
    inherent: mkAssessment(4, 3, "inherent", "u-rio", undefined, 450_000_000),
    reviewFrequency: "monthly",
    nextReviewDate: daysFromNow(12),
    treatments: [
      { id: id("t"), riskId: "r-004", strategy: "TRANSFER", description: "Hedging forward contract 6 bulan", ownerId: "u-rio", dueDate: daysFromNow(3), status: "done", cost: 35_000_000, transferProvider: "Bank Mandiri Treasury", transferPremium: 35_000_000 },
    ],
    kris: [],
    complianceIds: [],
  },
  {
    id: "r-005",
    code: "R-040",
    title: "Penurunan reputasi akibat keluhan produk",
    description: "Lonjakan keluhan kualitas produk di media sosial dapat menurunkan kepercayaan merek.",
    category: "REPUTATIONAL",
    source: "EXTERNAL",
    departmentId: "d-prod",
    ownerId: "u-sari",
    status: "monitored",
    aiSuggested: false,
    inherent: mkAssessment(2, 4, "inherent", "u-sari"),
    residual: mkAssessment(2, 3, "residual", "u-sari"),
    reviewFrequency: "quarterly",
    nextReviewDate: daysFromNow(60),
    treatments: [
      { id: id("t"), riskId: "r-005", strategy: "REDUCE", description: "QC gerbang tambahan + survei NPS", ownerId: "u-sari", dueDate: daysFromNow(-5), status: "done", cost: 18_000_000 },
    ],
    kris: [{ id: id("k"), name: "Tingkat Keluhan / 1000 unit", current: "3,2", threshold: "< 2,0", ratio: 0.6, breached: true }],
    complianceIds: [],
  },
  {
    id: "r-006",
    code: "R-051",
    title: "Ketidakpatuhan pengelolaan limbah B3",
    description: "Penyimpanan limbah B3 melebihi kapasitas izin, berisiko sanksi KLHK.",
    category: "LEGAL",
    source: "INTERNAL",
    departmentId: "d-hse",
    ownerId: "u-andi",
    status: "assessed",
    aiSuggested: false,
    inherent: mkAssessment(3, 5, "inherent", "u-andi", undefined, 600_000_000),
    reviewFrequency: "monthly",
    nextReviewDate: daysFromNow(-1),
    treatments: [],
    kris: [],
    complianceIds: ["c-pp22-2021"],
  },
  {
    id: "r-007",
    code: "R-055",
    title: "Ketergantungan pada satu pemasok utama",
    description: "Konsentrasi pasokan pada satu vendor menambah risiko gangguan rantai pasok.",
    category: "STRATEGIC",
    source: "EXTERNAL",
    departmentId: "d-log",
    ownerId: "u-rio",
    status: "identified",
    aiSuggested: true,
    inherent: mkAssessment(3, 4, "inherent", "AI"),
    reviewFrequency: "quarterly",
    nextReviewDate: daysFromNow(75),
    treatments: [],
    kris: [],
    complianceIds: [],
  },
  {
    id: "r-008",
    code: "R-061",
    title: "Turnover tenaga kerja terampil tinggi",
    description: "Tingkat keluar karyawan operator terampil meningkat, menekan produktivitas lini.",
    category: "STRATEGIC",
    source: "INTERNAL",
    departmentId: "d-prod",
    ownerId: "u-sari",
    status: "identified",
    aiSuggested: true,
    inherent: mkAssessment(3, 3, "inherent", "AI"),
    reviewFrequency: "quarterly",
    nextReviewDate: daysFromNow(80),
    treatments: [],
    kris: [],
    complianceIds: [],
  },
  {
    id: "r-009",
    code: "R-066",
    title: "Sengketa pajak atas restitusi PPN",
    description: "Perbedaan interpretasi restitusi PPN berpotensi menimbulkan koreksi dan denda.",
    category: "FINANCIAL",
    source: "EXTERNAL",
    departmentId: "d-fin",
    ownerId: "u-rio",
    status: "monitored",
    aiSuggested: false,
    inherent: mkAssessment(2, 4, "inherent", "u-rio", undefined, 300_000_000),
    residual: mkAssessment(2, 3, "residual", "u-rio"),
    reviewFrequency: "quarterly",
    nextReviewDate: daysFromNow(30),
    treatments: [
      { id: id("t"), riskId: "r-009", strategy: "ACCEPT", description: "Terima risiko dengan pencadangan kontinjensi", ownerId: "u-rio", dueDate: daysFromNow(10), status: "planned", cost: 0, justification: "Probabilitas rendah, biaya mitigasi > eksposur. Dicadangkan dana kontinjensi.", approved: false },
    ],
    kris: [],
    complianceIds: ["c-pajak"],
  },
  {
    id: "r-010",
    code: "R-072",
    title: "Kecelakaan kerja area pengelasan",
    description: "Potensi cedera operator di area pengelasan karena kelelahan dan APD tidak lengkap.",
    category: "OPERATIONAL",
    source: "INTERNAL",
    departmentId: "d-hse",
    ownerId: "u-andi",
    status: "treated",
    aiSuggested: false,
    inherent: mkAssessment(3, 5, "inherent", "u-andi"),
    residual: mkAssessment(2, 4, "residual", "u-andi"),
    reviewFrequency: "monthly",
    nextReviewDate: daysFromNow(7),
    treatments: [
      { id: id("t"), riskId: "r-010", strategy: "REDUCE", description: "Pelatihan K3 & audit APD bulanan", ownerId: "u-andi", dueDate: daysFromNow(2), status: "in_progress", cost: 25_000_000 },
    ],
    kris: [{ id: id("k"), name: "Lost Time Injury Rate", current: "1,4", threshold: "< 1,0", ratio: 0.7, breached: true }],
    complianceIds: ["c-smk3", "c-uu1-1970"],
  },
];

export const risks: Risk[] = riskSeeds.map((r) => ({
  ...r,
  companyId: company.id,
  createdAt: daysFromNow(-45),
}));

// ---- Incidents ----
export const incidents: Incident[] = [
  {
    id: "i-001", companyId: company.id, title: "Overheating motor utama Line 2", description: "Motor utama overheat memicu shutdown otomatis selama 4,5 jam.", occurredAt: daysFromNow(-20), departmentId: "d-prod", type: "LOSS", lossAmount: 85_000_000, riskIds: ["r-001"], rootCause: "Pelumas degradasi, jadwal maintenance terlambat.", correctiveAction: "Reschedule PM + penggantian bearing.", status: "investigating", approved: false,
  },
  {
    id: "i-002", companyId: company.id, title: "Sensor alignment error", description: "Kesalahan kalibrasi sensor menyebabkan downtime 1,2 jam.", occurredAt: daysFromNow(-40), departmentId: "d-prod", type: "NEAR_MISS", lossAmount: 0, riskIds: ["r-001"], rootCause: "Kalibrasi manual tidak terstandar.", correctiveAction: "SOP kalibrasi otomatis.", status: "closed", approved: true,
  },
  {
    id: "i-003", companyId: company.id, title: "Percobaan phishing ke staf keuangan", description: "Email phishing menargetkan kredensial; tidak ada data bocor.", occurredAt: daysFromNow(-12), departmentId: "d-it", type: "NEAR_MISS", lossAmount: 0, riskIds: ["r-002"], rootCause: "Kesadaran keamanan rendah.", correctiveAction: "Kampanye awareness + simulasi phishing.", status: "closed", approved: true,
  },
  {
    id: "i-004", companyId: company.id, title: "Tumpahan limbah cair area produksi", description: "Tumpahan minor tertangani, namun melebihi ambang pelaporan internal.", occurredAt: daysFromNow(-8), departmentId: "d-hse", type: "LOSS", lossAmount: 65_000_000, riskIds: ["r-006"], rootCause: "Kontainer penyimpanan retak.", correctiveAction: "Ganti kontainer + inspeksi mingguan.", status: "open", approved: false,
  },
];

// ---- Compliance library (seeded for MANUFACTURE + GENERAL, FR-COMP-5) ----
export const compliance: ComplianceRequirement[] = [
  { id: "c-iso31000", companyId: company.id, industryType: "GENERAL", regulationName: "ISO 31000:2018", description: "Kerangka & proses manajemen risiko.", authority: "ISO", isSystem: true, status: "compliant", progress: 100, linkedRiskIds: ["r-003"] },
  { id: "c-gcg", companyId: company.id, industryType: "GENERAL", regulationName: "Prinsip GCG", description: "Tata kelola perusahaan yang baik (transparansi, akuntabilitas).", authority: "KNKG", isSystem: true, status: "partial", progress: 70, linkedRiskIds: [] },
  { id: "c-uu1-1970", companyId: company.id, industryType: "MANUFACTURE", regulationName: "UU No. 1/1970", description: "Keselamatan Kerja.", authority: "Pemerintah RI", isSystem: true, status: "partial", progress: 65, linkedRiskIds: ["r-001", "r-010"] },
  { id: "c-smk3", companyId: company.id, industryType: "MANUFACTURE", regulationName: "PP No. 50/2012 (SMK3)", description: "Sistem Manajemen Keselamatan & Kesehatan Kerja.", authority: "Kemnaker", isSystem: true, status: "partial", progress: 65, linkedRiskIds: ["r-001", "r-010"] },
  { id: "c-pp22-2021", companyId: company.id, industryType: "MANUFACTURE", regulationName: "PP No. 22/2021", description: "Perlindungan & pengelolaan lingkungan hidup + limbah B3.", authority: "KLHK", isSystem: true, status: "non_compliant", progress: 35, linkedRiskIds: ["r-006"] },
  { id: "c-halal", companyId: company.id, industryType: "MANUFACTURE", regulationName: "UU No. 33/2014", description: "Jaminan Produk Halal.", authority: "BPJPH", isSystem: true, status: "compliant", progress: 100, linkedRiskIds: [] },
  { id: "c-uu27-2022", companyId: company.id, industryType: "GENERAL", regulationName: "UU No. 27/2022 (PDP)", description: "Pelindungan Data Pribadi.", authority: "Kominfo", isSystem: true, status: "partial", progress: 55, linkedRiskIds: ["r-002"] },
  { id: "c-iso27001", companyId: company.id, industryType: "GENERAL", regulationName: "ISO/IEC 27001", description: "Keamanan informasi (sukarela).", authority: "ISO", isSystem: false, status: "partial", progress: 50, linkedRiskIds: ["r-002"] },
  { id: "c-pajak", companyId: company.id, industryType: "GENERAL", regulationName: "Ketentuan Perpajakan (PPN/PPh)", description: "Kepatuhan pelaporan & restitusi pajak.", authority: "DJP", isSystem: true, status: "compliant", progress: 90, linkedRiskIds: ["r-009"] },
];

// ---- Audit trail ----
export const audit: AuditEntry[] = [
  { id: id("a"), companyId: company.id, at: daysFromNow(-1), actor: "Budi Santoso", action: "UPDATE", entity: "Risk R-014", detail: "Status diubah identified → mitigating" },
  { id: id("a"), companyId: company.id, at: daysFromNow(-1), actor: "Andi Pratama", action: "CREATE", entity: "Incident I-004", detail: "Tumpahan limbah cair area produksi dicatat" },
  { id: id("a"), companyId: company.id, at: daysFromNow(-2), actor: "AI Assistant", action: "SUGGEST", entity: "Risk R-055", detail: "Kandidat risiko dibuat sebagai draft (menunggu konfirmasi)" },
  { id: id("a"), companyId: company.id, at: daysFromNow(-3), actor: "Rio Hartono", action: "APPROVE", entity: "Treatment R-033", detail: "Hedging forward contract disetujui" },
  { id: id("a"), companyId: company.id, at: daysFromNow(-4), actor: "Sari Wibowo", action: "ASSESS", entity: "Risk R-040", detail: "Penilaian residual disimpan (2×3 = 6, MEDIUM)" },
  { id: id("a"), companyId: company.id, at: daysFromNow(-6), actor: "Budi Santoso", action: "INVITE", entity: "Membership", detail: "Mengundang dewi@majumanufaktur.id sebagai executive" },
];
