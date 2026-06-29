import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { Button, Icon } from "./ui";
import { RiskBadge } from "./RiskBadge";
import { computeRiskLevel, severityScore, CATEGORY_META, LIKELIHOOD_LABELS, IMPACT_LABELS } from "@/lib/risk";
import { newRiskSchema, type NewRiskInput } from "@/features/risks/validation/newRisk.schema";
import { useCreateRisk } from "@/features/risks";
import type { RiskCategory } from "@/data/types";
import { cn } from "@/lib/format";

const DEFAULTS: NewRiskInput = {
  title: "",
  description: "",
  category: "OPERATIONAL",
  source: "INTERNAL",
  departmentId: "",
  ownerId: "",
  likelihood: 3,
  impact: 3,
};

export function NewRiskModal({
  open,
  onClose,
  prefill,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  /** Nilai awal form (mis. dari insiden — FR-INC-2). */
  prefill?: Partial<NewRiskInput>;
  /** Dipanggil setelah risiko dibuat (mis. untuk menautkan ke insiden). */
  onCreated?: (riskId: string) => void;
}) {
  const departments = useStore(useShallow((s) => s.activeDepartments()));
  const users = useStore((s) => s.users);
  const createRisk = useCreateRisk();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<NewRiskInput>({ resolver: zodResolver(newRiskSchema), defaultValues: DEFAULTS });

  // Reset ke nilai awal (+ prefill) setiap modal dibuka; kunci scroll & Escape untuk menutup.
  useEffect(() => {
    if (!open) return;
    reset({ ...DEFAULTS, ...prefill });
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
  }, [open, onClose, reset, prefill]);

  if (!open) return null;

  const likelihood = watch("likelihood");
  const impact = watch("impact");
  const level = computeRiskLevel(likelihood, impact);
  const score = severityScore(likelihood, impact);

  const onValid = async (data: NewRiskInput) => {
    const id = await createRisk.mutateAsync(data);
    onCreated?.(id);
    onClose();
    navigate({ to: "/risks/$riskId", params: { riskId: id } });
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
            <h2 className="font-display text-[22px] font-bold text-on-surface">Risiko Baru</h2>
            <p className="text-[13px] text-text-secondary">Daftarkan risiko ke register & nilai keparahannya.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-outline hover:bg-surface-muted">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div className="flex flex-col gap-1.5">
            <label className={label}>Judul risiko *</label>
            <input className={field} {...register("title")} placeholder="mis. Kegagalan mesin produksi line 3" maxLength={150} />
            {errors.title && <span className={errorText}><Icon name="error" size={14} /> {errors.title.message}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label}>Deskripsi</label>
            <textarea className={cn(field, "min-h-[80px] resize-none")} {...register("description")} placeholder="Penyebab & dampak potensial…" />
            {errors.description && <span className={errorText}><Icon name="error" size={14} /> {errors.description.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={label}>Kategori</label>
              <select className={field} {...register("category")}>
                {(Object.keys(CATEGORY_META) as RiskCategory[]).map((c) => (
                  <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={label}>Sumber</label>
              <select className={field} {...register("source")}>
                <option value="INTERNAL">Internal</option>
                <option value="EXTERNAL">Eksternal</option>
              </select>
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
              <label className={label}>Risk owner *</label>
              <select className={field} {...register("ownerId")}>
                <option value="">Pilih owner…</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {errors.ownerId && <span className={errorText}><Icon name="error" size={14} /> {errors.ownerId.message}</span>}
            </div>
          </div>

          {/* Inline 5×5 assessment */}
          <div className="rounded-[16px] border border-border-hairline bg-surface-muted p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-[15px] font-semibold">Penilaian awal (inherent)</p>
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
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-hairline p-6">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" icon="check">Simpan risiko</Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
