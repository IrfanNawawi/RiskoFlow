import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Icon } from "@/components/ui";
import { RiskBadge } from "@/components/RiskBadge";
import { cn } from "@/lib/format";
import { computeRiskLevel, severityScore, STATUS_META, LIKELIHOOD_LABELS, IMPACT_LABELS } from "@/lib/risk";
import { reviewSchema, type ReviewInput } from "@/features/risks/validation/review.schema";
import { useRecordReview } from "@/features/risks/presentation/hooks/useRiskMutations";
import type { Risk, RiskStatus } from "@/data/types";

const FREQ_OPTIONS: { value: ReviewInput["reviewFrequency"]; label: string }[] = [
  { value: "weekly", label: "Mingguan" },
  { value: "monthly", label: "Bulanan" },
  { value: "quarterly", label: "Kuartalan" },
];
const STATUS_ORDER: RiskStatus[] = ["identified", "assessed", "treated", "monitored", "closed"];

export function ReviewModal({ open, onClose, risk }: { open: boolean; onClose: () => void; risk: Risk }) {
  const recordReview = useRecordReview();
  const active = risk.residual ?? risk.inherent;
  const hasTreatments = risk.treatments.length > 0;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReviewInput>({ resolver: zodResolver(reviewSchema) });

  useEffect(() => {
    if (!open) return;
    reset({
      likelihood: active.likelihood,
      impact: active.impact,
      status: risk.status,
      reviewFrequency: risk.reviewFrequency,
      note: "",
    });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, reset, active.likelihood, active.impact, risk.status, risk.reviewFrequency]);

  if (!open) return null;

  const likelihood = watch("likelihood") ?? active.likelihood;
  const impact = watch("impact") ?? active.impact;
  const level = computeRiskLevel(likelihood, impact);
  const score = severityScore(likelihood, impact);

  const onValid = async (data: ReviewInput) => {
    await recordReview.mutateAsync({ riskId: risk.id, input: data });
    onClose();
  };

  const field = "w-full rounded-[14px] border border-border-hairline bg-surface px-4 py-2.5 text-[14px] focus:border-primary";
  const label = "text-[12px] font-semibold text-on-surface-variant";

  return createPortal(
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        className="animate-modal-pop flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[24px] border border-border-hairline bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit(onValid)}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-hairline p-6">
          <div>
            <h2 className="font-display text-[22px] font-bold text-on-surface">Catat Review</h2>
            <p className="text-[13px] text-text-secondary">
              Perbarui penilaian {hasTreatments ? "residual" : "inherent"} & jadwal pemantauan (FR-MON-2).
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-outline hover:bg-surface-muted">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div className="rounded-[16px] border border-border-hairline bg-surface-muted p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-[15px] font-semibold">Penilaian {hasTreatments ? "residual" : "inherent"}</p>
              <RiskBadge level={level} score={score} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-[12px] font-medium text-on-surface-variant">
                  <span>Likelihood</span><span className="text-primary">{likelihood} · {LIKELIHOOD_LABELS[likelihood]}</span>
                </div>
                <input type="range" min={1} max={5} {...register("likelihood", { valueAsNumber: true })} className="mt-2 w-full accent-[var(--color-primary)]" />
              </div>
              <div>
                <div className="flex justify-between text-[12px] font-medium text-on-surface-variant">
                  <span>Impact</span><span className="text-primary">{impact} · {IMPACT_LABELS[impact]}</span>
                </div>
                <input type="range" min={1} max={5} {...register("impact", { valueAsNumber: true })} className="mt-2 w-full accent-[var(--color-primary)]" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={label}>Status risiko</label>
              <select className={field} {...register("status")}>
                {STATUS_ORDER.map((st) => <option key={st} value={st}>{STATUS_META[st].label}</option>)}
              </select>
              <p className="text-[11px] text-text-secondary">Pilih kembali status non-closed untuk membuka risiko (FR-MON-5).</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={label}>Frekuensi review</label>
              <select className={field} {...register("reviewFrequency")}>
                {FREQ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={label}>Catatan review</label>
            <textarea className={cn(field, "min-h-[72px] resize-none")} {...register("note")} placeholder="Temuan, perubahan konteks, tindak lanjut…" />
            {errors.note && <span className="flex items-center gap-1 text-[12px] font-medium text-error"><Icon name="error" size={14} /> {errors.note.message}</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-hairline p-6">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" icon="check">Simpan review</Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
