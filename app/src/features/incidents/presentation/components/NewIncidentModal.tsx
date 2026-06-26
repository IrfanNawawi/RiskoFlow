import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { Button, Icon } from "@/components/ui";
import { cn } from "@/lib/format";
import { newIncidentSchema, type NewIncidentInput } from "@/features/incidents/validation/newIncident.schema";
import { useCreateIncident } from "@/features/incidents/presentation/hooks/useIncidentMutations";

const DEFAULTS: NewIncidentInput = {
  title: "",
  description: "",
  occurredAt: new Date().toISOString().slice(0, 10),
  departmentId: "",
  type: "LOSS",
  lossAmount: 0,
  riskIds: [],
  rootCause: "",
  correctiveAction: "",
};

export function NewIncidentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const departments = useStore(useShallow((s) => s.activeDepartments()));
  const risks = useStore(useShallow((s) => s.activeRisks().filter((r) => !r.aiSuggested)));
  const createIncident = useCreateIncident();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<NewIncidentInput>({ resolver: zodResolver(newIncidentSchema), defaultValues: DEFAULTS });

  const type = watch("type");

  useEffect(() => {
    if (!open) return;
    reset(DEFAULTS);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, reset]);

  // Near-miss tidak punya nilai kerugian — kunci ke 0.
  useEffect(() => {
    if (type === "NEAR_MISS") setValue("lossAmount", 0, { shouldValidate: true });
  }, [type, setValue]);

  if (!open) return null;

  const onValid = async (data: NewIncidentInput) => {
    await createIncident.mutateAsync(data);
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
        className="animate-modal-pop flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[24px] border border-border-hairline bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit(onValid)}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-hairline p-6">
          <div>
            <h2 className="font-display text-[22px] font-bold text-on-surface">Catat Insiden</h2>
            <p className="text-[13px] text-text-secondary">Kejadian risiko nyata (loss event / near-miss).</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-outline hover:bg-surface-muted">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div className="flex flex-col gap-1.5">
            <label className={label}>Judul insiden *</label>
            <input className={field} {...register("title")} placeholder="mis. Kebocoran pipa di gudang B" maxLength={150} />
            {errors.title && <span className={errorText}><Icon name="error" size={14} /> {errors.title.message}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label}>Deskripsi</label>
            <textarea className={cn(field, "min-h-[72px] resize-none")} {...register("description")} placeholder="Kronologi singkat…" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={label}>Tanggal kejadian *</label>
              <input type="date" className={field} {...register("occurredAt")} />
              {errors.occurredAt && <span className={errorText}><Icon name="error" size={14} /> {errors.occurredAt.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={label}>Departemen *</label>
              <select className={field} {...register("departmentId")}>
                <option value="">Pilih departemen…</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.departmentId && <span className={errorText}><Icon name="error" size={14} /> {errors.departmentId.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={label}>Tipe *</label>
              <select className={field} {...register("type")}>
                <option value="LOSS">Loss (kerugian)</option>
                <option value="NEAR_MISS">Near-miss</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={label}>Nilai kerugian (Rp)</label>
              <input
                type="number"
                min={0}
                step={1}
                disabled={type === "NEAR_MISS"}
                className={cn(field, type === "NEAR_MISS" && "cursor-not-allowed opacity-50")}
                {...register("lossAmount", { valueAsNumber: true })}
              />
              {errors.lossAmount && <span className={errorText}><Icon name="error" size={14} /> {errors.lossAmount.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={label}>Akar masalah</label>
              <input className={field} {...register("rootCause")} placeholder="mis. Korosi tidak terdeteksi" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={label}>Tindakan korektif</label>
              <input className={field} {...register("correctiveAction")} placeholder="mis. Jadwalkan inspeksi rutin" />
            </div>
          </div>

          {/* Tautkan ke risiko (opsional, FR-INC-2) */}
          {risks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className={label}>Tautkan ke risiko (opsional)</label>
              <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto rounded-[14px] border border-border-hairline bg-surface-muted/40 p-3">
                {risks.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-[13px] text-on-surface-variant">
                    <input type="checkbox" value={r.id} {...register("riskIds")} className="accent-[var(--color-primary)]" />
                    <span className="tnum text-[11px] text-text-secondary">{r.code}</span>
                    <span className="truncate">{r.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-hairline p-6">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" icon="check">Simpan insiden</Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
