# AI Assistant Feature

Asisten AI yang menyarankan kandidat risiko per departemen berdasarkan profil industri
perusahaan (FR-AI-1). Semua usulan masuk sebagai **draft `aiSuggested`** dan **wajib
dikonfirmasi manusia** sebelum aktif (D6, FR-RISK-5).

> **Tiga mode (dipilih DI hook `useAiSuggestionService`, prioritas atas→bawah):**
>
> 1. **Dev-only — browser → Gemini langsung.** Bila `VITE_GEMINI_API_KEY` diisi, `AiBrowserGeminiService`
>    memanggil Gemini **langsung dari browser** agar bisa dites lokal tanpa Supabase CLI/Docker. ⚠️ Key
>    **terekspos di bundle** — hanya untuk lokal/skripsi, langgar Aturan inti #10 bila dipakai produksi.
> 2. **Produksi — Edge Function + Gemini.** Bila Supabase dikonfigurasi, `AiEdgeSuggestionService` memanggil
>    Edge Function [`ai-suggest`](../../supabase/functions/ai-suggest/index.ts) yang menyusun prompt dari
>    payload **disanitasi** lalu memanggil **Gemini** (key `GEMINI_API_KEY` di **server** — D6/NFR-08).
> 3. **Mock.** Env kosong → `MockAiSuggestionService` (pustaka lokal deterministik
>    [aiLibrary.ts](../../src/features/ai/data/aiLibrary.ts)).
>
> Pada mode 1 & 2, bila Gemini gagal service **melempar error** dan UI menampilkan pesan (tidak diam-diam
> memakai data tiruan). Presentation tak berubah.
>
> **Deploy untuk produksi:** `supabase secrets set GEMINI_API_KEY=...` (tanpa prefix `VITE_`) lalu
> `supabase functions deploy ai-suggest`. **Tes lokal cepat:** isi `VITE_GEMINI_API_KEY` di `.env`.
> Penilaian/tinjauan via AI (FR-AI-2/FR-AI-4) = 🎯 menyusul.

---

## Daftar Isi

