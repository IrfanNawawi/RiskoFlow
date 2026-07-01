import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { Button, Icon } from "@/components/ui";
import { departmentSchema, type DepartmentFormInput } from "@/features/org/validation/department.schema";
import type { Department } from "@/data/types";

const EMPTY: DepartmentFormInput = { name: "", description: "", headUserId: "" };

export function DepartmentFormModal({
  open,
  edit,
  onClose,
}: {
  open: boolean;
  edit?: Department;
  onClose: () => void;
}) {
  const members = useStore(useShallow((s) => s.activeMembers()));
  const addDepartment = useStore((s) => s.addDepartment);
  const updateDepartment = useStore((s) => s.updateDepartment);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentFormInput>({ resolver: zodResolver(departmentSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    reset(edit ? { name: edit.name, description: edit.description ?? "", headUserId: edit.headUserId ?? "" } : EMPTY);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, edit, onClose, reset]);

  if (!open) return null;

  const onValid = (data: DepartmentFormInput) => {
    const result = edit ? updateDepartment(edit.id, data) : addDepartment(data);
    if (!result.ok) {
      setServerError(result.reason);
      return;
    }
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
        className="animate-modal-pop flex w-full max-w-[520px] flex-col overflow-hidden rounded-[24px] border border-border-hairline bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit(onValid)}
      >
        <div className="flex items-center justify-between border-b border-border-hairline p-6">
          <div>
            <h2 className="font-display text-[22px] font-bold text-on-surface">{edit ? "Ubah Departemen" : "Departemen Baru"}</h2>
            <p className="text-[13px] text-text-secondary">Unit organisasi pemilik risiko & insiden.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-outline hover:bg-surface-muted">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <label className={label}>Nama departemen *</label>
            <input className={field} {...register("name")} placeholder="mis. Keuangan" maxLength={80} autoFocus />
            {errors.name && <span className={errorText}><Icon name="error" size={14} /> {errors.name.message}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label}>Deskripsi</label>
            <input className={field} {...register("description")} placeholder="Ringkas fungsi departemen…" maxLength={200} />
            {errors.description && <span className={errorText}><Icon name="error" size={14} /> {errors.description.message}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label}>Kepala departemen</label>
            <select className={field} {...register("headUserId")}>
              <option value="">— Belum ditentukan —</option>
              {members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
            </select>
          </div>

          {serverError && (
            <div className="flex items-center gap-2 rounded-[14px] border border-error/30 bg-error-container px-4 py-2.5 text-[13px] font-medium text-on-error-container">
              <Icon name="error" size={16} /> {serverError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-hairline p-6">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" icon="check">{edit ? "Simpan" : "Tambah"}</Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
