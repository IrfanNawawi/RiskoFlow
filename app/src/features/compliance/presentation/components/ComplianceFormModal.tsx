import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Icon } from "@/components/ui";
import { cn } from "@/lib/format";
import { complianceFormSchema, type ComplianceFormInput } from "@/features/compliance/validation/compliance.schema";
import { useCreateCompliance, useUpdateCompliance } from "@/features/compliance/presentation/hooks/useComplianceMutations";
import type { ComplianceRequirement } from "@/data/types";

const INDUSTRY_OPTIONS: { value: ComplianceFormInput["industryType"]; label: string }[] = [
  { value: "GENERAL", label: "Umum (GCG/ISO)" },
  { value: "JASA", label: "Jasa" },
  { value: "DAGANG", label: "Dagang" },
  { value: "MANUFACTURE", label: "Manufaktur" },
];
const STATUS_OPTIONS: { value: ComplianceFormInput["status"]; label: string }[] = [
  { value: "compliant", label: "Compliant" },
  { value: "partial", label: "Partial" },
  { value: "non_compliant", label: "Non-Compliant" },
];

const EMPTY: ComplianceFormInput = {
  regulationName: "",
  description: "",
  authority: "",
  industryType: "GENERAL",
  status: "partial",
};

export function ComplianceFormModal({
  open,
  onClose,
  requirement,
}: {
  open: boolean;
  onClose: () => void;
  requirement?: ComplianceRequirement;
}) {
  const createCompliance = useCreateCompliance();
  const updateCompliance = useUpdateCompliance();
  const isEdit = Boolean(requirement);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ComplianceFormInput>({ resolver: zodResolver(complianceFormSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    reset(
      requirement
        ? {
            regulationName: requirement.regulationName,
            description: requirement.description,
            authority: requirement.authority,
            industryType: requirement.industryType,
            status: requirement.status,
          }
        : EMPTY,
    );
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, reset, requirement]);

  if (!open) return null;

  const onValid = async (data: ComplianceFormInput) => {
    if (requirement) await updateCompliance.mutateAsync({ id: requirement.id, input: data });
    else await createCompliance.mutateAsync(data);
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
        className="animate-modal-pop flex max-h-[90vh] w-full max-w-[540px] flex-col overflow-hidden rounded-[24px] border border-border-hairline bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit(onValid)}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-hairline p-6">
          <div>
            <h2 className="font-display text-[20px] font-bold text-on-surface">{isEdit ? "Ubah Regulasi" : "Regulasi Baru"}</h2>
            <p className="text-[13px] text-text-secondary">Requirement kepatuhan custom (FR-COMP-1).</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-outline hover:bg-surface-muted">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div className="flex flex-col gap-1.5">
            <label className={label}>Nama regulasi/standar *</label>
            <input className={field} {...register("regulationName")} placeholder="mis. ISO/IEC 27001" maxLength={150} />
            {errors.regulationName && <span className={errorText}><Icon name="error" size={14} /> {errors.regulationName.message}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label}>Deskripsi *</label>
            <textarea className={cn(field, "min-h-[72px] resize-none")} {...register("description")} placeholder="Ruang lingkup & relevansi…" />
            {errors.description && <span className={errorText}><Icon name="error" size={14} /> {errors.description.message}</span>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={label}>Otoritas *</label>
              <input className={field} {...register("authority")} placeholder="mis. ISO, OJK, Kemnaker" maxLength={100} />
              {errors.authority && <span className={errorText}><Icon name="error" size={14} /> {errors.authority.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={label}>Industri</label>
              <select className={field} {...register("industryType")}>
                {INDUSTRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={label}>Status kepatuhan</label>
              <select className={field} {...register("status")}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-hairline p-6">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" icon="check">{isEdit ? "Simpan perubahan" : "Tambah regulasi"}</Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
