import type { ExportRow } from "@/lib/export";

/**
 * Katalog kolom laporan Risk Register untuk Custom Report Builder (FR-DASH-3).
 * Satu "parameter" yang dipilih user memetakan ke ≥1 kolom nyata pada baris ekspor
 * (`buildRiskExportRows`). Pure — tanpa React/store — agar dapat diuji & di-reuse.
 */
export interface ReportColumn {
  id: string;
  label: string;
  /** Key kolom pada `ExportRow` yang dihasilkan bila parameter ini dipilih. */
  keys: string[];
}

/** Kolom identitas — selalu ikut agar laporan tak pernah kosong tanpa konteks. */
export const BASE_COLUMN_KEYS = ["Kode", "Judul"] as const;

/** Parameter opsional (urutan = urutan kolom pada output). */
export const REPORT_COLUMNS: ReportColumn[] = [
  { id: "departemen", label: "Departemen", keys: ["Departemen"] },
  { id: "kategori", label: "Kategori", keys: ["Kategori"] },
  { id: "sumber", label: "Sumber", keys: ["Sumber"] },
  { id: "penilaian", label: "Penilaian (L/I/Skor/Level)", keys: ["Likelihood", "Impact", "Skor", "Level"] },
  { id: "status", label: "Status", keys: ["Status"] },
  { id: "owner", label: "Owner", keys: ["Owner"] },
  { id: "review", label: "Review Berikutnya", keys: ["Review Berikutnya"] },
];

const COLUMN_BY_ID = new Map(REPORT_COLUMNS.map((c) => [c.id, c]));

/** Label parameter dari id (untuk render chip). */
export const reportColumnLabel = (id: string): string => COLUMN_BY_ID.get(id)?.label ?? id;

/** Daftar key kolom final: base + kolom terpilih, mengikuti urutan katalog. */
export function selectedColumnKeys(selectedIds: string[]): string[] {
  const keys: string[] = [...BASE_COLUMN_KEYS];
  for (const col of REPORT_COLUMNS) if (selectedIds.includes(col.id)) keys.push(...col.keys);
  return keys;
}

/**
 * Proyeksikan baris ekspor penuh menjadi hanya kolom terpilih (mengikuti urutan katalog).
 * Kolom yang tak ada pada baris di-skip diam-diam agar tahan drift.
 */
export function projectRows(rows: ExportRow[], selectedIds: string[]): ExportRow[] {
  const keys = selectedColumnKeys(selectedIds);
  return rows.map((row) => Object.fromEntries(keys.filter((k) => k in row).map((k) => [k, row[k]])));
}
