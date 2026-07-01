import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/data/store";
import * as seed from "@/data/seed";

// FR-ORG: departemen & anggota (guard ditiru dari trigger DB target FR-ORG-002).
// Reset slice terkait dari seed tiap test agar tidak saling kontaminasi.
beforeEach(() => {
  useStore.setState({
    activeCompanyId: seed.company.id,
    currentUserId: seed.currentUserId,
    demoRole: "all",
    users: [...seed.users],
    memberships: seed.memberships.map((m) => ({ ...m, roles: [...m.roles] })),
    departments: seed.departments.map((d) => ({ ...d })),
    risks: [...seed.risks],
    incidents: [...seed.incidents],
  });
});

describe("departemen (FR-ORG)", () => {
  it("addDepartment membuat departemen & menolak nama duplikat (case-insensitive)", () => {
    const before = useStore.getState().activeDepartments().length;
    expect(useStore.getState().addDepartment({ name: "Riset & Pengembangan" }).ok).toBe(true);
    expect(useStore.getState().activeDepartments()).toHaveLength(before + 1);

    const dup = useStore.getState().addDepartment({ name: "riset & pengembangan" });
    expect(dup).toEqual({ ok: false, reason: expect.stringContaining("sudah ada") });
  });

  it("archiveDepartment ditolak bila masih ada risiko aktif (FR-ORG-002)", () => {
    useStore.getState().addDepartment({ name: "Logistik" });
    const dept = useStore.getState().activeDepartments().find((d) => d.name === "Logistik")!;
    useStore.getState().addRisk({
      title: "Keterlambatan pengiriman", description: "", category: "OPERATIONAL", source: "INTERNAL",
      departmentId: dept.id, ownerId: seed.currentUserId, likelihood: 3, impact: 3,
    });

    const result = useStore.getState().archiveDepartment(dept.id);
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("aktif") });
    expect(useStore.getState().activeDepartments().some((d) => d.id === dept.id)).toBe(true);
  });

  it("archiveDepartment sukses (soft delete) bila tak ada risiko/insiden aktif", () => {
    useStore.getState().addDepartment({ name: "Humas" });
    const dept = useStore.getState().activeDepartments().find((d) => d.name === "Humas")!;

    expect(useStore.getState().archiveDepartment(dept.id).ok).toBe(true);
    // Hilang dari daftar aktif, tetapi masih ada (archivedAt terisi) untuk audit.
    expect(useStore.getState().activeDepartments().some((d) => d.id === dept.id)).toBe(false);
    expect(useStore.getState().departments.find((d) => d.id === dept.id)?.archivedAt).toBeTruthy();
  });
});

describe("anggota & peran (FR-ORG)", () => {
  it("inviteMember menambah anggota; email yang sudah anggota ditolak", () => {
    const before = useStore.getState().activeMembers().length;
    expect(useStore.getState().inviteMember({ name: "Nina Kartika", email: "nina@majumanufaktur.id", roles: ["dept_head"] }).ok).toBe(true);
    expect(useStore.getState().activeMembers()).toHaveLength(before + 1);

    // Email milik anggota eksisting (u-budi) → ditolak.
    const dup = useStore.getState().inviteMember({ name: "Budi", email: "budi@majumanufaktur.id", roles: ["executive"] });
    expect(dup).toEqual({ ok: false, reason: expect.stringContaining("sudah menjadi anggota") });
  });

  it("updateMemberRoles menolak menurunkan admin terakhir (FR-ORG-002)", () => {
    // Seed: u-budi satu-satunya admin di perusahaan aktif.
    const result = useStore.getState().updateMemberRoles(seed.currentUserId, ["risk_manager"]);
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("admin") });
  });

  it("updateMemberRoles sukses menurunkan admin bila masih ada admin lain", () => {
    useStore.getState().inviteMember({ name: "Admin Kedua", email: "admin2@majumanufaktur.id", roles: ["admin"] });
    const result = useStore.getState().updateMemberRoles(seed.currentUserId, ["risk_manager"]);
    expect(result.ok).toBe(true);
    const budi = useStore.getState().activeMembers().find((m) => m.user.id === seed.currentUserId)!;
    expect(budi.roles).toEqual(["risk_manager"]);
  });

  it("removeMember menolak mengeluarkan admin terakhir", () => {
    expect(useStore.getState().removeMember(seed.currentUserId)).toEqual({ ok: false, reason: expect.stringContaining("admin") });
  });
});
