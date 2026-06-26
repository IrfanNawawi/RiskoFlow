import { describe, it, expect } from "vitest";
import { buildComplianceReportRows } from "@/lib/export";
import type { ComplianceRequirement } from "@/data/types";

const base: ComplianceRequirement = {
  id: "c-1",
  companyId: "co-1",
  industryType: "GENERAL",
  regulationName: "ISO 31000",
  description: "",
  authority: "ISO",
  isSystem: true,
  status: "partial",
  progress: 50,
  linkedRiskIds: [],
};

// FR-COMP-4: laporan kepatuhan + tandai requirement tanpa risiko sebagai GAP.
describe("buildComplianceReportRows (FR-COMP-4)", () => {
  it("requirement tanpa risiko → kolom Gap = 'GAP'", () => {
    const rows = buildComplianceReportRows([base], (id) => id);
    expect(rows[0].Gap).toBe("GAP");
    expect(rows[0]["Risiko Tertaut"]).toBe("—");
  });

  it("requirement bertaut → Gap kosong + kode risiko ter-resolve", () => {
    const withRisk = { ...base, linkedRiskIds: ["r-1", "r-2"] };
    const rows = buildComplianceReportRows([withRisk], (id) => (id === "r-1" ? "R-001" : "R-002"));
    expect(rows[0].Gap).toBe("");
    expect(rows[0]["Risiko Tertaut"]).toBe("R-001, R-002");
  });
});
