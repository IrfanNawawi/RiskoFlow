import type { Risk, RiskLevel, RiskCategory, RiskStatus } from "@/data/types";

/**
 * Filter nilai untuk Custom Report Builder (FR-DASH-3): saring risiko sebelum diekspor.
 * Array kosong = tanpa batasan pada dimensi itu (semua lolos). Pure — dapat diuji & di-reuse.
 * Level memakai penilaian aktif (residual ?? inherent), konsisten dengan agregat lain.
 */
export interface RiskFilter {
  levels: RiskLevel[];
  categories: RiskCategory[];
  statuses: RiskStatus[];
}

export const EMPTY_RISK_FILTER: RiskFilter = { levels: [], categories: [], statuses: [] };

const activeLevel = (r: Risk): RiskLevel => (r.residual ?? r.inherent).level;

export function applyRiskFilter(risks: Risk[], filter: RiskFilter): Risk[] {
  return risks.filter(
    (r) =>
      (filter.levels.length === 0 || filter.levels.includes(activeLevel(r))) &&
      (filter.categories.length === 0 || filter.categories.includes(r.category)) &&
      (filter.statuses.length === 0 || filter.statuses.includes(r.status)),
  );
}

export const isRiskFilterActive = (f: RiskFilter): boolean =>
  f.levels.length > 0 || f.categories.length > 0 || f.statuses.length > 0;
