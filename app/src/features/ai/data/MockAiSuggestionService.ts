import type {
  AiRiskSuggestion,
  AiSuggestRisksInput,
  AiSuggestTreatmentInput,
  AiTreatmentSuggestion,
  IAiSuggestionService,
} from "@/features/ai/domain";
import type { RiskLevel, TreatmentStrategy } from "@/data/types";
import { AI_RISK_LIBRARY } from "./aiLibrary";

// Heuristik strategi mitigasi per level risiko (FR-AI-3, mock).
const STRATEGY_BY_LEVEL: Record<RiskLevel, { strategy: TreatmentStrategy; verb: string }> = {
  EXTREME: { strategy: "AVOID", verb: "Hentikan/hindari aktivitas pemicu & siapkan kontrol darurat" },
  HIGH: { strategy: "REDUCE", verb: "Terapkan kontrol mitigasi prioritas untuk menurunkan eksposur" },
  MEDIUM: { strategy: "REDUCE", verb: "Perkuat kontrol rutin & pemantauan berkala" },
  LOW: { strategy: "ACCEPT", verb: "Terima dengan justifikasi & pantau ambang" },
};

/**
 * Implementasi AI **mock** (tanpa LLM) — memilih kandidat dari `AI_RISK_LIBRARY` sesuai
 * industri, membuang yang judulnya sudah ada (dedupe, FR-AI edge case), dan menyetel
 * sedikit confidence sesuai relevansi nama departemen. Async + delay kecil meniru panggilan
 * jaringan agar UI loading state ter-uji.
 *
 * ⚠️ Pengganti sementara `AiEdgeSuggestionService` (Edge Function + Gemini, D6). Tak ada
 * data sensitif dikirim ke mana pun (semuanya lokal).
 */
export class MockAiSuggestionService implements IAiSuggestionService {
  async suggestRisks({ industryType, departmentName, existingTitles }: AiSuggestRisksInput): Promise<AiRiskSuggestion[]> {
    await new Promise((r) => setTimeout(r, 450));

    const seen = new Set(existingTitles.map((t) => t.trim().toLowerCase()));
    const dept = departmentName.trim().toLowerCase();

    return AI_RISK_LIBRARY[industryType]
      .filter((s) => !seen.has(s.title.toLowerCase()))
      .map((s) => {
        // Naikkan confidence bila kata kunci kategori/judul relevan dengan nama departemen.
        const relevant =
          dept.length > 0 &&
          (s.title.toLowerCase().includes(dept) || dept.includes(s.category.toLowerCase()));
        return relevant ? { ...s, confidence: Math.min(99, s.confidence + 5) } : s;
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  async suggestTreatment({ riskTitle, category, level }: AiSuggestTreatmentInput): Promise<AiTreatmentSuggestion> {
    await new Promise((r) => setTimeout(r, 400));
    const { strategy, verb } = STRATEGY_BY_LEVEL[level];
    return {
      strategy,
      description: `${verb} untuk "${riskTitle}" (${category.toLowerCase()}). Tetapkan PIC & tenggat, ukur efektivitas via KRI.`,
      confidence: level === "EXTREME" || level === "HIGH" ? 86 : 78,
    };
  }
}
