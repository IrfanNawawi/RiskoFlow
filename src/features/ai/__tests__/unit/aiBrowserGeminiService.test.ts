import { afterEach, describe, expect, it, vi } from "vitest";
import { AiBrowserGeminiService } from "@/features/ai/data";
import type { AiSuggestRisksInput, AiSuggestTreatmentInput } from "@/features/ai/domain";

const risksInput: AiSuggestRisksInput = { industryType: "JASA", departmentName: "IT", existingTitles: [] };
const treatmentInput: AiSuggestTreatmentInput = { riskTitle: "Kebocoran data", category: "OPERATIONAL", level: "HIGH" };

// Bungkus teks JSON sebagai bentuk respons Gemini generateContent.
const geminiOk = (jsonText: string) => ({
  ok: true,
  json: async () => ({ candidates: [{ content: { parts: [{ text: jsonText }] } }] }),
});

afterEach(() => vi.restoreAllMocks());

describe("AiBrowserGeminiService (dev-only)", () => {
  it("memanggil endpoint Gemini dengan key & menormalkan keluaran risks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      geminiOk(JSON.stringify([
        // likelihood 9 sengaja di luar 1..5 → harus di-clamp ke 5 oleh normalizer.
        { title: "Insiden siber", category: "OPERATIONAL", source: "EXTERNAL", likelihood: 9, impact: 4, rationale: "r", confidence: 80 },
      ])),
    );
    vi.stubGlobal("fetch", fetchMock);

    const out = await new AiBrowserGeminiService("KEY123").suggestRisks(risksInput);
    expect(out).toHaveLength(1);
    expect(out[0].likelihood).toBe(5); // ter-clamp
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).toContain("key=KEY123");
  });

  it("menormalkan keluaran treatment", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      geminiOk(JSON.stringify({ strategy: "AVOID", description: "Hentikan aktivitas", confidence: 90 })),
    ));
    const out = await new AiBrowserGeminiService("K").suggestTreatment(treatmentInput);
    expect(out.strategy).toBe("AVOID");
    expect(out.description).toContain("Hentikan");
  });

  it("melempar AiServiceError saat HTTP gagal", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "rate limit" }));
    await expect(new AiBrowserGeminiService("K").suggestRisks(risksInput)).rejects.toThrow(/Gemini/i);
  });

  it("melempar saat keluaran bukan JSON valid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiOk("bukan json")));
    await expect(new AiBrowserGeminiService("K").suggestRisks(risksInput)).rejects.toThrow();
  });
});
