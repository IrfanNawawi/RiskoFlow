import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/data/store";

// FR-INC-2: tautkan insiden ke risiko (mis. setelah "buat risiko dari insiden").
describe("linkIncidentRisk (FR-INC-2)", () => {
  beforeEach(() => {
    useStore.setState({ activeCompanyId: useStore.getState().companies[0].id });
  });

  it("menambahkan riskId ke incident.riskIds (idempoten)", () => {
    const incident = useStore.getState().activeIncidents()[0];
    const before = incident.riskIds.length;

    useStore.getState().linkIncidentRisk(incident.id, "r-baru");
    useStore.getState().linkIncidentRisk(incident.id, "r-baru"); // tidak menduplikasi

    const updated = useStore.getState().incidents.find((i) => i.id === incident.id)!;
    expect(updated.riskIds).toContain("r-baru");
    expect(updated.riskIds.length).toBe(before + 1);
  });
});
