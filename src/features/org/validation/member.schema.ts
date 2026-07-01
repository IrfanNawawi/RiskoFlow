import { z } from "zod";

export const MEMBERSHIP_ROLES = ["admin", "risk_manager", "dept_head", "executive", "compliance"] as const;
const roleEnum = z.enum(MEMBERSHIP_ROLES);

/** Undang anggota baru (FR-ORG): email valid + minimal satu peran (multi-role D27). */
export const inviteMemberSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Maksimal 100 karakter"),
  email: z.string().trim().email("Format email tidak valid"),
  roles: z.array(roleEnum).min(1, "Pilih minimal satu peran"),
});

export type InviteMemberFormInput = z.infer<typeof inviteMemberSchema>;

/** Ubah peran anggota yang sudah ada. */
export const memberRolesSchema = z.object({
  roles: z.array(roleEnum).min(1, "Pilih minimal satu peran"),
});

export type MemberRolesFormInput = z.infer<typeof memberRolesSchema>;
