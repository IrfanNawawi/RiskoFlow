import { useMemo, useState } from "react";
import { useStore } from "@/data/store";
import { Card, Icon, Button, Pagination } from "@/components/ui";
import { fmtDate, idr, idrCompact, cn } from "@/lib/format";
import { useIncidents } from "./presentation/hooks/useIncidents";
import { useApproveIncidentClose, useLinkIncidentRisk } from "./presentation/hooks/useIncidentMutations";
import { NewIncidentModal } from "./presentation/components/NewIncidentModal";
import { NewRiskModal } from "@/components/NewRiskModal";
import type { Incident } from "@/data/types";

const STATUS_CLS: Record<string, string> = {
  open: "bg-error-container text-on-error-container",
  investigating: "bg-risk-medium/15 text-secondary",
  closed: "bg-risk-low/15 text-risk-low",
};

const PAGE_SIZE = 8;

export function IncidentsPage() {
  const { data: incidents = [] } = useIncidents();
  const deptById = useStore((s) => s.deptById);
  const threshold = useStore((s) => s.activeCompany().closeApprovalThreshold);
  const canApprove = useStore((s) => s.can("approve"));
  const canEdit = useStore((s) => s.can("edit"));
  const approveClose = useApproveIncidentClose();
  const linkRisk = useLinkIncidentRisk();
  const [modalOpen, setModalOpen] = useState(false);
  const [createFor, setCreateFor] = useState<Incident | null>(null);
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(incidents.length / PAGE_SIZE));
  const paged = useMemo(
    () => incidents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [incidents, page],
  );

  const stats = useMemo(() => {
    const loss = incidents.filter((i) => i.type === "LOSS").reduce((s, i) => s + i.lossAmount, 0);
    const open = incidents.filter((i) => i.status !== "closed").length;
    const nearMiss = incidents.filter((i) => i.type === "NEAR_MISS").length;
    return { loss, open, nearMiss };
  }, [incidents]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-bold text-on-surface">Incident / Loss-Event Log</h1>
          <p className="text-[14px] text-text-secondary">Kejadian risiko nyata sebagai umpan balik ke penilaian.</p>
        </div>
        <Button icon="add" onClick={() => setModalOpen(true)}>Catat Insiden</Button>
      </div>

      <NewIncidentModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <NewRiskModal
        open={createFor !== null}
        onClose={() => setCreateFor(null)}
        prefill={
          createFor
            ? { title: createFor.title, description: createFor.description, departmentId: createFor.departmentId }
            : undefined
        }
        onCreated={(riskId) => {
          if (createFor) linkRisk.mutate({ incidentId: createFor.id, riskId });
        }}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard icon="payments" label="Total Kerugian" value={idrCompact(stats.loss)} tone="error" />
        <StatCard icon="pending_actions" label="Insiden Terbuka" value={String(stats.open)} tone="warning" />
        <StatCard icon="shield_with_heart" label="Near-miss" value={String(stats.nearMiss)} tone="success" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-border-hairline bg-surface-muted text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            <tr>
              <th className="px-4 py-3">Insiden</th>
              <th className="px-3 py-3">Dept</th>
              <th className="px-3 py-3">Tanggal</th>
              <th className="px-3 py-3">Tipe</th>
              <th className="px-3 py-3 text-right">Kerugian</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[14px]">
            {paged.map((i) => {
              const needsApproval = i.type === "LOSS" && i.lossAmount >= threshold && i.status !== "closed";
              return (
                <tr key={i.id} className="border-b border-border-hairline last:border-0 align-top hover:bg-surface-muted">
                  <td className="px-4 py-3">
                    <p className="font-medium text-on-surface">{i.title}</p>
                    <p className="text-[12px] text-text-secondary">{i.rootCause}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {needsApproval && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-error-container px-2 py-0.5 text-[10px] font-semibold text-on-error-container">
                          <Icon name="gavel" size={12} /> Butuh approval ({idr(threshold)}+)
                        </span>
                      )}
                      {/* FR-INC-2: insiden tanpa risiko → CTA buat risiko dari insiden ini. */}
                      {canEdit && i.riskIds.length === 0 && (
                        <button onClick={() => setCreateFor(i)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary-fixed">
                          <Icon name="add" size={12} /> Buat risiko
                        </button>
                      )}
                      {i.riskIds.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-text-secondary">
                          <Icon name="link" size={12} /> {i.riskIds.length} risiko tertaut
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[13px] text-on-surface-variant">{deptById(i.departmentId)?.name}</td>
                  <td className="px-3 py-3 text-[13px] tabular-nums text-on-surface-variant">{fmtDate(i.occurredAt)}</td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded-full px-2 py-1 text-[11px] font-medium", i.type === "LOSS" ? "bg-error-container text-on-error-container" : "bg-risk-low/15 text-risk-low")}>
                      {i.type === "LOSS" ? "Loss" : "Near-miss"}
                    </span>
                  </td>
                  <td className={cn("px-3 py-3 text-right font-medium tabular-nums", i.lossAmount > 0 ? "text-error" : "text-text-secondary")}>
                    {i.lossAmount > 0 ? idr(i.lossAmount) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {needsApproval && canApprove ? (
                      <button onClick={() => approveClose.mutate(i.id)} className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-on-primary hover:bg-primary-container">Approve & Close</button>
                    ) : (
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium capitalize", STATUS_CLS[i.status])}>{i.status}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <Pagination page={page} pageCount={pageCount} total={incidents.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: "error" | "warning" | "success" }) {
  const toneMap = { error: "bg-error-container text-on-error-container", warning: "bg-risk-medium/20 text-secondary", success: "bg-risk-low/15 text-risk-low" };
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${toneMap[tone]}`}><Icon name={icon} size={18} /></span>
      </div>
      <p className="font-display text-[26px] font-bold tabular-nums text-on-surface">{value}</p>
    </Card>
  );
}
