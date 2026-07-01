import type { MembershipRole } from "@/data/types";

/** Metadata peran keanggotaan (label + deskripsi UI, Bahasa Indonesia). D27: multi-role. */
export const ROLE_META: Record<MembershipRole, { label: string; desc: string }> = {
  admin: { label: "Admin", desc: "Kelola perusahaan, departemen, & anggota" },
  risk_manager: { label: "Risk Manager", desc: "Kelola risiko lintas departemen & setujui ACCEPT" },
  dept_head: { label: "Kepala Departemen", desc: "Kelola risiko & insiden departemennya" },
  executive: { label: "Eksekutif", desc: "Akses baca — dashboard & laporan" },
  compliance: { label: "Compliance", desc: "Kelola kepatuhan & pemetaan regulasi" },
};

export const ROLE_ORDER: MembershipRole[] = ["admin", "risk_manager", "dept_head", "executive", "compliance"];
