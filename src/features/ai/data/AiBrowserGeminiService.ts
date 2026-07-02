import { z } from "zod";
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
import { AiServiceError } from "./AiEdgeSuggestionService";
import {
  ASSESSMENT_GEMINI_SCHEMA,
  GEMINI_MODEL,
  MONITORING_GEMINI_SCHEMA,
  RISKS_GEMINI_SCHEMA,
  TREATMENT_GEMINI_SCHEMA,
  assessmentSuggestionSchema,
  buildAssessmentPrompt,
  buildMonitoringPrompt,
  buildRisksPrompt,
  buildTreatmentPrompt,
  monitoringSuggestionSchema,
  normalizeAssessment,
  normalizeMonitoring,
  normalizeRisks,
  normalizeTreatment,
  riskSuggestionSchema,
  treatmentSuggestionSchema,
} from "./aiSchemas";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * ⚠️ **DEV-ONLY.** Memanggil Gemini **langsung dari browser** memakai `VITE_GEMINI_API_KEY`,
 * agar fitur AI bisa dites lokal tanpa Supabase CLI/Docker (mode B). Implementasi nyata/produksi
 * tetap `AiEdgeSuggestionService` (Edge Function, key di server — D6/NFR-08, Aturan inti #10):
 * di sini key **terekspos di bundle browser**, jadi jangan dipakai di produksi.
 *
 * Logika prompt/skema/normalisasi dibagikan dengan jalur Edge lewat `aiSchemas.ts`.
 */
export class AiBrowserGeminiService implements IAiSuggestionService {
  constructor(private readonly apiKey: string) {
    console.warn(
      "[AiBrowserGeminiService] DEV-ONLY: memanggil Gemini langsung dari browser; API key terekspos. Jangan dipakai di produksi.",
    );
  }

  private async call(prompt: string, schema: unknown): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(`${GEMINI_URL}?key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.4 },
        }),
      });
    } catch (err) {
      throw new AiServiceError("Gagal menghubungi Gemini (jaringan).", err);
    }
    if (!res.ok) {
      throw new AiServiceError(`Gemini menolak permintaan (HTTP ${res.status}).`, await res.text());
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") throw new AiServiceError("Respons Gemini tanpa teks.", data);
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new AiServiceError("Keluaran Gemini bukan JSON valid.", err);
    }
  }

  async suggestRisks(input: AiSuggestRisksInput): Promise<AiRiskSuggestion[]> {
    const raw = await this.call(buildRisksPrompt(input), RISKS_GEMINI_SCHEMA);
    const parsed = z.array(riskSuggestionSchema).safeParse(normalizeRisks(raw));
    if (!parsed.success) throw new AiServiceError("Respons AI tidak valid.", parsed.error);
    return parsed.data;
  }

  async suggestTreatment(input: AiSuggestTreatmentInput): Promise<AiTreatmentSuggestion> {
    const raw = await this.call(buildTreatmentPrompt(input), TREATMENT_GEMINI_SCHEMA);
    const parsed = treatmentSuggestionSchema.safeParse(normalizeTreatment(raw as Record<string, unknown>));
    if (!parsed.success) throw new AiServiceError("Respons AI tidak valid.", parsed.error);
    return parsed.data;
  }

  async suggestAssessment(input: AiSuggestAssessmentInput): Promise<AiAssessmentSuggestion> {
    const raw = await this.call(buildAssessmentPrompt(input), ASSESSMENT_GEMINI_SCHEMA);
    const parsed = assessmentSuggestionSchema.safeParse(normalizeAssessment(raw as Record<string, unknown>));
    if (!parsed.success) throw new AiServiceError("Respons AI tidak valid.", parsed.error);
    return parsed.data;
  }

  async suggestMonitoring(input: AiSuggestMonitoringInput): Promise<AiMonitoringSuggestion> {
    const raw = await this.call(buildMonitoringPrompt(input), MONITORING_GEMINI_SCHEMA);
    const parsed = monitoringSuggestionSchema.safeParse(normalizeMonitoring(raw as Record<string, unknown>));
    if (!parsed.success) throw new AiServiceError("Respons AI tidak valid.", parsed.error);
    return parsed.data;
  }
}
