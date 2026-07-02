// Edge Function `ai-suggest` — jembatan AI nyata (Gemini) untuk fitur usulan risiko & mitigasi.
//
// Mengapa di server (D6, D20, NFR-08, Aturan inti #10): API key LLM DILARANG di client.
// Function ini memegang `GEMINI_API_KEY` (di-set via `supabase secrets set`, bukan env VITE_*),
// menyusun prompt dari payload yang SUDAH disanitasi (tanpa PII / data tenant), memanggil Gemini
// dengan `responseSchema` JSON, lalu memvalidasi & clamp hasilnya sebelum dikembalikan ke client.
//
// Kontrak request : POST { action: "risks" | "treatment" | "assessment" | "monitoring", payload }
// Kontrak response: 200 { suggestions: AiRiskSuggestion[] }   (action "risks")
//                   200 { suggestion: AiTreatmentSuggestion }  (action "treatment")
//                   200 { suggestion: AiAssessmentSuggestion } (action "assessment", FR-AI-2)
//                   200 { suggestion: AiMonitoringSuggestion } (action "monitoring", FR-AI-4)
//                   4xx/5xx { error } → client (AiEdgeSuggestionService) menampilkan pesan error.
//
// Selaras tipe `IAiSuggestionService` di src/features/ai/domain.

// @ts-nocheck — file Deno (runtime Edge), bukan bagian build TS klien (tsc app).

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const RISK_CATEGORIES = ["FINANCIAL", "OPERATIONAL", "LEGAL", "REPUTATIONAL", "STRATEGIC"];
const RISK_SOURCES = ["INTERNAL", "EXTERNAL"];
const TREATMENT_STRATEGIES = ["AVOID", "REDUCE", "TRANSFER", "ACCEPT"];
const INDUSTRIES = ["JASA", "DAGANG", "MANUFACTURE"];
const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "EXTREME"];
const REVIEW_FREQUENCIES = ["weekly", "monthly", "quarterly"];

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Skema keluaran terstruktur Gemini (subset OpenAPI yang didukung `responseSchema`).
const RISKS_SCHEMA = {
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
};

const TREATMENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    strategy: { type: "STRING", enum: TREATMENT_STRATEGIES },
    description: { type: "STRING" },
    confidence: { type: "INTEGER" },
  },
  required: ["strategy", "description", "confidence"],
};

const ASSESSMENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    likelihood: { type: "INTEGER" },
    impact: { type: "INTEGER" },
    rationale: { type: "STRING" },
    confidence: { type: "INTEGER" },
  },
  required: ["likelihood", "impact", "rationale", "confidence"],
};

const MONITORING_SCHEMA = {
  type: "OBJECT",
  properties: {
    reviewFrequency: { type: "STRING", enum: REVIEW_FREQUENCIES },
    indicatorName: { type: "STRING" },
    threshold: { type: "STRING" },
    rationale: { type: "STRING" },
    confidence: { type: "INTEGER" },
  },
  required: ["reviewFrequency", "indicatorName", "threshold", "rationale", "confidence"],
};

const clamp = (n: unknown, min: number, max: number, fallback: number): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(max, Math.max(min, v));
};

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

// Panggil Gemini; kembalikan teks JSON mentah. Lempar bila konfigurasi/HTTP gagal.
async function callGemini(apiKey: string, prompt: string, schema: unknown): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.4,
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("Respons Gemini tanpa teks");
  return text;
}

// --- action: risks (FR-AI-1) ---
async function handleRisks(apiKey: string, payload: any) {
  const industryType = oneOf(payload?.industryType, INDUSTRIES, "JASA");
  const departmentName = String(payload?.departmentName ?? "").slice(0, 120);
  const existingTitles: string[] = Array.isArray(payload?.existingTitles)
    ? payload.existingTitles.map((t: unknown) => String(t).slice(0, 200)).slice(0, 100)
    : [];

  // Prompt hanya berisi field non-sensitif (industri, nama departemen, judul yang sudah ada).
  const prompt = [
    "Anda asisten manajemen risiko ISO 31000:2018 untuk UMKM Indonesia.",
    `Industri perusahaan: ${industryType}. Departemen: "${departmentName || "umum"}".`,
    "Usulkan maksimal 5 risiko relevan & spesifik untuk konteks ini.",
    existingTitles.length
      ? `Hindari menduplikasi judul berikut: ${existingTitles.join("; ")}.`
      : "",
    "likelihood & impact pada skala 1..5; confidence 0..100; rationale singkat (1 kalimat, Bahasa Indonesia).",
    "Balas HANYA JSON array sesuai skema.",
  ].filter(Boolean).join("\n");

  const raw = await callGemini(apiKey, prompt, RISKS_SCHEMA);
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Keluaran risks bukan array");

  const suggestions = parsed.slice(0, 5).map((s: any) => ({
    title: String(s?.title ?? "").slice(0, 200),
    category: oneOf(s?.category, RISK_CATEGORIES, "OPERATIONAL"),
    source: oneOf(s?.source, RISK_SOURCES, "INTERNAL"),
    likelihood: clamp(s?.likelihood, 1, 5, 3),
    impact: clamp(s?.impact, 1, 5, 3),
    rationale: String(s?.rationale ?? "").slice(0, 400),
    confidence: clamp(s?.confidence, 0, 100, 70),
  })).filter((s) => s.title.length > 0);

  return json(200, { suggestions });
}

