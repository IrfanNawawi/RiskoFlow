import type { Risk, Incident, RiskLevel } from "@/data/types";
import { CATEGORY_META } from "@/lib/risk";
import { relativeDays } from "@/lib/format";

/**
 * Logika derivasi metrik dashboard — **pure function** (tanpa React/DB), agar dapat
 * diuji unit tanpa render & di-mirror di Supabase view/RPC saat backend live.
 * Sumber kebenaran penilaian aktif: residual bila ada, jika tidak inherent (FR-ASSESS).
 */

export interface DashboardMetrics {
  total: number;
  byLevel: Record<RiskLevel, number>;
  highPriority: number; // EXTREME + HIGH
  treated: number;
  treatedPct: number; // 0..100 (dibulatkan)
  dueReview: number; // jatuh tempo review (≤ hari ini) & belum ditutup
  totalLoss: number; // IDR — akumulasi loss event
  exposure: number; // IDR — akumulasi dampak finansial risiko aktif
  incidentCount: number;
}

export interface CategoryDatum {
  key: string;
  name: string;
  value: number;
}

export interface AgendaItem {
  id: string;
  date: string;
  title: string;
  who: string;
  icon: string;
  riskId: string;
}

/** Penilaian aktif suatu risiko: residual bila tersedia, jika tidak inherent. */
export const activeAssessment = (r: Risk) => r.residual ?? r.inherent;

/** Hanya risiko terkonfirmasi (buang draft AI, FR-RISK-5) untuk semua agregat dashboard. */
export const confirmedRisks = (risks: Risk[]): Risk[] => risks.filter((r) => !r.aiSuggested);

export function computeMetrics(risks: Risk[], incidents: Incident[]): DashboardMetrics {
  const byLevel: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, EXTREME: 0 };
  for (const r of risks) byLevel[activeAssessment(r).level]++;

  const treated = risks.filter((r) => r.treatments.length > 0).length;
  const dueReview = risks.filter((r) => relativeDays(r.nextReviewDate) <= 0 && r.status !== "closed").length;
  const totalLoss = incidents.filter((i) => i.type === "LOSS").reduce((sum, i) => sum + i.lossAmount, 0);
  const exposure = risks.reduce((sum, r) => sum + (activeAssessment(r).financialImpact ?? 0), 0);

  return {
    total: risks.length,
    byLevel,
    highPriority: byLevel.EXTREME + byLevel.HIGH,
    treated,
    treatedPct: risks.length ? Math.round((treated / risks.length) * 100) : 0,
    dueReview,
    totalLoss,
    exposure,
    incidentCount: incidents.length,
  };
}

/** Distribusi risiko per kategori (untuk donut), berlabel Bahasa Indonesia. */
export function categoryDistribution(risks: Risk[]): CategoryDatum[] {
  const map = new Map<string, number>();
  for (const r of risks) map.set(r.category, (map.get(r.category) ?? 0) + 1);
  return Array.from(map.entries()).map(([key, value]) => ({
    key,
    name: CATEGORY_META[key as keyof typeof CATEGORY_META].label,
    value,
  }));
}

/** Risiko paling parah (by severity penilaian aktif), maksimal `limit`. */
export function topRisks(risks: Risk[], limit = 5): Risk[] {
  return [...risks].sort((a, b) => activeAssessment(b).severity - activeAssessment(a).severity).slice(0, limit);
}

/** Risiko yang perlu ditinjau dalam `withinDays` hari (belum ditutup), urut terdekat. */
export function risksNeedingReview(risks: Risk[], withinDays = 3): Risk[] {
  return risks
    .filter((r) => relativeDays(r.nextReviewDate) <= withinDays && r.status !== "closed")
    .sort((a, b) => relativeDays(a.nextReviewDate) - relativeDays(b.nextReviewDate));
}

/**
 * Agenda mendatang dari jadwal review risiko & due date mitigasi terbuka, urut tanggal
 * naik, maksimal `limit`. Nama departemen/pemilik di-resolve lewat callback (data referensi
 * disediakan repository — domain tetap polos).
 */
export function buildAgenda(
  risks: Risk[],
  resolveDeptName: (id: string) => string,
  resolveUserName: (id: string) => string,
  limit = 5,
): AgendaItem[] {
  const items: AgendaItem[] = [];
  for (const r of risks) {
    if (r.status !== "closed") {
      items.push({
        id: `rev-${r.id}`,
        date: r.nextReviewDate,
        title: `Review ${r.title}`,
        who: resolveDeptName(r.departmentId),
        icon: "event_repeat",
        riskId: r.id,
      });
    }
    for (const t of r.treatments) {
      if (t.status === "done") continue;
      items.push({
        id: `trt-${t.id}`,
        date: t.dueDate,
        title: t.approved === false ? `Approval Mitigasi · ${r.title}` : t.description,
        who: resolveUserName(t.ownerId),
        icon: t.approved === false ? "approval" : "build_circle",
        riskId: r.id,
      });
    }
  }
  return items.sort((a, b) => +new Date(a.date) - +new Date(b.date)).slice(0, limit);
}
