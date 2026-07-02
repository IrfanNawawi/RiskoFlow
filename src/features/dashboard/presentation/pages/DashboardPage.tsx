import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, Icon, Button, SectionTitle } from "@/components/ui";
import { RiskBadge } from "@/components/RiskBadge";
import { RISK_LEVEL_META } from "@/lib/risk";
import { idrCompact, relativeDays } from "@/lib/format";
import { buildRiskExportRows, exportRowsToXlsx, todayStamp } from "@/lib/export";
import { GenerateAiModal } from "@/features/ai";
import {
  activeAssessment,
  buildAgenda,
  categoryDistribution,
  computeMetrics,
  confirmedRisks,
  risksNeedingReview,
  topRisks,
} from "@/features/dashboard/domain";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import { Kpi } from "../components/Kpi";
import { AgendaTimeline } from "../components/AgendaTimeline";
import type { RiskLevel } from "@/data/types";

const CAT_COLORS = ["#01362f", "#1f4d45", "#3e9d7c", "#f2c14e", "#e8836b"];
const LEVEL_LABEL_ID: Record<RiskLevel, string> = { EXTREME: "Kritis", HIGH: "Tinggi", MEDIUM: "Sedang", LOW: "Rendah" };

export function DashboardPage() {
  const { data, isLoading } = useDashboardOverview();
  const [aiOpen, setAiOpen] = useState(false);

  // Resolver nama dari data referensi repository — bukan akses store langsung.
  const deptName = useMemo(() => {
    const m = new Map(data?.departments.map((d) => [d.id, d.name]));
    return (id: string) => m.get(id) ?? "—";
  }, [data?.departments]);
  const userName = useMemo(() => {
    const m = new Map(data?.users.map((u) => [u.id, u.name]));
    return (id: string) => m.get(id) ?? "—";
  }, [data?.users]);

  const risks = useMemo(() => confirmedRisks(data?.risks ?? []), [data?.risks]);
  const incidents = useMemo(() => data?.incidents ?? [], [data?.incidents]);

  const metrics = useMemo(() => computeMetrics(risks, incidents), [risks, incidents]);
  const categoryData = useMemo(() => categoryDistribution(risks), [risks]);
  const tops = useMemo(() => topRisks(risks), [risks]);
  const needsReview = useMemo(() => risksNeedingReview(risks), [risks]);
  const agenda = useMemo(() => buildAgenda(risks, deptName, userName), [risks, deptName, userName]);

  const onExport = () =>
    exportRowsToXlsx(buildRiskExportRows(risks, deptName, userName), { filename: `dashboard-risiko-${todayStamp()}.xlsx` });

  if (isLoading || !data) {
    return <div className="flex min-h-[40vh] items-center justify-center text-[14px] text-text-secondary">Memuat…</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-bold text-on-surface">Dashboard</h1>
          <p className="text-[14px] text-text-secondary">Profil risiko {data.company.name} secara menyeluruh.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon="download" onClick={onExport}>Ekspor</Button>
          <Button icon="auto_awesome" onClick={() => setAiOpen(true)}>Generate AI</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon="inventory_2" label="Total Risiko" value={String(metrics.total)} sub={`${metrics.highPriority} prioritas tinggi`} tone="primary" />
        <Kpi icon="task_alt" label="Ter-mitigasi" value={`${metrics.treatedPct}%`} sub={`${metrics.treated} dari ${metrics.total} risiko`} tone="success" />
        <Kpi icon="event_busy" label="Jatuh Tempo Review" value={String(metrics.dueReview)} sub="perlu ditinjau sekarang" tone="warning" />
        <Kpi icon="trending_down" label="Total Kerugian" value={idrCompact(metrics.totalLoss)} sub={`${metrics.incidentCount} insiden periode ini`} tone="error" />
      </div>

      {/* Main column + Agenda sidebar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Tinjauan Risiko: exposure + level distribution side by side */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Estimated risk value (financial exposure) */}
            <div className="overflow-hidden rounded-[16px] border border-border-hairline bg-primary p-5 text-on-primary">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-on-primary/70">Estimasi Nilai Risiko (Total)</p>
                  <p className="font-display text-[30px] font-bold tabular-nums">{idrCompact(metrics.exposure)}</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-on-primary/15">
                  <Icon name="account_balance_wallet" size={18} />
                </span>
              </div>
              <p className="mt-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-on-primary/70">Distribusi Level Risiko</p>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-on-primary/15">
                {(["EXTREME", "HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map((lvl) => {
                  const pct = metrics.total ? (metrics.byLevel[lvl] / metrics.total) * 100 : 0;
                  return pct > 0 ? <div key={lvl} style={{ width: `${pct}%`, backgroundColor: RISK_LEVEL_META[lvl].color }} /> : null;
                })}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                {(["EXTREME", "HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map((lvl) => (
                  <span key={lvl} className="flex items-center gap-1.5 text-[11px] text-on-primary/80">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RISK_LEVEL_META[lvl].color }} />
                    {LEVEL_LABEL_ID[lvl]}
                  </span>
                ))}
              </div>
            </div>

            {/* Category donut */}
            <Card className="flex flex-1 flex-col p-5">
              <SectionTitle className="mb-2">Distribusi per Kategori</SectionTitle>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" innerRadius={42} outerRadius={70} paddingAngle={2}>
                        {categoryData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex w-full flex-1 flex-col gap-2">
                  {categoryData.map((c, i) => (
                    <div key={c.key} className="flex items-center gap-2 text-[13px]">
                      <span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                      <span className="flex-1 text-on-surface-variant">{c.name}</span>
                      <span className="tnum font-semibold">{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Top risks */}
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <SectionTitle>Top Risks</SectionTitle>
                <Link to="/risks" className="text-[13px] font-semibold text-primary hover:underline">Lihat semua</Link>
              </div>
              <div className="flex flex-col gap-1">
                {tops.map((r) => {
                  const a = activeAssessment(r);
                  return (
                    <Link key={r.id} to="/risks/$riskId" params={{ riskId: r.id }} className="flex items-center gap-3 rounded-[12px] px-2 py-2.5 hover:bg-surface-muted">
                      <span className="tnum w-10 text-[12px] font-semibold text-text-secondary">{r.code}</span>
                      <span className="flex-1 truncate text-[14px] font-medium text-on-surface">{r.title}</span>
                      <RiskBadge level={a.level} score={a.severity} size="sm" />
                    </Link>
                  );
                })}
              </div>
            </Card>

            {/* Needs review */}
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <SectionTitle>Perlu Ditinjau</SectionTitle>
                <span className="flex items-center gap-1 rounded-full bg-error-container px-2.5 py-1 text-[11px] font-semibold text-on-error-container">
                  <Icon name="schedule" size={14} /> {needsReview.length} item
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {needsReview.length === 0 && <p className="py-6 text-center text-[13px] text-text-secondary">Tidak ada review jatuh tempo. 🎉</p>}
                {needsReview.map((r) => {
                  const days = relativeDays(r.nextReviewDate);
                  return (
                    <Link key={r.id} to="/risks/$riskId" params={{ riskId: r.id }} className="flex items-center gap-3 rounded-[12px] px-2 py-2.5 hover:bg-surface-muted">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-error-container text-on-error-container">
                        <Icon name="event_busy" size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-on-surface">{r.title}</p>
                        <p className="text-[12px] text-text-secondary">{deptName(r.departmentId)}</p>
                      </div>
                      <span className="shrink-0 text-[12px] font-semibold text-error">
                        {days <= 0 ? `Telat ${Math.abs(days)}h` : `${days}h lagi`}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>

        {/* Agenda & Timeline sidebar */}
        <aside className="lg:col-span-1">
          <AgendaTimeline items={agenda} />
        </aside>
      </div>

      <GenerateAiModal open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
