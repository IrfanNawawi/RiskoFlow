import { useMemo, useState } from "react";
import { Card, Icon, Button } from "@/components/ui";
import { cn } from "@/lib/format";
import { buildRiskExportRows, exportRowsToXlsx, exportRowsToPdf, todayStamp } from "@/lib/export";
import { reportableRisks, REPORT_COLUMNS, reportColumnLabel, projectRows } from "@/features/reports/domain";
import { useReportRegister } from "../hooks/useReportRegister";

const TEMPLATES = [
  { id: "profile", title: "Profil Risiko Korporat", desc: "Ringkasan komprehensif eksposur risiko utama, status mitigasi, dan indikator KRI di tingkat enterprise.", icon: "donut_large", formats: ["PDF", "XLS"], big: true },
  { id: "mitigation", title: "Laporan Mitigasi Triwulan", desc: "Evaluasi efektivitas kontrol & progres rencana tindak lanjut.", icon: "shield", formats: ["XLS"], big: false },
  { id: "heatmap", title: "Heatmap Per Departemen", desc: "Distribusi visual matriks risiko berdasarkan fungsi bisnis.", icon: "grid_view", formats: ["PDF"], big: false },
  { id: "loss", title: "Analisis Tren Kerugian", desc: "Laporan prediktif pergerakan loss event untuk perumusan strategi kuartal depan.", icon: "trending_up", formats: ["PDF", "XLS"], big: true },
];

export function ReportsPage() {
  // `dropped` = id kolom terpilih (katalog `REPORT_COLUMNS`) untuk Custom Report Builder.
  const [dropped, setDropped] = useState<string[]>(["kategori", "departemen"]);
  const [dragOver, setDragOver] = useState(false);

  const { data } = useReportRegister();
  const available = REPORT_COLUMNS.filter((c) => !dropped.includes(c.id));

  // Sumber data ekspor: risiko aktif terkonfirmasi (abaikan draft AI), nama di-resolve dari referensi.
  const rows = useMemo(() => {
    if (!data) return [];
    const deptName = new Map(data.departments.map((d) => [d.id, d.name]));
    const userName = new Map(data.users.map((u) => [u.id, u.name]));
    return buildRiskExportRows(
      reportableRisks(data.risks),
      (id) => deptName.get(id) ?? "—",
      (id) => userName.get(id) ?? "—",
    );
  }, [data]);

  // Template cepat = seluruh kolom; Custom builder = hanya kolom terpilih (base + `dropped`).
  const exportRegister = (format: "PDF" | "XLS", title: string, columnIds?: string[]) => {
    const out = columnIds ? projectRows(rows, columnIds) : rows;
    const base = `riskoflow-${title.toLowerCase().replace(/\s+/g, "-")}-${todayStamp()}`;
    if (format === "XLS") exportRowsToXlsx(out, { filename: `${base}.xlsx` });
    else exportRowsToPdf(out, { filename: `${base}.pdf`, title, subtitle: `${out.length} risiko · diekspor ${todayStamp()}` });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-bold text-on-surface">Laporan & Analytics</h1>
          <p className="text-[14px] text-text-secondary">Akses template laporan eksekutif atau buat analisis kustom. Data real-time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon="history">Riwayat Laporan</Button>
          <Button icon="add">Buat Baru</Button>
        </div>
      </div>

      <h2 className="font-display text-[18px] font-semibold">Template Laporan Cepat</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {TEMPLATES.map((t) => (
          <Card key={t.id} className={cn("flex flex-col gap-3 p-5", t.big && "md:col-span-1")}>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-primary-fixed text-primary">
                <Icon name={t.icon} size={22} />
              </div>
              <div>
                <p className="font-display text-[16px] font-semibold text-on-surface">{t.title}</p>
                <p className="text-[12px] leading-relaxed text-text-secondary">{t.desc}</p>
              </div>
            </div>
            <div className="flex gap-2 border-t border-border-hairline pt-3">
              {t.formats.map((f) => (
                <button
                  key={f}
                  onClick={() => exportRegister(f as "PDF" | "XLS", t.title)}
                  className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container"
                >
                  <Icon name={f === "PDF" ? "picture_as_pdf" : "table_view"} size={15} /> {f}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Custom report builder */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-semibold">Custom Report Builder</h2>
          <button className="text-[13px] font-semibold text-primary hover:underline">Panduan</button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
          <div className="rounded-[16px] border border-border-hairline bg-surface-muted p-4">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-text-secondary">Parameter Tersedia</p>
            <div className="flex flex-wrap gap-2">
              {available.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                  onClick={() => setDropped((d) => [...d, c.id])}
                  className="flex cursor-grab items-center gap-1.5 rounded-full border border-border-hairline bg-surface px-3 py-1.5 text-[12px] font-medium text-on-surface-variant active:cursor-grabbing"
                >
                  <Icon name="drag_indicator" size={15} className="text-outline" /> {c.label}
                </button>
              ))}
              {available.length === 0 && <span className="text-[12px] text-text-secondary">Semua parameter terpakai.</span>}
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              const p = e.dataTransfer.getData("text/plain");
              if (p && !dropped.includes(p)) setDropped((d) => [...d, p]);
            }}
            className={cn(
              "flex min-h-[180px] flex-col gap-2 rounded-[16px] border-2 border-dashed p-4 transition-colors",
              dragOver ? "border-primary bg-primary-fixed/20" : "border-outline-variant",
            )}
          >
            {dropped.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-text-secondary">
                <Icon name="account_tree" size={32} className="text-outline" />
                <p className="text-[13px]">Tarik & letakkan parameter di sini untuk menyusun struktur laporan.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {dropped.map((id) => (
                  <span key={id} className="flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1.5 text-[13px] font-medium text-primary">
                    {reportColumnLabel(id)}
                    <button onClick={() => setDropped((d) => d.filter((x) => x !== id))} className="hover:text-error"><Icon name="close" size={14} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => exportRegister("XLS", "Custom Report", dropped)}>Ekspor XLSX</Button>
          <Button icon="rocket_launch" className="flex-1 sm:flex-none" onClick={() => exportRegister("PDF", "Custom Report", dropped)}>Generate PDF</Button>
        </div>
      </Card>
    </div>
  );
}
