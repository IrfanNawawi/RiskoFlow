import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { Button, Icon } from "@/components/ui";
import { cn } from "@/lib/format";
import { treatmentSchema, type TreatmentInput } from "@/features/risks/validation/treatment.schema";
import { useAddTreatment, useUpdateTreatment } from "@/features/risks/presentation/hooks/useRiskMutations";
import type { Treatment } from "@/data/types";

const STRATEGY_OPTIONS: { value: TreatmentInput["strategy"]; label: string }[] = [
  { value: "AVOID", label: "Hindari (Avoid)" },
  { value: "REDUCE", label: "Kurangi (Reduce)" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "ACCEPT", label: "Terima (Accept)" },
];
const STATUS_OPTIONS: { value: TreatmentInput["status"]; label: string }[] = [
  { value: "planned", label: "Direncanakan" },
  { value: "in_progress", label: "Berjalan" },
  { value: "done", label: "Selesai" },
];

const EMPTY: TreatmentInput = {
  strategy: "REDUCE",
  description: "",
  ownerId: "",
  dueDate: new Date().toISOString().slice(0, 10),
  status: "planned",
  cost: 0,
  justification: "",
  transferProvider: "",
  transferPremium: 0,
};

function toForm(t: Treatment): TreatmentInput {
  return {
    strategy: t.strategy,
    description: t.description,
    ownerId: t.ownerId,
    dueDate: t.dueDate.slice(0, 10),
    status: t.status,
    cost: t.cost,
    justification: t.justification ?? "",
    transferProvider: t.transferProvider ?? "",
    transferPremium: t.transferPremium ?? 0,
  };
}

export function TreatmentFormModal({
  open,
  onClose,
  riskId,
  treatment,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  riskId: string;
  treatment?: Treatment;
  /** Nilai awal mode tambah (mis. usulan AI, FR-AI-3). Diabaikan saat `treatment` (edit). */
  prefill?: Partial<TreatmentInput>;
}) {
  const users = useStore(useShallow((s) => s.users));
  const addTreatment = useAddTreatment();
  const updateTreatment = useUpdateTreatment();
  const isEdit = Boolean(treatment);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<TreatmentInput>({ resolver: zodResolver(treatmentSchema), defaultValues: EMPTY });

  const strategy = watch("strategy");

  useEffect(() => {
    if (!open) return;
    reset(treatment ? toForm(treatment) : { ...EMPTY, ...prefill });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, reset, treatment, prefill]);

  if (!open) return null;

  const onValid = async (data: TreatmentInput) => {
    if (treatment) await updateTreatment.mutateAsync({ riskId, treatmentId: treatment.id, input: data });
    else await addTreatment.mutateAsync({ riskId, input: data });
    onClose();
  };

  const field = "w-full rounded-[14px] border border-border-hairline bg-surface px-4 py-2.5 text-[14px] text-on-surface placeholder:text-text-secondary focus:border-primary";
  const label = "text-[12px] font-semibold text-on-surface-variant";
  const errorText = "flex items-center gap-1 text-[12px] font-medium text-error";

  return createPortal(
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        className="animate-modal-pop flex max-h-[90vh] w-full max-w-[600px] flex-col overflow-hidden rounded-[24px] border border-border-hairline bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit(onValid)}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-hairline p-6">
          <div>
            <h2 className="font-display text-[22px] font-bold text-on-surface">{isEdit ? "Ubah Mitigasi" : "Rencana Mitigasi Baru"}</h2>
            <p className="text-[13px] text-text-secondary">Strategi respons ISO 31000 + rencana tindakan.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-outline hover:bg-surface-muted">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={label}>Strategi *</label>
              <select className={field} {...register("strategy")}>
                {STRATEGY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={label}>Status *</label>
              <select className={field} {...register("status")}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={label}>Deskripsi rencana *</label>
            <textarea className={cn(field, "min-h-[72px] resize-none")} {...register("description")} placeholder="Langkah tindakan mitigasi…" />
            {errors.description && <span className={errorText}><Icon name="error" size={14} /> {errors.description.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={label}>PIC (owner) *</label>
              <select className={field} {...register("ownerId")}>
                <option value="">Pilih PIC…</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {errors.ownerId && <span className={errorText}><Icon name="error" size={14} /> {errors.ownerId.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={label}>Tenggat *</label>
              <input type="date" className={field} {...register("dueDate")} />
              {errors.dueDate && <span className={errorText}><Icon name="error" size={14} /> {errors.dueDate.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={label}>Biaya (Rp)</label>
              <input type="number" min={0} step={1} className={field} {...register("cost", { valueAsNumber: true })} />
              {errors.cost && <span className={errorText}><Icon name="error" size={14} /> {errors.cost.message}</span>}
            </div>
          </div>

          {strategy === "ACCEPT" && (
            <div className="flex flex-col gap-1.5 rounded-[14px] border border-risk-medium/40 bg-risk-medium/10 p-3">
              <label className={label}>Justifikasi (wajib untuk ACCEPT) *</label>
              <textarea className={cn(field, "min-h-[64px] resize-none")} {...register("justification")} placeholder="Alasan menerima risiko ini…" />
              {errors.justification && <span className={errorText}><Icon name="error" size={14} /> {errors.justification.message}</span>}
              <p className="text-[11px] text-text-secondary">Mitigasi ACCEPT butuh persetujuan risk manager sebelum aktif (FR-TREAT-3).</p>
            </div>
          )}

          {strategy === "TRANSFER" && (
            <div className="grid grid-cols-2 gap-4 rounded-[14px] border border-border-hairline bg-surface-muted/40 p-3">
              <div className="flex flex-col gap-1.5">
                <label className={label}>Penyedia transfer *</label>
                <input className={field} {...register("transferProvider")} placeholder="mis. PT Asuransi X" />
                {errors.transferProvider && <span className={errorText}><Icon name="error" size={14} /> {errors.transferProvider.message}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={label}>Premi (Rp)</label>
                <input type="number" min={0} step={1} className={field} {...register("transferPremium", { valueAsNumber: true })} />
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-hairline p-6">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" icon="check">{isEdit ? "Simpan perubahan" : "Tambah mitigasi"}</Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
