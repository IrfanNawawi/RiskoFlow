import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { Card, Icon, Button } from "@/components/ui";
import { cn } from "@/lib/format";
import { buildComplianceReportRows, exportRowsToXlsx, exportRowsToPdf, todayStamp } from "@/lib/export";
import { useCompliances } from "./presentation/hooks/useCompliances";
import { useRemoveCompliance, useDuplicateCompliance } from "./presentation/hooks/useComplianceMutations";
import { ComplianceMappingModal } from "./presentation/components/ComplianceMappingModal";
import { ComplianceFormModal } from "./presentation/components/ComplianceFormModal";
import type { ComplianceStatus, ComplianceRequirement } from "@/data/types";

const FRAMEWORK_STEP = 4;

const STATUS_META: Record<ComplianceStatus, { label: string; cls: string; bar: string }> = {
  compliant: { label: "Compliant", cls: "border-risk-low/30 bg-risk-low/10 text-risk-low", bar: "var(--color-risk-low)" },
  partial: { label: "Partial", cls: "border-risk-medium/40 bg-risk-medium/15 text-secondary", bar: "var(--color-risk-medium)" },
  non_compliant: { label: "Non-Compliant", cls: "border-error/30 bg-error-container text-on-error-container", bar: "var(--color-error)" },
};

export function CompliancePage() {
  const { data: items = [] } = useCompliances();
  const risks = useStore(useShallow((s) => s.activeRisks().filter((r) => !r.aiSuggested)));
  const canEdit = useStore((s) => s.can("edit"));
  const removeCompliance = useRemoveCompliance();
  const duplicateCompliance = useDuplicateCompliance();
  const [editing, setEditing] = useState<ComplianceRequirement | null>(null);
  const [formModal, setFormModal] = useState<{ open: boolean; edit?: ComplianceRequirement }>({ open: false });
  const [visible, setVisible] = useState(FRAMEWORK_STEP);
  const shown = items.slice(0, visible);
  const remaining = items.length - shown.length;

  const stats = useMemo(() => {
    const total = items.length;
    const compliant = items.filter((i) => i.status === "compliant").length;
    const score = total ? Math.round(items.reduce((s, i) => s + i.progress, 0) / total) : 0;
    const gaps = items.filter((i) => i.linkedRiskIds.length === 0).length;
    const open = items.filter((i) => i.status === "non_compliant").length;
    return { total, compliant, score, gaps, open };
  }, [items]);

  // Laporan kepatuhan + gap (FR-COMP-4) — hormati daftar aktif; ekspor .xlsx/.pdf.
  const reportRows = () =>
    buildComplianceReportRows(items, (id) => risks.find((r) => r.id === id)?.code ?? id);
  const onExportXlsx = () => exportRowsToXlsx(reportRows(), { filename: `laporan-kepatuhan-${todayStamp()}.xlsx` });
  const onExportPdf = () =>
    exportRowsToPdf(reportRows(), {
      filename: `laporan-kepatuhan-${todayStamp()}.pdf`,
      title: "Laporan Kepatuhan",
      subtitle: `${stats.total} regulasi · ${stats.gaps} gap tanpa risiko · diekspor ${todayStamp()}`,
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-bold text-on-surface">Kepatuhan & Regulasi</h1>
          <p className="text-[14px] text-text-secondary">Kelola & pantau kepatuhan organisasi terhadap regulasi.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon="table_view" onClick={onExportXlsx}>Laporan XLSX</Button>
          <Button variant="outline" icon="picture_as_pdf" onClick={onExportPdf}>Laporan PDF</Button>
          {canEdit && <Button icon="add" onClick={() => setFormModal({ open: true })}>Tambah Regulasi</Button>}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="relative overflow-hidden p-5">
          <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-risk-low/10" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Tingkat Kepatuhan</span>
            <Icon name="verified" size={20} className="text-risk-low" fill />
          </div>
          <p className="font-display text-[34px] font-bold tabular-nums text-on-surface">{stats.score}%</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-risk-low" style={{ width: `${stats.score}%` }} />
          </div>
        </Card>
        <Card className="relative overflow-hidden p-5">
          <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-primary-fixed/40" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Regulasi Terpetakan</span>
            <Icon name="account_balance" size={20} className="text-primary" />
          </div>
          <p className="font-display text-[34px] font-bold tabular-nums text-on-surface">{stats.total}</p>
          <p className="text-[13px] text-text-secondary">{stats.compliant} compliant · {stats.gaps} gap tanpa risiko</p>
        </Card>
        <Card className="relative overflow-hidden p-5">
          <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-error-container/50" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Temuan Open</span>
            <Icon name="warning" size={20} className="text-error" />
          </div>
          <p className="font-display text-[34px] font-bold tabular-nums text-on-surface">{stats.open}</p>
          <p className="text-[13px] text-text-secondary">Action required</p>
        </Card>
      </div>

      <h2 className="font-display text-[18px] font-semibold text-on-surface">Active Frameworks</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {shown.map((c) => (
          <FrameworkCard
            key={c.id}
            c={c}
            riskCount={risks.filter((r) => c.linkedRiskIds.includes(r.id)).length}
            canEdit={canEdit}
            onManage={() => setEditing(c)}
            onEdit={() => setFormModal({ open: true, edit: c })}
            onDelete={() => {
              if (window.confirm(`Hapus regulasi "${c.regulationName}"?`)) removeCompliance.mutate(c.id);
            }}
            onDuplicate={() => duplicateCompliance.mutate(c.id)}
          />
        ))}
      </div>
      {remaining > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" icon="expand_more" onClick={() => setVisible((v) => v + FRAMEWORK_STEP)}>
            Tampilkan lebih banyak (sisa {remaining})
          </Button>
        </div>
      )}

      <ComplianceMappingModal requirement={editing} risks={risks} onClose={() => setEditing(null)} />
      <ComplianceFormModal open={formModal.open} onClose={() => setFormModal({ open: false })} requirement={formModal.edit} />
    </div>
  );
}

