import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/data/store";

const draft = {
  title: "Risiko AI uji",
  description: "rasional",
  category: "OPERATIONAL",
  source: "INTERNAL",
  departmentId: "d-1",
  ownerId: "u-1",
  likelihood: 4,
  impact: 3,
} as const;

// FR-AI-1 + FR-RISK-5: draft AI masuk aiSuggested=true, status identified, dikecualikan agregat.
describe("addAiSuggestedRisks (FR-AI-1)", () => {
  beforeEach(() => {
    useStore.setState({ activeCompanyId: useStore.getState().companies[0].id });
  });

  it("membuat draft aiSuggested=true berstatus identified", () => {
    const ids = useStore.getState().addAiSuggestedRisks([draft, { ...draft, title: "Risiko AI uji 2" }]);
    expect(ids).toHaveLength(2);
    const created = useStore.getState().risks.filter((r) => ids.includes(r.id));
    expect(created.every((r) => r.aiSuggested && r.status === "identified")).toBe(true);
    expect(created[0].inherent.severity).toBe(12); // 4 × 3
  });
});