// --- action: treatment (FR-AI-3) ---
async function handleTreatment(apiKey: string, payload: any) {
  const riskTitle = String(payload?.riskTitle ?? "").slice(0, 200);
  const category = oneOf(payload?.category, RISK_CATEGORIES, "OPERATIONAL");
  const level = oneOf(payload?.level, RISK_LEVELS, "MEDIUM");

  const prompt = [
    "Anda asisten manajemen risiko ISO 31000:2018 untuk UMKM Indonesia.",
    `Risiko: "${riskTitle}" (kategori ${category}, level ${level}).`,
    "Sarankan satu strategi mitigasi (AVOID/REDUCE/TRANSFER/ACCEPT) yang paling tepat untuk level ini,",
    "beserta deskripsi tindakan konkret (1-2 kalimat, Bahasa Indonesia) dan confidence 0..100.",
    "Balas HANYA JSON objek sesuai skema.",
  ].join("\n");

  const raw = await callGemini(apiKey, prompt, TREATMENT_SCHEMA);
  const parsed = JSON.parse(raw);

  const suggestion = {
    strategy: oneOf(parsed?.strategy, TREATMENT_STRATEGIES, "REDUCE"),
    description: String(parsed?.description ?? "").slice(0, 600),
    confidence: clamp(parsed?.confidence, 0, 100, 75),
  };
  if (!suggestion.description) throw new Error("Keluaran treatment tanpa deskripsi");

  return json(200, { suggestion });
}

// --- action: assessment (FR-AI-2) ---
async function handleAssessment(apiKey: string, payload: any) {
  const riskTitle = String(payload?.riskTitle ?? "").slice(0, 200);
  const category = oneOf(payload?.category, RISK_CATEGORIES, "OPERATIONAL");
  const source = oneOf(payload?.source, RISK_SOURCES, "INTERNAL");
  const industryType = oneOf(payload?.industryType, INDUSTRIES, "JASA");

  const prompt = [
    "Anda asisten manajemen risiko ISO 31000:2018 untuk UMKM Indonesia.",
    `Industri: ${industryType}. Risiko: "${riskTitle}" (kategori ${category}, sumber ${source}).`,
    "Usulkan penilaian awal: likelihood & impact pada skala 1..5 (1=sangat rendah, 5=sangat tinggi),",
    "rationale singkat (1 kalimat, Bahasa Indonesia) yang menjelaskan dasar skor, dan confidence 0..100.",
    "Balas HANYA JSON objek sesuai skema.",
  ].join("\n");

  const raw = await callGemini(apiKey, prompt, ASSESSMENT_SCHEMA);
  const parsed = JSON.parse(raw);

  const suggestion = {
    likelihood: clamp(parsed?.likelihood, 1, 5, 3),
    impact: clamp(parsed?.impact, 1, 5, 3),
    rationale: String(parsed?.rationale ?? "").slice(0, 400),
    confidence: clamp(parsed?.confidence, 0, 100, 70),
  };

  return json(200, { suggestion });
}

// --- action: monitoring (FR-AI-4) ---
async function handleMonitoring(apiKey: string, payload: any) {
  const riskTitle = String(payload?.riskTitle ?? "").slice(0, 200);
  const category = oneOf(payload?.category, RISK_CATEGORIES, "OPERATIONAL");
  const level = oneOf(payload?.level, RISK_LEVELS, "MEDIUM");

  const prompt = [
    "Anda asisten manajemen risiko ISO 31000:2018 untuk UMKM Indonesia.",
    `Risiko: "${riskTitle}" (kategori ${category}, level ${level}).`,
    "Usulkan rencana pemantauan: reviewFrequency (weekly/monthly/quarterly) yang sesuai level",
    "(makin tinggi level makin sering), satu kandidat KRI (indicatorName) yang terukur beserta",
    'ambangnya (threshold, boleh berunit mis. "90%"), rationale singkat (Bahasa Indonesia), confidence 0..100.',
    "Balas HANYA JSON objek sesuai skema.",
  ].join("\n");

  const raw = await callGemini(apiKey, prompt, MONITORING_SCHEMA);
  const parsed = JSON.parse(raw);

  const suggestion = {
    reviewFrequency: oneOf(parsed?.reviewFrequency, REVIEW_FREQUENCIES, "monthly"),
    indicatorName: String(parsed?.indicatorName ?? "").slice(0, 100),
    threshold: String(parsed?.threshold ?? "").slice(0, 40),
    rationale: String(parsed?.rationale ?? "").slice(0, 400),
    confidence: clamp(parsed?.confidence, 0, 100, 72),
  };
  if (!suggestion.indicatorName) throw new Error("Keluaran monitoring tanpa indikator");

  return json(200, { suggestion });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json(500, { error: "GEMINI_API_KEY belum dikonfigurasi" });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Body bukan JSON valid" });
  }

  try {
    switch (body?.action) {
      case "risks":
        return await handleRisks(apiKey, body?.payload ?? {});
      case "treatment":
        return await handleTreatment(apiKey, body?.payload ?? {});
      case "assessment":
        return await handleAssessment(apiKey, body?.payload ?? {});
      case "monitoring":
        return await handleMonitoring(apiKey, body?.payload ?? {});
      default:
        return json(400, { error: `action tak dikenal: ${body?.action}` });
    }
  } catch (err) {
    // Client (AiEdgeSuggestionService) akan menangkap ini & fallback ke mock.
    return json(502, { error: `Gagal memproses AI: ${err instanceof Error ? err.message : String(err)}` });
  }
});