1. [Lokasi File](#lokasi-file)
2. [Folder Structure](#folder-structure)
3. [Dependency Flow](#dependency-flow)
4. [Domain Layer](#domain-layer)
5. [Data Layer](#data-layer)
6. [Presentation Layer](#presentation-layer)
7. [Alur "Generate AI"](#alur-generate-ai)
8. [Testing](#testing)
9. [Status & Belum Dibangun](#status--belum-dibangun)

---

## Lokasi File

```
src/features/ai/
```

Entry publik: [`index.ts`](../../src/features/ai/index.ts)

---

## Folder Structure

```
ai/
├── domain/
│   ├── IAiSuggestionService.ts   # kontrak service + tipe AiRiskSuggestion
│   └── index.ts
├── data/
│   ├── aiLibrary.ts              # pustaka kandidat per industri (mock, bukan LLM)
│   ├── aiSchemas.ts              # Zod + prompt + skema Gemini + normalizer (dipakai Edge & Browser service)
│   ├── MockAiSuggestionService.ts# implements IAiSuggestionService (lokal, async + delay)
│   ├── AiEdgeSuggestionService.ts# implements IAiSuggestionService → Edge Function + Gemini (Zod; throw saat gagal)
│   ├── AiBrowserGeminiService.ts # ⚠️ DEV-ONLY: implements IAiSuggestionService → Gemini langsung dari browser
│   └── index.ts
├── presentation/
│   ├── components/GenerateAiModal.tsx
│   └── hooks/
│       ├── useAiSuggestionService.ts   # DI factory (Gemini-dev > Edge > mock)
│       ├── useGenerateRiskSuggestions.ts # useMutation (tanpa persist)
│       └── useSuggestTreatment.ts        # useMutation (tanpa persist)
├── __tests__/unit/
│   ├── mockAiService.test.ts
│   ├── aiEdgeSuggestionService.test.ts
│   └── aiBrowserGeminiService.test.ts
└── index.ts

supabase/functions/ai-suggest/index.ts   # Deno + Gemini (responseSchema), clamp + sanitasi server
```

> **Bukan repository data biasa** — AI adalah *service* (komputasi/layanan), bukan CRUD entity;
> tetap memakai pola interface domain + DI hook agar swap ke Edge Function bersih.

---

## Dependency Flow

```
GenerateAiModal
    ├── useGenerateRiskSuggestions (useMutation)
    │       └── useAiSuggestionService (DI) → IAiSuggestionService   (prioritas ↓)
    │               ├── AiBrowserGeminiService → Gemini langsung      (⚠️ dev-only, VITE_GEMINI_API_KEY diisi)
    │               ├── AiEdgeSuggestionService → Edge `ai-suggest` → Gemini (Supabase aktif)
    │               │       └── Zod-validate → AiRiskSuggestion[]   (gagal → throw AiServiceError → UI isError)
    │               └── MockAiSuggestionService → AI_RISK_LIBRARY    (env kosong)
    │                       └── AiRiskSuggestion[]   (draft, tak dipersist)
    └── useAddSuggestedRisks (useMutation, fitur risks)
            └── RiskRepository.addSuggested → store.addAiSuggestedRisks (aiSuggested=true)
                    └── tampil di Risk Register sbg "AI draft" → tombol Konfirmasi (FR-RISK-5)
```

---

## Domain Layer

**File:** [`domain/IAiSuggestionService.ts`](../../src/features/ai/domain/IAiSuggestionService.ts)

```typescript
interface IAiSuggestionService {
  suggestRisks(input: AiSuggestRisksInput): Promise<AiRiskSuggestion[]>;     // FR-AI-1
  suggestTreatment(input: AiSuggestTreatmentInput): Promise<AiTreatmentSuggestion>; // FR-AI-3
}
```

`AiRiskSuggestion` = `{ title, category, source, likelihood, impact, rationale, confidence }`.
`AiSuggestRisksInput` = `{ industryType, departmentName, existingTitles }` (konteks **minimal &
non-sensitif** — NFR-08).
`AiTreatmentSuggestion` = `{ strategy, description, confidence }`;
`AiSuggestTreatmentInput` = `{ riskTitle, category, level }` (mock memilih strategi per level).

---

## Data Layer

| File | Peran |
|---|---|
| [`aiLibrary.ts`](../../src/features/ai/data/aiLibrary.ts) | `AI_RISK_LIBRARY: Record<IndustryType, AiRiskSuggestion[]>` — seed mock |
| [`aiSchemas.ts`](../../src/features/ai/data/aiSchemas.ts) | sumber bersama: Zod schema, prompt non-sensitif, skema keluaran Gemini, & normalizer (clamp/koersi) — dipakai Edge & Browser service |
| [`MockAiSuggestionService.ts`](../../src/features/ai/data/MockAiSuggestionService.ts) | filter per industri + dedupe judul + sort confidence, `slice(5)`; `await delay` meniru jaringan |
| [`AiEdgeSuggestionService.ts`](../../src/features/ai/data/AiEdgeSuggestionService.ts) | `supabase.functions.invoke("ai-suggest", { action, payload })` → **Zod-validate** respons; error/invalid → **throw `AiServiceError`** (UI menampilkan pesan, tanpa fallback) |
| [`AiBrowserGeminiService.ts`](../../src/features/ai/data/AiBrowserGeminiService.ts) | ⚠️ **DEV-ONLY**: `fetch` Gemini langsung dgn `VITE_GEMINI_API_KEY` → normalizer + Zod; throw saat gagal. Key terekspos di browser — bukan untuk produksi |

**Edge Function** [`supabase/functions/ai-suggest/index.ts`](../../supabase/functions/ai-suggest/index.ts)
(Deno) menerima `{ action: "risks" | "treatment", payload }`, menyusun prompt **non-sensitif**, memanggil
Gemini `gemini-2.0-flash` dengan `responseMimeType: application/json` + `responseSchema`, lalu **clamp &
validasi** (likelihood/impact 1..5, confidence 0..100, enum kategori/sumber/strategi) sebelum membalas.
Kegagalan → HTTP 5xx agar client fallback. 🎯 Belum: guard kuota/rate-limit (D10).

---

## Presentation Layer

| Hook/Komponen | Tipe | Keterangan |
|---|---|---|
| `useAiSuggestionService` | DI factory | pilih implementasi: `VITE_GEMINI_API_KEY` (dev) → Edge (`isSupabaseConfigured`) → mock |
| `useGenerateRiskSuggestions` | `useMutation` | hasilkan usulan risiko (FR-AI-1); **tidak** mempersist |
| `useSuggestTreatment` | `useMutation` | usulkan mitigasi (FR-AI-3); **tidak** mempersist |
| `useAddSuggestedRisks` (fitur `risks`) | `useMutation` | simpan terpilih sbg draft → invalidate `riskKeys` |
| `GenerateAiModal` | komponen | pilih dept → Generate → checklist usulan (confidence + badge) → "Tambahkan N draft" |
| Kartu "AI Suggestion" (RiskDetail) | bagian page | "Sarankan Mitigasi" → tampil strategi+confidence → "Gunakan & edit" mem-prefill `TreatmentFormModal` (FR-AI-3) |

Tombol **Generate AI** di [RiskRegisterPage](../../src/features/risks/RiskRegisterPage.tsx) &
[DashboardPage](../../src/features/dashboard/DashboardPage.tsx) membuka modal. **Opt-out
(FR-AI-7):** bila `company.aiEnabled = false`, modal menampilkan pesan nonaktif (alur manual jalan).

---

## Alur "Generate AI"

1. User buka modal, pilih **departemen**.
2. **Generate** → `suggestRisks({ industryType, departmentName, existingTitles })` → kandidat
   (judul, kategori, sumber, likelihood/impact, rasional, confidence).
3. User centang usulan yang relevan → **Tambahkan N draft**.
4. Draft masuk register `aiSuggested=true`, `status="identified"` — **dikecualikan dari
   heatmap/agregat** sampai dikonfirmasi (FR-RISK-5). Konfirmasi lewat tombol di Risk Register.

---

## Testing

`bun run test`. Mock service ([mockAiService.test.ts](../../src/features/ai/__tests__/unit/mockAiService.test.ts)):
- ✅ usulan sesuai industri (≤ 5), confidence 0–100
- ✅ dedupe judul yang sudah ada (case-insensitive)
- ✅ `suggestTreatment` memilih strategi per level (EXTREME→AVOID, LOW→ACCEPT)

Edge service ([aiEdgeSuggestionService.test.ts](../../src/features/ai/__tests__/unit/aiEdgeSuggestionService.test.ts), `functions.invoke` di-mock):
- ✅ respons valid → suggestion ter-validasi
- ✅ payload yang dikirim hanya `{ action, payload }` non-sensitif
- ✅ error Edge / respons gagal Zod → **throw** `AiServiceError` (UI menampilkan pesan)

Browser service ([aiBrowserGeminiService.test.ts](../../src/features/ai/__tests__/unit/aiBrowserGeminiService.test.ts), `fetch` di-mock):
- ✅ memanggil endpoint Gemini dgn `key=...` & menormalkan keluaran (mis. likelihood di-clamp ke 1..5)
- ✅ HTTP gagal / keluaran bukan JSON → **throw** `AiServiceError`

Store draft ([addAiSuggestedRisks.test.ts](../../src/features/risks/__tests__/unit/addAiSuggestedRisks.test.ts)):
- ✅ draft `aiSuggested=true` berstatus `identified`; severity dihitung benar

---

## Status & Belum Dibangun

Lihat [PROGRESS.md](../PROGRESS.md). Status: 🟢 (Edge Function + Gemini; mock hanya saat env Supabase kosong; konfirmasi manusia jalan).

- [x] Generate kandidat risiko per departemen (FR-AI-1) — Edge+Gemini (mock saat env kosong).
- [x] Saran **mitigasi** per risiko (FR-AI-3) — kartu di RiskDetail, prefill ke TreatmentFormModal.
- [x] Draft/usulan wajib konfirmasi manusia (FR-AI-5/FR-RISK-5/D6).
- [x] Opt-out AI per perusahaan (FR-AI-7) — gating UI via `aiEnabled`.
- [x] **Edge Function + Gemini** (D6) + sanitasi payload (NFR-08) — key `VITE_GEMINI_API_KEY` di server.
- [ ] Guard kuota/rate-limit (D10) — 🎯.
- [ ] Saran penilaian (FR-AI-2) & tinjauan pemantauan (FR-AI-4) — 🎯.
