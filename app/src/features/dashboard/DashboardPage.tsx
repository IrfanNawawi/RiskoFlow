import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { Card, Icon, Button, SectionTitle } from "@/components/ui";
import { RiskBadge } from "@/components/RiskBadge";
import { CATEGORY_META, RISK_LEVEL_META } from "@/lib/risk";
import { idrCompact, relativeDays, fmtDate } from "@/lib/format";
import { buildRiskExportRows, exportRowsToXlsx, todayStamp } from "@/lib/export";
import { GenerateAiModal } from "@/features/ai";
import type { RiskLevel } from "@/data/types";

export function DashboardPage() {
  const risks = useStore(useShallow((s) => s.activeRisks().filter((r) => !r.aiSuggested)));
  const incidents = useStore(useShallow((s) => s.activeIncidents()));
  const company = useStore((s) => s.activeCompany());
  const deptById = useStore((s) => s.deptById);
  const userById = useStore((s) => s.userById);
  const [aiOpen, setAiOpen] = useState(false);

  const metrics = useMemo(() => {
    const byLevel: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, EXTREME: 0 };
    for (const r of risks) byLevel[(r.residual ?? r.inherent).level]++;
    const treated = risks.filter((r) => r.treatments.length > 0).length;
    const dueReview = risks.filter((r) => relativeDays(r.nextReviewDate) <= 0 && r.status !== "closed").length;
    const periodIncidents = incidents.filter((i) => i.type === "LOSS");
    const totalLoss = periodIncidents.reduce((sum, i) => sum + i.lossAmount, 0);
    const exposure = risks.reduce((sum, r) => sum + ((r.residual ?? r.inherent).financialImpact ?? 0), 0);
    return { byLevel, treated, dueReview, totalLoss, exposure, incidentCount: incidents.length };
  }, [risks, incidents]);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of risks) map.set(r.category, (map.get(r.category) ?? 0) + 1);
    return Array.from(map.entries()).map(([k, v]) => ({ name: CATEGORY_META[k as keyof typeof CATEGORY_META].label, value: v, key: k }));
  }, [risks]);

  const topRisks = useMemo(
    () => [...risks].sort((a, b) => (b.residual ?? b.inherent).severity - (a.residual ?? a.inherent).severity).slice(0, 5),
    [risks],
  );
  const needsReview = useMemo(
    () => risks.filter((r) => relativeDays(r.nextReviewDate) <= 3 && r.status !== "closed").sort((a, b) => relativeDays(a.nextReviewDate) - relativeDays(b.nextReviewDate)),
    [risks],
  );

  // Agenda & timeline — derived from upcoming risk reviews and open treatment due dates.
  const agenda = useMemo(() => {
    const items: AgendaItem[] = [];
    for (const r of risks) {
      if (r.status !== "closed") {
        items.push({
          id: `rev-${r.id}`,
          date: r.nextReviewDate,
          title: `Review ${r.title}`,
          who: deptById(r.departmentId)?.name ?? "—",
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
          who: userById(t.ownerId)?.name ?? "—",
          icon: t.approved === false ? "approval" : "build_circle",
          riskId: r.id,
        });
      }
    }
    return items.sort((a, b) => +new Date(a.date) - +new Date(b.date)).slice(0, 5);
  }, [risks, deptById, userById]);

  const onExport = () =>
    exportRowsToXlsx(
      buildRiskExportRows(risks, (id) => deptById(id)?.name ?? "—", (id) => userById(id)?.name ?? "—"),
      { filename: `dashboard-risiko-${todayStamp()}.xlsx` },
    );

  const CAT_COLORS = ["#01362f", "#1f4d45", "#3e9d7c", "#f2c14e", "#e8836b"];
  const LEVEL_LABEL_ID: Record<RiskLevel, string> = { EXTREME: "Kritis", HIGH: "Tinggi", MEDIUM: "Sedang", LOW: "Rendah" };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-bold text-on-surface">Dashboard</h1>
          <p className="text-[14px] text-text-secondary">Profil risiko {company.name} secara menyeluruh.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon="download" onClick={onExport}>Ekspor</Button>
          <Button icon="auto_awesome" onClick={() => setAiOpen(true)}>Generate AI</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon="inventory_2" label="Total Risiko" value={String(risks.length)} sub={`${metrics.byLevel.EXTREME + metrics.byLevel.HIGH} prioritas tinggi`} tone="primary" />
        <Kpi icon="task_alt" label="Ter-mitigasi" value={`${risks.length ? Math.round((metrics.treated / risks.length) * 100) : 0}%`} sub={`${metrics.treated} dari ${risks.length} risiko`} tone="success" />
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
                  const pct = risks.length ? (metrics.byLevel[lvl] / risks.length) * 100 : 0;
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
              {topRisks.map((r) => {
                const a = r.residual ?? r.inherent;
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
                      <p className="text-[12px] text-text-secondary">{deptById(r.departmentId)?.name}</p>
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

interface AgendaItem {
  id: string;
  date: string;
  title: string;
  who: string;
  icon: string;
  riskId: string;
}

function agendaDateLabel(iso: string): string {
  const days = relativeDays(iso);
  if (days === 0) return "Hari ini";
  if (days === 1) return "Besok";
  if (days === -1) return "Kemarin";
  if (days < 0) return `${Math.abs(days)} hari lalu`;
  if (days <= 7) return `${days} hari lagi`;
  return fmtDate(iso);
}

function AgendaTimeline({ items }: { items: AgendaItem[] }) {
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-1 flex items-center justify-between">
        <SectionTitle>Agenda & Timeline</SectionTitle>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <Icon name="calendar_month" size={18} />
        </span>
      </div>
      <p className="mb-4 text-[12px] text-text-secondary">{today}</p>

      {items.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-text-secondary">Belum ada agenda mendatang.</p>
      ) : (
        <ol className="relative flex flex-col gap-4 border-l border-border-hairline pl-5">
          {items.map((it) => {
            const overdue = relativeDays(it.date) < 0;
            return (
              <li key={it.id} className="relative">
                <span
                  className={`absolute -left-[26px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-surface ${overdue ? "bg-error" : "bg-primary"}`}
                />
                <Link to="/risks/$riskId" params={{ riskId: it.riskId }} className="block rounded-[12px] -mx-2 px-2 py-1 hover:bg-surface-muted">
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${overdue ? "text-error" : "text-primary"}`}>
                    {agendaDateLabel(it.date)}
                  </p>
                  <p className="mt-0.5 truncate text-[14px] font-medium text-on-surface">{it.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[12px] text-text-secondary">
                    <Icon name={it.icon} size={14} /> {it.who}
                  </p>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      <Link to="/risks" className="mt-auto pt-5">
        <Button variant="outline" icon="add" className="w-full">Tambah Agenda</Button>
      </Link>
    </Card>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon: string; label: string; value: string; sub: string; tone: "primary" | "success" | "warning" | "error" }) {
  const toneMap = {
    primary: "bg-primary-fixed text-primary",
    success: "bg-risk-low/15 text-risk-low",
    warning: "bg-risk-medium/20 text-secondary",
    error: "bg-error-container text-on-error-container",
  };
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${toneMap[tone]}`}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      <p className="font-display text-[28px] font-bold tabular-nums text-on-surface">{value}</p>
      <p className="text-[12px] text-text-secondary">{sub}</p>
    </Card>
  );
}
