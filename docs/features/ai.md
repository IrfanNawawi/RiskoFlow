# AI Assistant Feature

Asisten AI yang menyarankan kandidat risiko per departemen berdasarkan profil industri
perusahaan (FR-AI-1). Semua usulan masuk sebagai **draft `aiSuggested`** dan **wajib
dikonfirmasi manusia** sebelum aktif (D6, FR-RISK-5).

> ⚠️ **Mock phase — TIDAK ada LLM.** `MockAiSuggestionService` memilih kandidat dari pustaka
> lokal deterministik ([aiLibrary.ts](../../src/features/ai/data/aiLibrary.ts)); tak ada data
> dikirim ke mana pun. Implementasi nyata **wajib** lewat **Edge Function + Gemini, key di Vault,
> payload disanitasi** (D6/NFR-08) — diganti dengan `AiEdgeSuggestionService` tanpa menyentuh
> presentation. Penilaian/mitigasi via AI (FR-AI-2..4) & opt-out per-Setting = 🎯 menyusul.

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
│   ├── MockAiSuggestionService.ts# implements IAiSuggestionService (lokal, async + delay)
│   └── index.ts
├── presentation/
│   ├── components/GenerateAiModal.tsx
│   └── hooks/
│       ├── useAiSuggestionService.ts   # DI factory
│       └── useGenerateRiskSuggestions.ts # useMutation (tanpa persist)
├── __tests__/unit/mockAiService.test.ts
└── index.ts
```

> **Bukan repository data biasa** — AI adalah *service* (komputasi/layanan), bukan CRUD entity;
> tetap memakai pola interface domain + DI hook agar swap ke Edge Function bersih.

---

## Dependency Flow

```
GenerateAiModal
    ├── useGenerateRiskSuggestions (useMutation)
    │       └── useAiSuggestionService (DI) → IAiSuggestionService
    │               └── MockAiSuggestionService → AI_RISK_LIBRARY   (⚠️ target: Edge Function + Gemini)
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
| [`MockAiSuggestionService.ts`](../../src/features/ai/data/MockAiSuggestionService.ts) | filter per industri + dedupe judul + sort confidence, `slice(5)`; `await delay` meniru jaringan |

> Target Supabase/Edge: `AiEdgeSuggestionService` memanggil Edge Function `ai-risk-assistant`
> (Hono+Deno) → Gemini `responseSchema` + Zod; guard kuota/rate-limit (D10).

---

## Presentation Layer

| Hook/Komponen | Tipe | Keterangan |
|---|---|---|
| `useAiSuggestionService` | DI factory | wiring service (kini mock) |
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

Store draft ([addAiSuggestedRisks.test.ts](../../src/features/risks/__tests__/unit/addAiSuggestedRisks.test.ts)):
- ✅ draft `aiSuggested=true` berstatus `identified`; severity dihitung benar

---

## Status & Belum Dibangun

Lihat [PROGRESS.md](../PROGRESS.md). Status: 🟡 (generate risiko mock + konfirmasi jalan).

- [x] Generate kandidat risiko per departemen (FR-AI-1) — mock.
- [x] Saran **mitigasi** per risiko (FR-AI-3) — kartu di RiskDetail, prefill ke TreatmentFormModal.
- [x] Draft/usulan wajib konfirmasi manusia (FR-AI-5/FR-RISK-5/D6).
- [x] Opt-out AI per perusahaan (FR-AI-7) — gating UI via `aiEnabled`.
- [ ] **Edge Function + Gemini** (D6) + sanitasi payload (NFR-08) + guard kuota/rate-limit (D10) — 🎯.
- [ ] Saran penilaian (FR-AI-2) & tinjauan pemantauan (FR-AI-4) — 🎯.
