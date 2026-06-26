import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { Card, Icon } from "@/components/ui";
import { fmtDateTime, cn } from "@/lib/format";

const ACTION_META: Record<string, { icon: string; cls: string }> = {
  CREATE: { icon: "add_circle", cls: "bg-risk-low/15 text-risk-low" },
  UPDATE: { icon: "edit", cls: "bg-primary-fixed text-primary" },
  APPROVE: { icon: "verified", cls: "bg-risk-low/15 text-risk-low" },
  ASSESS: { icon: "analytics", cls: "bg-primary-fixed text-primary" },
  CONFIRM: { icon: "check_circle", cls: "bg-risk-low/15 text-risk-low" },
  SUGGEST: { icon: "auto_awesome", cls: "bg-secondary-container text-on-secondary-container" },
  INVITE: { icon: "person_add", cls: "bg-primary-fixed text-primary" },
};

export function AuditPage() {
  const audit = useStore(useShallow((s) => s.activeAudit()));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-[30px] font-bold text-on-surface">Audit Trail</h1>
        <p className="text-[14px] text-text-secondary">Jejak who / when / what — setiap perubahan tercatat (NFR-04).</p>
      </div>

      <Card className="p-5">
        <div className="flex flex-col">
          {audit.map((a, i) => {
            const meta = ACTION_META[a.action] ?? { icon: "circle", cls: "bg-surface-muted text-outline" };
            return (
              <div key={a.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", meta.cls)}>
                    <Icon name={meta.icon} size={18} fill />
                  </span>
                  {i < audit.length - 1 && <span className="my-1 w-0.5 flex-1 bg-border-hairline" />}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold text-on-surface">{a.actor}</span>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">{a.action}</span>
                    <span className="text-[12px] font-medium text-primary">{a.entity}</span>
                  </div>
                  <p className="text-[13px] text-on-surface-variant">{a.detail}</p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-text-secondary">{fmtDateTime(a.at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
