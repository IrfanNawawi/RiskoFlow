import { describe, it, expect } from "vitest";
import { MockAiSuggestionService } from "@/features/ai/data";

const service = new MockAiSuggestionService();

// FR-AI-1/edge cases: usulan sesuai industri, dedupe judul yang sudah ada.
describe("MockAiSuggestionService", () => {
  it("menghasilkan usulan sesuai industri (≤ 5)", async () => {
    const out = await service.suggestRisks({ industryType: "MANUFACTURE", departmentName: "Produksi", existingTitles: [] });
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(5);
    expect(out.every((s) => s.confidence >= 0 && s.confidence <= 100)).toBe(true);
  });

  it("membuang usulan yang judulnya sudah ada (dedupe, case-insensitive)", async () => {
    const all = await service.suggestRisks({ industryType: "JASA", departmentName: "IT", existingTitles: [] });
    const first = all[0].title;
    const out = await service.suggestRisks({ industryType: "JASA", departmentName: "IT", existingTitles: [first.toUpperCase()] });
    expect(out.some((s) => s.title === first)).toBe(false);
  });

  it("suggestTreatment memilih strategi sesuai level (FR-AI-3)", async () => {
    const extreme = await service.suggestTreatment({ riskTitle: "X", category: "OPERATIONAL", level: "EXTREME" });
    const low = await service.suggestTreatment({ riskTitle: "X", category: "OPERATIONAL", level: "LOW" });
    expect(extreme.strategy).toBe("AVOID");
    expect(low.strategy).toBe("ACCEPT");
    expect(extreme.description).toContain("X");
  });
});
