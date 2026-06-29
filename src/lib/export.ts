import type { Risk, ComplianceRequirement } from "@/data/types";
import { CATEGORY_META, SOURCE_META, STATUS_META } from "@/lib/risk";
import { fmtDate } from "@/lib/format";

export type ExportRow = Record<string, string | number>;

/**
 * Bangun baris ekspor dari entity Risk (kolom Bahasa Indonesia). Pakai penilaian aktif
 * (residual ?? inherent) untuk level & skor. Resolver disuntik agar util ini tetap lepas
 * dari store/presentation.
 */
export function buildRiskExportRows(
  risks: Risk[],
  resolveDept: (id: string) => string,
  resolveOwner: (id: string) => string,
): ExportRow[] {
  return risks.map((r) => {
    const a = r.residual ?? r.inherent;
    return {
      Kode: r.code,
      Judul: r.title,
      Departemen: resolveDept(r.departmentId),
      Kategori: CATEGORY_META[r.category].label,
      Sumber: SOURCE_META[r.source],
      Likelihood: a.likelihood,
      Impact: a.impact,
      Skor: a.severity,
      Level: a.level,
      Status: STATUS_META[r.status].label,
      Owner: resolveOwner(r.ownerId),
      "Review Berikutnya": fmtDate(r.nextReviewDate),
    };
  });
}

/**
 * Baris laporan kepatuhan (FR-COMP-4): requirement + risiko terkait + status; tandai **GAP**
 * untuk requirement tanpa risiko. `resolveRiskCode` memetakan id risiko → kode (mis. R-014).
 */
export function buildComplianceReportRows(
  items: ComplianceRequirement[],
  resolveRiskCode: (id: string) => string,
): ExportRow[] {
  return items.map((c) => ({
    Regulasi: c.regulationName,
    Otoritas: c.authority,
    Industri: c.industryType,
    Status: c.status,
    Progress: `${c.progress}%`,
    "Risiko Tertaut": c.linkedRiskIds.map(resolveRiskCode).join(", ") || "—",
    Gap: c.linkedRiskIds.length === 0 ? "GAP" : "",
  }));
}

/** Tanggal hari ini untuk nama file, mis. `risk-register-2026-06-26.xlsx`. */
export const todayStamp = () => new Date().toISOString().slice(0, 10);

/**
 * Ekspor baris ke `.xlsx`. Data kosong → satu baris pesan (bukan file korup).
 * `xlsx` di-`import()` dinamis → chunk-nya hanya dimuat saat ekspor benar-benar dijalankan.
 */
export async function exportRowsToXlsx(rows: ExportRow[], opts: { filename: string; sheet?: string }): Promise<void> {
  const XLSX = await import("xlsx");
  const data: ExportRow[] = rows.length ? rows : [{ Info: "Tidak ada data untuk filter ini" }];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opts.sheet ?? "Laporan");
  XLSX.writeFile(wb, opts.filename);
}

/**
 * Ekspor baris ke `.pdf` (tabel sederhana, landscape A4, page-break otomatis).
 * `jspdf` di-`import()` dinamis (lihat catatan `exportRowsToXlsx`).
 */
export async function exportRowsToPdf(
  rows: ExportRow[],
  opts: { filename: string; title: string; subtitle?: string },
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const margin = 32;
  let y = margin + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(opts.title, margin, y);
  y += 16;
  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(opts.subtitle, margin, y);
    doc.setTextColor(0);
    y += 14;
  }
  y += 8;

  if (!rows.length) {
    doc.setFontSize(11);
    doc.text("Tidak ada data untuk filter ini.", margin, y);
    doc.save(opts.filename);
    return;
  }

  const cols = Object.keys(rows[0]);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const usableW = pageW - margin * 2;
  const colW = usableW / cols.length;
  const lineH = 14;

  const drawHeader = () => {
    doc.setFillColor(238, 238, 238);
    doc.rect(margin, y - 10, usableW, lineH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    cols.forEach((c, i) => doc.text(String(c), margin + i * colW + 3, y, { maxWidth: colW - 6 }));
    y += lineH;
    doc.setFont("helvetica", "normal");
  };

  drawHeader();
  doc.setFontSize(8);
  for (const row of rows) {
    if (y > pageH - margin) {
      doc.addPage();
      y = margin + 4;
      drawHeader();
      doc.setFontSize(8);
    }
    cols.forEach((c, i) => {
      const text = String(row[c] ?? "");
      const line = doc.splitTextToSize(text, colW - 6)[0] ?? "";
      doc.text(line, margin + i * colW + 3, y, { maxWidth: colW - 6 });
    });
    y += lineH;
  }

  doc.save(opts.filename);
}
