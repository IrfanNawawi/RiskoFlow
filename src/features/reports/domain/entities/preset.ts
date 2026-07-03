import type { RiskFilter } from "./filter";

/**
 * Preset laporan tersimpan (FR-DASH-3): kombinasi kolom terpilih + filter nilai yang
 * diberi nama, agar konfigurasi Custom Report Builder dapat dipakai ulang. Pure type +
 * factory; persistensi ada di store presentation (localStorage).
 */
export interface ReportPreset {
  id: string;
  name: string;
  columnIds: string[];
  filter: RiskFilter;
}

/** Buat preset baru dengan id unik dari nama + konfigurasi builder saat ini. */
export function createReportPreset(name: string, columnIds: string[], filter: RiskFilter): ReportPreset {
  return {
    id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    columnIds: [...columnIds],
    filter: {
      levels: [...filter.levels],
      categories: [...filter.categories],
      statuses: [...filter.statuses],
    },
  };
}
