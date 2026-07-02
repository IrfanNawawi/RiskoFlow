import type { SupabaseClient } from "@supabase/supabase-js";
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
import {
  assessmentResponseSchema,
  monitoringResponseSchema,
  risksResponseSchema,
  treatmentResponseSchema,
} from "./aiSchemas";

/** Error layanan AI agar UI bisa membedakannya & menampilkan pesan yang jelas (tanpa fallback). */
export class AiServiceError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

/**
 * Implementasi AI nyata via Supabase Edge Function `ai-suggest` (Edge Function + Gemini, D6).
 * Presentation tak pernah memanggil Gemini langsung — key LLM di server (NFR-08, Aturan inti #10).
 *
 * Bila Edge/Gemini gagal atau respons tak lolos validasi Zod, **melempar `AiServiceError`** (tanpa
 * fallback ke mock) agar kegagalan terlihat jelas di UI — `useMutation` masuk state `isError` dan
 * modal menampilkan pesan, bukan diam-diam mengganti dengan data tiruan.
 */
export class AiEdgeSuggestionService implements IAiSuggestionService {
  constructor(private readonly sb: SupabaseClient) {}

  async suggestRisks(input: AiSuggestRisksInput): Promise<AiRiskSuggestion[]> {
    const { data, error } = await this.sb.functions.invoke("ai-suggest", {
      body: { action: "risks", payload: input },
    });
    if (error) throw new AiServiceError("Gagal menghubungi layanan AI (Edge Function).", error);
    const parsed = risksResponseSchema.safeParse(data);
    if (!parsed.success) throw new AiServiceError("Respons AI tidak valid.", parsed.error);
    return parsed.data.suggestions;
  }

  async suggestTreatment(input: AiSuggestTreatmentInput): Promise<AiTreatmentSuggestion> {
    const { data, error } = await this.sb.functions.invoke("ai-suggest", {
      body: { action: "treatment", payload: input },
    });
    if (error) throw new AiServiceError("Gagal menghubungi layanan AI (Edge Function).", error);
    const parsed = treatmentResponseSchema.safeParse(data);
    if (!parsed.success) throw new AiServiceError("Respons AI tidak valid.", parsed.error);
    return parsed.data.suggestion;
  }

  async suggestAssessment(input: AiSuggestAssessmentInput): Promise<AiAssessmentSuggestion> {
    const { data, error } = await this.sb.functions.invoke("ai-suggest", {
      body: { action: "assessment", payload: input },
    });
    if (error) throw new AiServiceError("Gagal menghubungi layanan AI (Edge Function).", error);
    const parsed = assessmentResponseSchema.safeParse(data);
    if (!parsed.success) throw new AiServiceError("Respons AI tidak valid.", parsed.error);
    return parsed.data.suggestion;
  }

  async suggestMonitoring(input: AiSuggestMonitoringInput): Promise<AiMonitoringSuggestion> {
    const { data, error } = await this.sb.functions.invoke("ai-suggest", {
      body: { action: "monitoring", payload: input },
    });
    if (error) throw new AiServiceError("Gagal menghubungi layanan AI (Edge Function).", error);
    const parsed = monitoringResponseSchema.safeParse(data);
    if (!parsed.success) throw new AiServiceError("Respons AI tidak valid.", parsed.error);
    return parsed.data.suggestion;
  }
}
