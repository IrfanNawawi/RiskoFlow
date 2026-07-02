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

  it("suggestAssessment mengusulkan likelihood/impact 1..5 sesuai sumber & kategori (FR-AI-2)", async () => {
    const ext = await service.suggestAssessment({ riskTitle: "X", category: "FINANCIAL", source: "EXTERNAL", industryType: "JASA" });
    const int = await service.suggestAssessment({ riskTitle: "X", category: "OPERATIONAL", source: "INTERNAL", industryType: "JASA" });
    for (const s of [ext, int]) {
      expect(s.likelihood).toBeGreaterThanOrEqual(1);
      expect(s.likelihood).toBeLessThanOrEqual(5);
      expect(s.impact).toBeGreaterThanOrEqual(1);
      expect(s.impact).toBeLessThanOrEqual(5);
      expect(s.confidence).toBeGreaterThanOrEqual(0);
    }
    // Sumber eksternal → likelihood lebih tinggi; kategori dampak-berat → impact lebih tinggi.
    expect(ext.likelihood).toBeGreaterThan(int.likelihood);
    expect(ext.impact).toBeGreaterThan(int.impact);
  });

  it("suggestMonitoring menyetel frekuensi review sesuai level (FR-AI-4)", async () => {
    const extreme = await service.suggestMonitoring({ riskTitle: "X", category: "OPERATIONAL", level: "EXTREME" });
    const low = await service.suggestMonitoring({ riskTitle: "X", category: "OPERATIONAL", level: "LOW" });
    expect(extreme.reviewFrequency).toBe("weekly");
    expect(low.reviewFrequency).toBe("quarterly");
    expect(extreme.indicatorName.length).toBeGreaterThan(0);
    expect(extreme.threshold.length).toBeGreaterThan(0);
  });
});
