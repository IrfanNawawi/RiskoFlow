import { useEffect, useMemo, useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { Card, Icon, Button, SectionTitle, Pagination } from "@/components/ui";
import { RiskBadge } from "@/components/RiskBadge";
import { Heatmap, HeatmapLegend } from "@/components/Heatmap";
import { CATEGORY_META, SOURCE_META, STATUS_META } from "@/lib/risk";
import { cn, relativeDays } from "@/lib/format";
import { buildRiskExportRows, exportRowsToXlsx, exportRowsToPdf, todayStamp } from "@/lib/export";
import { useRisks } from "./presentation/hooks/useRisks";
import { useConfirmAiRisk } from "./presentation/hooks/useRiskMutations";
import { GenerateAiModal } from "@/features/ai";
import type { Risk } from "@/data/types";

const routeApi = getRouteApi("/app/risks");
type FilterKey = "dept" | "category" | "status" | "level";

const PAGE_SIZE = 8;

export function RiskRegisterPage() {
  // Filter tersimpan sebagai typed URL search params (FR-RISK-2), tervalidasi Zod di route.
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const dept = search.dept ?? "";
  const category = search.category ?? "";
  const status = search.status ?? "";
  const level = search.level ?? "";
  const cellL = search.l;
  const cellI = search.i;

  const { data: allRisks = [] } = useRisks();
  const departments = useStore(useShallow((s) => s.activeDepartments()));
  const deptById = useStore((s) => s.deptById);
  const userById = useStore((s) => s.userById);
  const confirmAi = useConfirmAiRisk();
  const [aiOpen, setAiOpen] = useState(false);

  const setFilter = (key: FilterKey, value: string) =>
    navigate({ replace: true, search: (prev) => ({ ...prev, [key]: value || undefined }) });

  const setCell = (l: number, i: number) =>
    navigate({
      replace: true,
      search: (prev) =>
        prev.l === l && prev.i === i ? { ...prev, l: undefined, i: undefined } : { ...prev, l, i },
    });

  const reset = () => navigate({ replace: true, search: {} });

  // Confirmed risks feed the heatmap/aggregates; drafts shown but excluded from heatmap.
  const confirmed = useMemo(() => allRisks.filter((r) => !r.aiSuggested), [allRisks]);

  const filtered = useMemo(() => {
    return allRisks.filter((r) => {
      const a = r.residual ?? r.inherent;
      if (dept && r.departmentId !== dept) return false;
      if (category && r.category !== category) return false;
      if (status && r.status !== status) return false;
      if (level && a.level !== level) return false;
      if (cellL && cellI && (a.likelihood !== cellL || a.impact !== cellI)) return false;
      return true;
    });
  }, [allRisks, dept, category, status, level, cellL, cellI]);

  const activeFilters = [dept, category, status, level].filter(Boolean).length + (cellL ? 1 : 0);

  // Paginasi client-side agar tabel tetap ringkas; reset ke halaman 1 saat filter berubah.
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [dept, category, status, level, cellL, cellI]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  // Ekspor menghormati filter aktif (FR-DASH-5): hanya baris `filtered` yang diekspor.
  const exportRows = () =>
    buildRiskExportRows(filtered, (id) => deptById(id)?.name ?? "—", (id) => userById(id)?.name ?? "—");
  const exportSubtitle = `${filtered.length} risiko · ${activeFilters} filter aktif · diekspor ${todayStamp()}`;
  const onExportXlsx = () => exportRowsToXlsx(exportRows(), { filename: `risk-register-${todayStamp()}.xlsx` });
  const onExportPdf = () =>
    exportRowsToPdf(exportRows(), { filename: `risk-register-${todayStamp()}.pdf`, title: "Risk Register", subtitle: exportSubtitle });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-bold text-on-surface">Risk Register</h1>
          <p className="text-[14px] text-text-secondary">{filtered.length} dari {allRisks.length} risiko · identifikasi → pemantauan.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon="table_view" onClick={onExportXlsx}>XLSX</Button>
          <Button variant="outline" icon="picture_as_pdf" onClick={onExportPdf}>PDF</Button>
          <Button variant="outline" icon="auto_awesome" onClick={() => setAiOpen(true)}>Generate AI</Button>
        </div>
      </div>

      <GenerateAiModal open={aiOpen} onClose={() => setAiOpen(false)} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        {/* Table + filters */}
        <Card className="overflow-hidden">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border-hairline p-4">
            <FilterSelect value={dept} onChange={(v) => setFilter("dept", v)} placeholder="Departemen" options={departments.map((d) => ({ value: d.id, label: d.name }))} />
            <FilterSelect value={category} onChange={(v) => setFilter("category", v)} placeholder="Kategori" options={Object.entries(CATEGORY_META).map(([k, v]) => ({ value: k, label: v.label }))} />
            <FilterSelect value={status} onChange={(v) => setFilter("status", v)} placeholder="Status" options={Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.label }))} />
            <FilterSelect value={level} onChange={(v) => setFilter("level", v)} placeholder="Level" options={["LOW", "MEDIUM", "HIGH", "EXTREME"].map((l) => ({ value: l, label: l }))} />
            {activeFilters > 0 && (
              <button onClick={reset} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium text-primary hover:bg-surface-muted">
                <Icon name="filter_alt_off" size={16} /> Reset ({activeFilters})
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-border-hairline bg-surface-muted">
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                  <th className="px-4 py-3">Judul</th>
                  <th className="px-3 py-3">Dept</th>
                  <th className="px-3 py-3">Kategori</th>
                  <th className="px-3 py-3">Level</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="text-[14px]">
                {paged.map((r) => <RiskRow key={r.id} r={r} deptName={deptById(r.departmentId)?.name ?? "—"} ownerInitials={userById(r.ownerId)?.initials ?? ""} onConfirm={() => confirmAi.mutate(r.id)} />)}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-[14px] text-text-secondary">Tidak ada risiko yang cocok dengan filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </Card>

        {/* Side heatmap */}
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <SectionTitle className="mb-3">Risk Distribution</SectionTitle>
            <Heatmap risks={confirmed} onCellClick={setCell} selected={cellL && cellI ? { likelihood: cellL, impact: cellI } : null} compact />
            <div className="mt-3 border-t border-border-hairline pt-3">
              <HeatmapLegend />
            </div>
            {cellL && cellI && (
              <button onClick={() => setCell(cellL, cellI)} className="mt-3 flex w-full items-center justify-center gap-1 rounded-full bg-surface-muted py-2 text-[12px] font-medium text-primary">
                <Icon name="close" size={14} /> Hapus filter sel ({cellL}×{cellI})
              </button>
            )}
          </Card>
          <Card className="p-4">
            <SectionTitle className="mb-2">Ringkasan</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-center">
              <Mini label="Draft AI" value={allRisks.filter((r) => r.aiSuggested).length} />
              <Mini label="Aktif" value={confirmed.length} />
              <Mini label="Ter-treat" value={confirmed.filter((r) => r.treatments.length > 0).length} />
              <Mini label="Closed" value={confirmed.filter((r) => r.status === "closed").length} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RiskRow({ r, deptName, ownerInitials, onConfirm }: { r: Risk; deptName: string; ownerInitials: string; onConfirm: () => void }) {
  const a = r.residual ?? r.inherent;
  const days = relativeDays(r.nextReviewDate);
  const overdue = days <= 0 && r.status !== "closed";
  return (
    <tr className="border-b border-border-hairline last:border-0 hover:bg-surface-muted">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[11px] font-bold text-primary">{ownerInitials}</span>
          <div className="min-w-0">
            <Link to="/risks/$riskId" params={{ riskId: r.id }} className="flex items-center gap-2 truncate font-medium text-on-surface hover:text-primary">
              {r.title}
              {r.aiSuggested && <span className="flex items-center gap-0.5 rounded-full bg-primary-fixed px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary"><Icon name="auto_awesome" size={11} fill /> AI draft</span>}
            </Link>
            <span className="tnum text-[11px] text-text-secondary">{r.code} · {SOURCE_META[r.source]}</span>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-[13px] text-on-surface-variant">{deptName}</td>
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1 text-[13px] text-on-surface-variant">
          <Icon name={CATEGORY_META[r.category].icon} size={15} className="text-outline" />
          {CATEGORY_META[r.category].label}
        </span>
      </td>
      <td className="px-3 py-3"><RiskBadge level={a.level} score={a.severity} size="sm" /></td>
      <td className="px-3 py-3">
        {r.aiSuggested ? (
          <button onClick={onConfirm} className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-on-primary hover:bg-primary-container">Konfirmasi</button>
        ) : (
          <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-[11px] font-medium text-on-surface-variant">{STATUS_META[r.status].label}</span>
        )}
      </td>
      <td className={cn("px-3 py-3 text-right text-[12px] font-medium tabular-nums", overdue ? "text-error" : "text-text-secondary")}>
        {r.status === "closed" ? "—" : overdue ? `Telat ${Math.abs(days)}h` : `${days}h`}
      </td>
    </tr>
  );
}

function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-full border bg-surface px-3.5 py-2 text-[13px] font-medium focus:border-primary",
        value ? "border-primary text-primary" : "border-border-hairline text-on-surface-variant",
      )}
    >
      <option value="">{placeholder}: Semua</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[12px] bg-surface-muted py-2.5">
      <p className="font-display text-[20px] font-bold tabular-nums text-on-surface">{value}</p>
      <p className="text-[11px] text-text-secondary">{label}</p>
    </div>
  );
}
