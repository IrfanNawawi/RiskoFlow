import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/data/store";

// Verifikasi invariant FR-COMP-2: pemetaan m:n tetap konsisten dua arah
// (risk.complianceIds ↔ requirement.linkedRiskIds).
describe("setComplianceMapping (FR-COMP-2)", () => {
  beforeEach(() => {
    // Pakai data seed perusahaan aktif.
    useStore.setState({ activeCompanyId: useStore.getState().companies[0].id });
  });

  it("menautkan risiko menyinkronkan kedua sisi + set status", () => {
    const s = useStore.getState();
    const requirement = s.activeCompliance()[0];
    const risk = s.activeRisks()[0];

    s.setComplianceMapping(requirement.id, [risk.id], "compliant");

    const updatedReq = useStore.getState().compliance.find((c) => c.id === requirement.id)!;
    const updatedRisk = useStore.getState().risks.find((r) => r.id === risk.id)!;
    expect(updatedReq.linkedRiskIds).toContain(risk.id);
    expect(updatedReq.status).toBe("compliant");
    expect(updatedRisk.complianceIds).toContain(requirement.id);
  });

  it("melepas tautan menghapus dari kedua sisi", () => {
    const s = useStore.getState();
    const requirement = s.activeCompliance()[0];
    const risk = s.activeRisks()[0];
    s.setComplianceMapping(requirement.id, [risk.id], "partial");

    s.setComplianceMapping(requirement.id, [], "non_compliant");

    const updatedReq = useStore.getState().compliance.find((c) => c.id === requirement.id)!;
    const updatedRisk = useStore.getState().risks.find((r) => r.id === risk.id)!;
    expect(updatedReq.linkedRiskIds).not.toContain(risk.id);
    expect(updatedRisk.complianceIds).not.toContain(requirement.id);
  });
});
