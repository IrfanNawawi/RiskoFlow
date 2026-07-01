import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { Card, Icon, Button, EmptyState } from "@/components/ui";
import { ROLE_META, ROLE_ORDER } from "@/features/org/roles";
import { DepartmentFormModal } from "../components/DepartmentFormModal";
import { MemberFormModal } from "../components/MemberFormModal";
import type { Department, MembershipRole } from "@/data/types";

type MemberEdit = { userId: string; name: string; email: string; roles: MembershipRole[] };

export function OrgPage() {
  const company = useStore((s) => s.activeCompany());
  const departments = useStore(useShallow((s) => s.activeDepartments()));
  const members = useStore(useShallow((s) => s.activeMembers()));
  const risks = useStore(useShallow((s) => s.activeRisks()));
  const userById = useStore((s) => s.userById);
  const canAdmin = useStore((s) => s.can("admin"));
  const archiveDepartment = useStore((s) => s.archiveDepartment);
  const removeMember = useStore((s) => s.removeMember);

  const [deptModal, setDeptModal] = useState<{ open: boolean; edit?: Department }>({ open: false });
  const [memberModal, setMemberModal] = useState<{ open: boolean; edit?: MemberEdit }>({ open: false });
  const [notice, setNotice] = useState<string | null>(null);

  // Jumlah risiko aktif per departemen (untuk kolom & konteks guard arsip).
  const riskCountByDept = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of risks) map.set(r.departmentId, (map.get(r.departmentId) ?? 0) + 1);
    return map;
  }, [risks]);

  const onArchive = (dept: Department) => {
    setNotice(null);
    if (!window.confirm(`Arsipkan departemen "${dept.name}"?`)) return;
    const result = archiveDepartment(dept.id);
    if (!result.ok) setNotice(result.reason);
  };

  const onRemoveMember = (userId: string, name: string) => {
    setNotice(null);
    if (!window.confirm(`Keluarkan ${name} dari ${company.name}?`)) return;
    const result = removeMember(userId);
    if (!result.ok) setNotice(result.reason);
  };

  const sortRoles = (roles: MembershipRole[]) => [...roles].sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-bold text-on-surface">Organisasi</h1>
          <p className="text-[14px] text-text-secondary">Kelola departemen, anggota, & peran di {company.name}.</p>
        </div>
      </div>

      {!canAdmin && (
        <div className="flex items-center gap-2 rounded-[14px] border border-border-hairline bg-surface-muted/50 px-4 py-2.5 text-[13px] text-text-secondary">
          <Icon name="lock" size={16} /> Hanya <span className="font-semibold">Admin</span> yang dapat mengubah struktur organisasi. Anda melihat mode baca.
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-2 rounded-[14px] border border-error/30 bg-error-container px-4 py-2.5 text-[13px] font-medium text-on-error-container">
          <Icon name="error" size={16} /> {notice}
          <button className="ml-auto text-on-error-container/70 hover:text-on-error-container" onClick={() => setNotice(null)} aria-label="Tutup">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* Departemen */}
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="corporate_fare" size={20} className="text-outline" />
            <h2 className="font-display text-[18px] font-bold text-on-surface">Departemen</h2>
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[12px] font-semibold text-text-secondary">{departments.length}</span>
          </div>
          {canAdmin && (
            <Button size="sm" icon="add" onClick={() => setDeptModal({ open: true })}>Tambah departemen</Button>
          )}
        </div>

        {departments.length === 0 ? (
          <EmptyState icon="corporate_fare" title="Belum ada departemen" hint="Tambahkan unit organisasi pemilik risiko." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-border-hairline text-left text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
                  <th className="py-2 pr-3">Departemen</th>
                  <th className="py-2 pr-3">Kepala</th>
                  <th className="py-2 pr-3 text-right">Risiko aktif</th>
                  {canAdmin && <th className="py-2 pl-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id} className="border-b border-border-hairline/60 last:border-0">
                    <td className="py-2.5 pr-3">
                      <div className="font-semibold text-on-surface">{d.name}</div>
                      {d.description && <div className="text-[12px] text-text-secondary">{d.description}</div>}
                    </td>
                    <td className="py-2.5 pr-3 text-on-surface-variant">{d.headUserId ? userById(d.headUserId)?.name ?? "—" : "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-on-surface-variant">{riskCountByDept.get(d.id) ?? 0}</td>
                    {canAdmin && (
                      <td className="py-2.5 pl-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setDeptModal({ open: true, edit: d })} className="flex h-8 w-8 items-center justify-center rounded-full text-outline hover:bg-surface-muted hover:text-primary" aria-label={`Ubah ${d.name}`}>
                            <Icon name="edit" size={17} />
                          </button>
                          <button onClick={() => onArchive(d)} className="flex h-8 w-8 items-center justify-center rounded-full text-outline hover:bg-error-container hover:text-error" aria-label={`Arsipkan ${d.name}`}>
                            <Icon name="archive" size={17} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Anggota & Peran */}
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="groups" size={20} className="text-outline" />
            <h2 className="font-display text-[18px] font-bold text-on-surface">Anggota & Peran</h2>
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[12px] font-semibold text-text-secondary">{members.length}</span>
          </div>
          {canAdmin && (
            <Button size="sm" icon="person_add" onClick={() => setMemberModal({ open: true })}>Undang anggota</Button>
          )}
        </div>

        {members.length === 0 ? (
          <EmptyState icon="groups" title="Belum ada anggota" hint="Undang kolega untuk berkolaborasi." />
        ) : (
          <div className="flex flex-col divide-y divide-border-hairline/60">
            {members.map((m) => (
              <div key={m.membershipId} className="flex items-center gap-3 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-[13px] font-bold text-on-primary-container">
                  {m.user.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-on-surface">{m.user.name}</div>
                  <div className="truncate text-[12px] text-text-secondary">{m.user.email}</div>
                </div>
                <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
                  {sortRoles(m.roles).map((r) => (
                    <span key={r} className="rounded-full border border-border-hairline bg-surface-muted/60 px-2.5 py-0.5 text-[12px] font-medium text-on-surface-variant">
                      {ROLE_META[r].label}
                    </span>
                  ))}
                </div>
                {canAdmin && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setMemberModal({ open: true, edit: { userId: m.user.id, name: m.user.name, email: m.user.email, roles: m.roles } })}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-outline hover:bg-surface-muted hover:text-primary"
                      aria-label={`Ubah peran ${m.user.name}`}
                    >
                      <Icon name="edit" size={17} />
                    </button>
                    <button
                      onClick={() => onRemoveMember(m.user.id, m.user.name)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-outline hover:bg-error-container hover:text-error"
                      aria-label={`Keluarkan ${m.user.name}`}
                    >
                      <Icon name="person_remove" size={17} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <DepartmentFormModal open={deptModal.open} edit={deptModal.edit} onClose={() => setDeptModal({ open: false })} />
      <MemberFormModal open={memberModal.open} edit={memberModal.edit} onClose={() => setMemberModal({ open: false })} />
    </div>
  );
}
