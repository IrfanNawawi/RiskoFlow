import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Icon } from "@/components/ui";
import { kriSchema, type KriInput } from "@/features/risks/validation/kri.schema";
import { useAddKri, useUpdateKri } from "@/features/risks/presentation/hooks/useRiskMutations";
import type { Kri } from "@/data/types";

const EMPTY: KriInput = { name: "", current: "", threshold: "" };

export function KriFormModal({
  open,
  onClose,
  riskId,
  kri,
}: {
  open: boolean;
  onClose: () => void;
  riskId: string;
  kri?: Kri;
}) {
  const addKri = useAddKri();
  const updateKri = useUpdateKri();
  const isEdit = Boolean(kri);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<KriInput>({ resolver: zodResolver(kriSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    reset(kri ? { name: kri.name, current: kri.current, threshold: kri.threshold } : EMPTY);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, reset, kri]);

  if (!open) return null;

  const onValid = async (data: KriInput) => {
    if (kri) await updateKri.mutateAsync({ riskId, kriId: kri.id, input: data });
    else await addKri.mutateAsync({ riskId, input: data });
    onClose();
  };

  const field = "w-full rounded-[14px] border border-border-hairline bg-surface px-4 py-2.5 text-[14px] focus:border-primary";
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
        className="animate-modal-pop flex w-full max-w-[460px] flex-col overflow-hidden rounded-[24px] border border-border-hairline bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit(onValid)}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-hairline p-6">
          <div>
            <h2 className="font-display text-[20px] font-bold text-on-surface">{isEdit ? "Ubah KRI" : "Indikator (KRI) Baru"}</h2>
            <p className="text-[13px] text-text-secondary">Key Risk Indicator + ambang (FR-MON-4).</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-outline hover:bg-surface-muted">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <label className={label}>Nama indikator *</label>
            <input className={field} {...register("name")} placeholder="mis. Downtime mesin / bulan" maxLength={100} />
            {errors.name && <span className={errorText}><Icon name="error" size={14} /> {errors.name.message}</span>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={label}>Nilai saat ini *</label>
              <input className={field} {...register("current")} placeholder="mis. 85%" maxLength={40} />
              {errors.current && <span className={errorText}><Icon name="error" size={14} /> {errors.current.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={label}>Ambang (threshold) *</label>
              <input className={field} {...register("threshold")} placeholder="mis. 90%" maxLength={40} />
              {errors.threshold && <span className={errorText}><Icon name="error" size={14} /> {errors.threshold.message}</span>}
            </div>
          </div>
          <p className="text-[11px] text-text-secondary">
            Status terlampaui dihitung otomatis dari angka (asumsi makin tinggi makin buruk).
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-hairline p-6">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" icon="check">{isEdit ? "Simpan" : "Tambah KRI"}</Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
