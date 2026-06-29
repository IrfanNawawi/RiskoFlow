import { z } from "zod";
import type {
  AiRiskSuggestion,
  AiSuggestRisksInput,
  AiSuggestTreatmentInput,
  AiTreatmentSuggestion,
} from "@/features/ai/domain";

/**
 * Schema, prompt, & normalizer AI yang dipakai bersama oleh datasource klien:
 * - `AiEdgeSuggestionService` memvalidasi **envelope** balasan Edge Function (`{ suggestions }` / `{ suggestion }`).
 * - `AiBrowserGeminiService` (dev-only) memanggil Gemini langsung, lalu menormalkan + memvalidasi keluaran mentah.
 *
 * Edge Function (`supabase/functions/ai-suggest/index.ts`, Deno) menyimpan salinannya sendiri karena
 * runtime-nya terpisah; logika di sini adalah cerminannya untuk sisi klien.
 */

export const GEMINI_MODEL = "gemini-3.1-flash-lite";

const RISK_CATEGORIES = ["FINANCIAL", "OPERATIONAL", "LEGAL", "REPUTATIONAL", "STRATEGIC"] as const;
const RISK_SOURCES = ["INTERNAL", "EXTERNAL"] as const;
const TREATMENT_STRATEGIES = ["AVOID", "REDUCE", "TRANSFER", "ACCEPT"] as const;

// ── Validasi akhir (Aturan inti #9) ──
export const riskSuggestionSchema = z.object({
  title: z.string().min(1),
  category: z.enum(RISK_CATEGORIES),
  source: z.enum(RISK_SOURCES),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  rationale: z.string(),
  confidence: z.number().int().min(0).max(100),
}) satisfies z.ZodType<AiRiskSuggestion>;

export const treatmentSuggestionSchema = z.object({
  strategy: z.enum(TREATMENT_STRATEGIES),
  description: z.string().min(1),
  confidence: z.number().int().min(0).max(100),
}) satisfies z.ZodType<AiTreatmentSuggestion>;

export const risksResponseSchema = z.object({ suggestions: z.array(riskSuggestionSchema) });
export const treatmentResponseSchema = z.object({ suggestion: treatmentSuggestionSchema });

// ── Skema keluaran terstruktur Gemini (subset OpenAPI untuk `responseSchema`) ──
export const RISKS_GEMINI_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      category: { type: "STRING", enum: RISK_CATEGORIES },
      source: { type: "STRING", enum: RISK_SOURCES },
      likelihood: { type: "INTEGER" },
      impact: { type: "INTEGER" },
      rationale: { type: "STRING" },
      confidence: { type: "INTEGER" },
    },
    required: ["title", "category", "source", "likelihood", "impact", "rationale", "confidence"],
  },
} as const;

export const TREATMENT_GEMINI_SCHEMA = {
  type: "OBJECT",
  properties: {
    strategy: { type: "STRING", enum: TREATMENT_STRATEGIES },
    description: { type: "STRING" },
    confidence: { type: "INTEGER" },
  },
  required: ["strategy", "description", "confidence"],
} as const;

// ── Prompt (payload non-sensitif saja — NFR-08) ──
export const buildRisksPrompt = ({ industryType, departmentName, existingTitles }: AiSuggestRisksInput): string =>
  [
    "Anda asisten manajemen risiko ISO 31000:2018 untuk UMKM Indonesia.",
    `Industri perusahaan: ${industryType}. Departemen: "${departmentName || "umum"}".`,
    "Usulkan maksimal 5 risiko relevan & spesifik untuk konteks ini.",
    existingTitles.length ? `Hindari menduplikasi judul berikut: ${existingTitles.join("; ")}.` : "",
    "likelihood & impact pada skala 1..5; confidence 0..100; rationale singkat (1 kalimat, Bahasa Indonesia).",
    "Balas HANYA JSON array sesuai skema.",
  ]
    .filter(Boolean)
    .join("\n");

export const buildTreatmentPrompt = ({ riskTitle, category, level }: AiSuggestTreatmentInput): string =>
  [
    "Anda asisten manajemen risiko ISO 31000:2018 untuk UMKM Indonesia.",
    `Risiko: "${riskTitle}" (kategori ${category}, level ${level}).`,
    "Sarankan satu strategi mitigasi (AVOID/REDUCE/TRANSFER/ACCEPT) yang paling tepat untuk level ini,",
    "beserta deskripsi tindakan konkret (1-2 kalimat, Bahasa Indonesia) dan confidence 0..100.",
    "Balas HANYA JSON objek sesuai skema.",
  ].join("\n");

// ── Normalisasi keluaran mentah Gemini → bentuk domain (clamp + koersi enum) ──
const clamp = (n: unknown, min: number, max: number, fallback: number): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(max, Math.max(min, v));
};
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

export const normalizeRisks = (parsed: unknown): AiRiskSuggestion[] => {
  if (!Array.isArray(parsed)) throw new Error("Keluaran risks bukan array");
  return parsed
    .slice(0, 5)
    .map((s: Record<string, unknown>) => ({
      title: String(s?.title ?? "").slice(0, 200),
      category: oneOf(s?.category, RISK_CATEGORIES, "OPERATIONAL"),
      source: oneOf(s?.source, RISK_SOURCES, "INTERNAL"),
      likelihood: clamp(s?.likelihood, 1, 5, 3),
      impact: clamp(s?.impact, 1, 5, 3),
      rationale: String(s?.rationale ?? "").slice(0, 400),
      confidence: clamp(s?.confidence, 0, 100, 70),
    }))
    .filter((s) => s.title.length > 0);
};

export const normalizeTreatment = (parsed: Record<string, unknown>): AiTreatmentSuggestion => ({
  strategy: oneOf(parsed?.strategy, TREATMENT_STRATEGIES, "REDUCE"),
  description: String(parsed?.description ?? "").slice(0, 600),
  confidence: clamp(parsed?.confidence, 0, 100, 75),
});
