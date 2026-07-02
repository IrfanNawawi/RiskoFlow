import type {
  AiAssessmentSuggestion,
  AiMonitoringSuggestion,
  AiRiskSuggestion,
  AiSuggestAssessmentInput,
  AiSuggestMonitoringInput,
  AiSuggestRisksInput,
  AiSuggestTreatmentInput,
  AiTreatmentSuggestion,
  IAiSuggestionService,
} from "@/features/ai/domain";
import type { ReviewFrequency, RiskCategory, RiskLevel, TreatmentStrategy } from "@/data/types";
import { AI_RISK_LIBRARY } from "./aiLibrary";

// Heuristik strategi mitigasi per level risiko (FR-AI-3, mock).
const STRATEGY_BY_LEVEL: Record<RiskLevel, { strategy: TreatmentStrategy; verb: string }> = {
  EXTREME: { strategy: "AVOID", verb: "Hentikan/hindari aktivitas pemicu & siapkan kontrol darurat" },
  HIGH: { strategy: "REDUCE", verb: "Terapkan kontrol mitigasi prioritas untuk menurunkan eksposur" },
  MEDIUM: { strategy: "REDUCE", verb: "Perkuat kontrol rutin & pemantauan berkala" },
  LOW: { strategy: "ACCEPT", verb: "Terima dengan justifikasi & pantau ambang" },
};

// Heuristik frekuensi review per level (FR-AI-4, mock): makin tinggi level makin sering ditinjau.
const FREQ_BY_LEVEL: Record<RiskLevel, ReviewFrequency> = {
  EXTREME: "weekly",
  HIGH: "monthly",
  MEDIUM: "monthly",
  LOW: "quarterly",
};

// Kandidat KRI + ambang default per kategori (FR-AI-4, mock).
const KRI_BY_CATEGORY: Record<RiskCategory, { indicatorName: string; threshold: string }> = {
  FINANCIAL: { indicatorName: "Rasio arus kas terhadap kewajiban", threshold: "1.2x" },
  OPERATIONAL: { indicatorName: "Downtime proses / bulan", threshold: "8 jam" },
  LEGAL: { indicatorName: "Temuan kepatuhan terbuka", threshold: "0 temuan" },
  REPUTATIONAL: { indicatorName: "Sentimen negatif publik / bulan", threshold: "5 kejadian" },
  STRATEGIC: { indicatorName: "Deviasi pencapaian target strategis", threshold: "15%" },
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

  async suggestAssessment({ riskTitle, category, source }: AiSuggestAssessmentInput): Promise<AiAssessmentSuggestion> {
    await new Promise((r) => setTimeout(r, 420));
    // Heuristik mock: kategori dampak-berat menaikkan impact; risiko eksternal cenderung lebih sering (likelihood).
    const highImpact = category === "FINANCIAL" || category === "STRATEGIC" || category === "LEGAL";
    const impact = highImpact ? 4 : 3;
    const likelihood = source === "EXTERNAL" ? 4 : 3;
    return {
      likelihood,
      impact,
      rationale: `Estimasi awal untuk "${riskTitle}": ${source === "EXTERNAL" ? "pemicu eksternal cenderung lebih sering terjadi" : "pemicu internal relatif terkendali"}; kategori ${category.toLowerCase()} berdampak ${highImpact ? "material" : "sedang"}.`,
      confidence: 74,
    };
  }

  async suggestMonitoring({ riskTitle, category, level }: AiSuggestMonitoringInput): Promise<AiMonitoringSuggestion> {
    await new Promise((r) => setTimeout(r, 400));
    const reviewFrequency = FREQ_BY_LEVEL[level];
    const { indicatorName, threshold } = KRI_BY_CATEGORY[category];
    const freqLabel = reviewFrequency === "weekly" ? "mingguan" : reviewFrequency === "monthly" ? "bulanan" : "kuartalan";
    return {
      reviewFrequency,
      indicatorName,
      threshold,
      rationale: `Untuk "${riskTitle}" (level ${level}), tinjau ${freqLabel} & pantau "${indicatorName}" terhadap ambang ${threshold}.`,
      confidence: level === "EXTREME" || level === "HIGH" ? 84 : 76,
    };
  }
}
