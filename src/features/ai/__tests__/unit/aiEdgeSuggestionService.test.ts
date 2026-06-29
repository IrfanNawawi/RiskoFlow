import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AiEdgeSuggestionService } from "@/features/ai/data";
import type { AiSuggestRisksInput, AiSuggestTreatmentInput } from "@/features/ai/domain";

// Buat SupabaseClient palsu yang hanya mengekspos `functions.invoke`.
const makeSb = (invoke: ReturnType<typeof vi.fn>): SupabaseClient =>
  ({ functions: { invoke } }) as unknown as SupabaseClient;

const risksInput: AiSuggestRisksInput = { industryType: "JASA", departmentName: "IT", existingTitles: [] };
const treatmentInput: AiSuggestTreatmentInput = { riskTitle: "Kebocoran data", category: "OPERATIONAL", level: "HIGH" };

describe("AiEdgeSuggestionService", () => {
  it("mengembalikan suggestion ter-validasi saat Edge sukses", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        suggestions: [
          { title: "Insiden siber", category: "OPERATIONAL", source: "EXTERNAL", likelihood: 3, impact: 4, rationale: "r", confidence: 80 },
        ],
      },
      error: null,
    });
    const svc = new AiEdgeSuggestionService(makeSb(invoke));

    const out = await svc.suggestRisks(risksInput);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Insiden siber");
  });

  it("mengirim hanya payload non-sensitif (action + input) ke Edge Function", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { suggestions: [] }, error: null });
    const svc = new AiEdgeSuggestionService(makeSb(invoke));

    await svc.suggestRisks(risksInput);
    expect(invoke).toHaveBeenCalledWith("ai-suggest", {
      body: { action: "risks", payload: risksInput },
    });
  });

  it("melempar AiServiceError saat Edge mengembalikan error (tanpa fallback)", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: new Error("boom") });
    const svc = new AiEdgeSuggestionService(makeSb(invoke));

    await expect(svc.suggestRisks(risksInput)).rejects.toThrow(/layanan AI/i);
  });

  it("melempar saat respons tak lolos validasi Zod", async () => {
    // likelihood di luar 1..5 → schema gagal → error.
    const invoke = vi.fn().mockResolvedValue({
      data: { suggestions: [{ title: "X", category: "OPERATIONAL", source: "INTERNAL", likelihood: 9, impact: 3, rationale: "r", confidence: 80 }] },
      error: null,
    });
    const svc = new AiEdgeSuggestionService(makeSb(invoke));

    await expect(svc.suggestRisks(risksInput)).rejects.toThrow(/tidak valid/i);
  });

  it("suggestTreatment mengembalikan hasil Edge & melempar saat gagal", async () => {
    const okInvoke = vi.fn().mockResolvedValue({
      data: { suggestion: { strategy: "AVOID", description: "Hentikan aktivitas", confidence: 90 } },
      error: null,
    });
    const ok = new AiEdgeSuggestionService(makeSb(okInvoke));
    expect((await ok.suggestTreatment(treatmentInput)).strategy).toBe("AVOID");

    const failInvoke = vi.fn().mockResolvedValue({ data: null, error: new Error("network") });
    const fail = new AiEdgeSuggestionService(makeSb(failInvoke));
    await expect(fail.suggestTreatment(treatmentInput)).rejects.toThrow();
  });
});
