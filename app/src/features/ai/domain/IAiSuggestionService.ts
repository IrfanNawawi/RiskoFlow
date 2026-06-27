import type { IndustryType, RiskCategory, RiskLevel, RiskSource, TreatmentStrategy } from "@/data/types";

/** Satu usulan risiko dari AI (FR-AI-1) — selalu draft, wajib dikonfirmasi manusia (D6). */
export interface AiRiskSuggestion {
  title: string;
  category: RiskCategory;
  source: RiskSource;
  likelihood: number; // 1..5 (usulan awal, FR-AI-2)
  impact: number; // 1..5
  rationale: string; // alasan singkat, tetap dikonfirmasi manusia
  confidence: number; // 0..100
}

export interface AiSuggestRisksInput {
  industryType: IndustryType;
  departmentName: string;
  /** Judul risiko yang sudah ada → dihindari agar tidak duplikat. */
  existingTitles: string[];
}

/**
 * Kontrak layanan AI milik `domain`. Implementasi nyata WAJIB lewat Edge Function
 * (key LLM di Vault, sanitasi payload — D6/NFR-08); presentation tak pernah memanggil
 * provider AI langsung. Saat ini diimplementasikan `MockAiSuggestionService` (lokal,
 * tanpa LLM) sampai Edge Function tersedia.
 */
/** Usulan rencana mitigasi dari AI (FR-AI-3) — draft, diedit & dikonfirmasi manusia. */
export interface AiTreatmentSuggestion {
  strategy: TreatmentStrategy;
  description: string;
  confidence: number; // 0..100
}

export interface AiSuggestTreatmentInput {
  riskTitle: string;
  category: RiskCategory;
  level: RiskLevel;
}

export interface IAiSuggestionService {
  suggestRisks(input: AiSuggestRisksInput): Promise<AiRiskSuggestion[]>;
  suggestTreatment(input: AiSuggestTreatmentInput): Promise<AiTreatmentSuggestion>;
}
