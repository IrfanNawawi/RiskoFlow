import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/data/store";
import type { ComplianceFormInput } from "@/features/compliance/validation/compliance.schema";

const input: ComplianceFormInput = {
  regulationName: "ISO/IEC 27001",
  description: "Keamanan informasi",
  authority: "ISO",
  industryType: "GENERAL",
  status: "partial",
};

// FR-COMP-1: CRUD requirement custom; FR-COMP-6: regulasi sistem read-only.
describe("compliance CRUD (FR-COMP-1)", () => {
  beforeEach(() => {
    useStore.setState({ activeCompanyId: useStore.getState().companies[0].id });
  });

  it("addCompliance membuat requirement custom (isSystem=false)", () => {
    const id = useStore.getState().addCompliance(input);
    const created = useStore.getState().compliance.find((c) => c.id === id)!;
    expect(created.isSystem).toBe(false);
    expect(created.regulationName).toBe("ISO/IEC 27001");
    expect(created.progress).toBe(50); // partial
  });

  it("updateCompliance mengubah requirement custom", () => {
    const id = useStore.getState().addCompliance(input);
    useStore.getState().updateCompliance(id, { ...input, status: "compliant", description: "Updated" });
    const updated = useStore.getState().compliance.find((c) => c.id === id)!;
    expect(updated.status).toBe("compliant");
    expect(updated.progress).toBe(100);
    expect(updated.description).toBe("Updated");
  });

  it("removeCompliance menghapus custom; regulasi sistem TIDAK terhapus", () => {
    const id = useStore.getState().addCompliance(input);
    useStore.getState().removeCompliance(id);
    expect(useStore.getState().compliance.find((c) => c.id === id)).toBeUndefined();

    const systemReq = useStore.getState().activeCompliance().find((c) => c.isSystem)!;
    useStore.getState().removeCompliance(systemReq.id);
    expect(useStore.getState().compliance.find((c) => c.id === systemReq.id)).toBeTruthy();
  });

  it("duplicateCompliance menyalin regulasi sistem → custom editable (FR-COMP-6)", () => {
    const systemReq = useStore.getState().activeCompliance().find((c) => c.isSystem)!;
    const newId = useStore.getState().duplicateCompliance(systemReq.id);
    const copy = useStore.getState().compliance.find((c) => c.id === newId)!;
    expect(copy.isSystem).toBe(false);
    expect(copy.regulationName).toContain("(salinan)");
    expect(copy.linkedRiskIds).toHaveLength(0);
  });
});
