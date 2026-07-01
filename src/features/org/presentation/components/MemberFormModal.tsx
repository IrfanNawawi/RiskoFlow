import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useStore } from "@/data/store";
import { Button, Icon } from "@/components/ui";
import { cn } from "@/lib/format";
import { inviteMemberSchema, type InviteMemberFormInput } from "@/features/org/validation/member.schema";
import { ROLE_META, ROLE_ORDER } from "@/features/org/roles";
import type { MembershipRole } from "@/data/types";

type Editing = { userId: string; name: string; email: string; roles: MembershipRole[] };

const EMPTY: InviteMemberFormInput = { name: "", email: "", roles: [] };

export function MemberFormModal({
  open,
  edit,
  onClose,
}: {
  open: boolean;
  edit?: Editing;
  onClose: () => void;
}) {
  const inviteMember = useStore((s) => s.inviteMember);
  const updateMemberRoles = useStore((s) => s.updateMemberRoles);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberFormInput>({ resolver: zodResolver(inviteMemberSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    reset(edit ? { name: edit.name, email: edit.email, roles: edit.roles } : EMPTY);
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

  const onValid = (data: InviteMemberFormInput) => {
    const result = edit ? updateMemberRoles(edit.userId, data.roles) : inviteMember(data);
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
        className="animate-modal-pop flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[24px] border border-border-hairline bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit(onValid)}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-hairline p-6">
          <div>
            <h2 className="font-display text-[22px] font-bold text-on-surface">{edit ? "Ubah Peran Anggota" : "Undang Anggota"}</h2>
            <p className="text-[13px] text-text-secondary">
              {edit ? "Sesuaikan peran anggota di perusahaan ini." : "Tambahkan kolega dengan peran sesuai tanggung jawabnya."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-outline hover:bg-surface-muted">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div className="flex flex-col gap-1.5">
            <label className={label}>Nama *</label>
            <input className={cn(field, edit && "cursor-not-allowed opacity-60")} {...register("name")} placeholder="mis. Sari Wibowo" maxLength={100} disabled={!!edit} />
            {errors.name && <span className={errorText}><Icon name="error" size={14} /> {errors.name.message}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label}>Email *</label>
            <input type="email" className={cn(field, edit && "cursor-not-allowed opacity-60")} {...register("email")} placeholder="nama@perusahaan.id" disabled={!!edit} />
            {errors.email && <span className={errorText}><Icon name="error" size={14} /> {errors.email.message}</span>}
          </div>

          <div className="flex flex-col gap-2">
            <label className={label}>Peran * (bisa lebih dari satu)</label>
            <div className="flex flex-col gap-1.5">
              {ROLE_ORDER.map((role) => (
                <label key={role} className="flex items-start gap-2.5 rounded-[14px] border border-border-hairline bg-surface-muted/40 px-3.5 py-2.5">
                  <input type="checkbox" value={role} {...register("roles")} className="mt-0.5 accent-[var(--color-primary)]" />
                  <span className="leading-tight">
                    <span className="block text-[13px] font-semibold text-on-surface">{ROLE_META[role].label}</span>
                    <span className="block text-[12px] text-text-secondary">{ROLE_META[role].desc}</span>
                  </span>
                </label>
              ))}
            </div>
            {errors.roles && <span className={errorText}><Icon name="error" size={14} /> {errors.roles.message}</span>}
          </div>

          {serverError && (
            <div className="flex items-center gap-2 rounded-[14px] border border-error/30 bg-error-container px-4 py-2.5 text-[13px] font-medium text-on-error-container">
              <Icon name="error" size={16} /> {serverError}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-hairline p-6">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" icon="check">{edit ? "Simpan peran" : "Undang"}</Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
