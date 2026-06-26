import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/data/store";
import type { ReviewInput } from "@/features/risks/validation/review.schema";

// FR-MON-2: review memperbarui penilaian aktif + jadwal review. Residual hanya saat ada mitigasi.
describe("recordReview (FR-MON-2)", () => {
  beforeEach(() => {
    useStore.setState({ activeCompanyId: useStore.getState().companies[0].id });
  });

  it("risiko bermitigasi → review menulis penilaian RESIDUAL + memajukan nextReviewDate", () => {
    const s = useStore.getState();
    const risk = s.activeRisks().find((r) => r.treatments.length > 0);
    expect(risk).toBeTruthy();
    const input: ReviewInput = { likelihood: 2, impact: 2, status: "monitored", reviewFrequency: "weekly", note: "ok" };

    s.recordReview(risk!.id, input);

    const updated = useStore.getState().risks.find((r) => r.id === risk!.id)!;
    expect(updated.residual?.kind).toBe("residual");
    expect(updated.residual?.severity).toBe(4); // 2 × 2
    expect(updated.status).toBe("monitored");
    expect(updated.reviewFrequency).toBe("weekly");
    expect(new Date(updated.nextReviewDate).getTime()).toBeGreaterThan(Date.now());
  });

  it("risiko tanpa mitigasi → review me-reassess INHERENT", () => {
    const s = useStore.getState();
    const risk = s.activeRisks().find((r) => r.treatments.length === 0);
    expect(risk).toBeTruthy();

    s.recordReview(risk!.id, { likelihood: 5, impact: 5, status: "assessed", reviewFrequency: "monthly" });

    const updated = useStore.getState().risks.find((r) => r.id === risk!.id)!;
    expect(updated.inherent.severity).toBe(25);
    expect(updated.residual).toBeUndefined();
  });
});
