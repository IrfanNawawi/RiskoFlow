import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Icon } from "@/components/ui";
import { cn } from "@/lib/format";
import { useSetComplianceMapping } from "@/features/compliance/presentation/hooks/useComplianceMutations";
import type { ComplianceRequirement, ComplianceStatus, Risk } from "@/data/types";

const STATUS_OPTIONS: { value: ComplianceStatus; label: string }[] = [
  { value: "compliant", label: "Compliant" },
  { value: "partial", label: "Partial" },
  { value: "non_compliant", label: "Non-Compliant" },
];

export function ComplianceMappingModal({
  requirement,
  risks,
  onClose,
}: {
  requirement: ComplianceRequirement | null;
  risks: Risk[];
  onClose: () => void;
}) {
  const setMapping = useSetComplianceMapping();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<ComplianceStatus>("partial");

  useEffect(() => {
    if (!requirement) return;
    setSelected(new Set(requirement.linkedRiskIds));
    setStatus(requirement.status);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [requirement, onClose]);

  if (!requirement) return null;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onSave = async () => {
    await setMapping.mutateAsync({ complianceId: requirement.id, riskIds: [...selected], status });
    onClose();
  };

  const field = "w-full rounded-[14px] border border-border-hairline bg-surface px-4 py-2.5 text-[14px] focus:border-primary";

  return createPortal(
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="animate-modal-pop flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[24px] border border-border-hairline bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border-hairline p-6">
          <div>
            <h2 className="font-display text-[20px] font-bold text-on-surface">{requirement.regulationName}</h2>
            <p className="text-[13px] text-text-secondary">Petakan risiko terkait & tetapkan status kepatuhan (FR-COMP-2).</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-outline hover:bg-surface-muted">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-on-surface-variant">Status kepatuhan</label>
            <select className={field} value={status} onChange={(e) => setStatus(e.target.value as ComplianceStatus)}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-on-surface-variant">Risiko tertaut ({selected.size})</label>
            {risks.length === 0 ? (
              <p className="rounded-[12px] bg-surface-muted p-3 text-[13px] text-text-secondary">Belum ada risiko aktif untuk ditautkan.</p>
            ) : (
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-[14px] border border-border-hairline bg-surface-muted/40 p-2">
                {risks.map((r) => {
                  const checked = selected.has(r.id);
                  return (
                    <label
                      key={r.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] hover:bg-surface",
                        checked && "bg-primary-fixed/40",
                      )}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggle(r.id)} className="accent-[var(--color-primary)]" />
                      <span className="tnum text-[11px] text-text-secondary">{r.code}</span>
                      <span className="truncate text-on-surface">{r.title}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-hairline p-6">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button icon="check" onClick={onSave}>Simpan pemetaan</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