function FrameworkCard({ c, riskCount, canEdit, onManage, onEdit, onDelete, onDuplicate }: { c: ComplianceRequirement; riskCount: number; canEdit: boolean; onManage: () => void; onEdit: () => void; onDelete: () => void; onDuplicate: () => void }) {
  const meta = STATUS_META[c.status];
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-primary">
            <Icon name={c.authority === "ISO" ? "workspace_premium" : "account_balance"} size={22} />
          </div>
          <div>
            <p className="font-display text-[16px] font-semibold text-on-surface">{c.regulationName}</p>
            <p className="line-clamp-1 text-[12px] text-text-secondary">{c.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", meta.cls)}>{meta.label}</span>
          {/* Regulasi sistem read-only → hanya bisa diduplikasi jadi custom (FR-COMP-6). */}
          {canEdit && c.isSystem && (
            <button onClick={onDuplicate} aria-label="Duplikasi regulasi" className="flex h-7 w-7 items-center justify-center rounded-full text-outline hover:bg-surface-muted hover:text-primary">
              <Icon name="content_copy" size={15} />
            </button>
          )}
          {canEdit && !c.isSystem && (
            <>
              <button onClick={onEdit} aria-label="Ubah regulasi" className="flex h-7 w-7 items-center justify-center rounded-full text-outline hover:bg-surface-muted hover:text-primary">
                <Icon name="edit" size={15} />
              </button>
              <button onClick={onDelete} aria-label="Hapus regulasi" className="flex h-7 w-7 items-center justify-center rounded-full text-outline hover:bg-error-container hover:text-error">
                <Icon name="delete" size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[12px]">
          <span className="font-medium text-on-surface-variant">Implementation Progress</span>
          <span className="font-semibold tabular-nums">{c.progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full" style={{ width: `${c.progress}%`, backgroundColor: meta.bar }} />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border-hairline pt-3">
        <div className="flex items-center gap-2 text-[12px] text-text-secondary">
          <Icon name="link" size={15} />
          {riskCount > 0 ? `${riskCount} risiko tertaut` : <span className="font-medium text-secondary">Gap — belum ada risiko</span>}
          {c.isSystem && <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-outline">SYSTEM</span>}
        </div>
        {canEdit && (
          <button onClick={onManage} className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
            Kelola Pemetaan <Icon name="arrow_forward" size={15} />
          </button>
        )}
      </div>
    </Card>
  );
}
