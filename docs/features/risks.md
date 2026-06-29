# Risk Register Feature

Pendataan, penilaian, dan penanganan risiko per departemen (FR-RISK-*, FR-ASSESS-*, FR-TREAT-*).
Fitur ini adalah **implementasi acuan** arsitektur target — layer `domain`/`data`/`presentation`
lengkap dengan repository + DI hook (lihat [frontend-structure.md](../../.claude/guidelines/frontend-structure.md)).

> ⚠️ **Mock phase:** data layer membaca [Zustand mock store](../../src/data/store.ts), bukan Supabase.
> Signature repository sudah Supabase-ready — penggantian datasource tidak menyentuh `presentation`.

---

## Daftar Isi

1. [Lokasi File](#lokasi-file)
2. [Folder Structure](#folder-structure)
3. [Dependency Flow](#dependency-flow)
4. [Domain Layer](#domain-layer)
5. [Data Layer](#data-layer)
6. [Validation Layer](#validation-layer)
7. [Presentation Layer](#presentation-layer)
8. [API Endpoints](#api-endpoints)
9. [State Management](#state-management)
10. [Navigasi](#navigasi)
11. [Responsiveness](#responsiveness)
12. [Testing](#testing)
13. [Migrasi dari Akses Store Langsung](#migrasi-dari-akses-store-langsung)

---

## Lokasi File

```
src/features/risks/
```

Entry point publik: [`index.ts`](../../src/features/risks/index.ts) — re-export page + hook publik.

---

## Folder Structure

```
risks/
├── domain/
│   ├── repositories/
│   │   └── IRiskRepository.ts          # kontrak: list/getById/create/confirm/addTreatment/updateTreatment/approveTreatment
│   ├── use-cases/
│   │   └── approveTreatment.usecase.ts # gate peran ACCEPT (FR-TREAT-3)
│   └── index.ts
├── data/
│   ├── datasources/
│   │   ├── risk.dto.ts                 # RiskDTO (mock: = Risk)
│   │   └── RiskMockDataSource.ts       # baca/tulis @/data/store
│   ├── mappers/
│   │   └── risk.mapper.ts              # toDomain + validasi Zod
│   ├── repositories/
│   │   └── RiskRepository.ts           # implements IRiskRepository
│   └── index.ts
├── validation/
│   ├── newRisk.schema.ts               # Zod form "Risiko Baru"
│   ├── treatment.schema.ts             # Zod form mitigasi (FR-TREAT)
│   └── review.schema.ts                # Zod form review berkala (FR-MON-2)
├── presentation/
│   ├── components/
│   │   ├── NewRiskModal.tsx            # (di @/components) form risiko
│   │   ├── TreatmentFormModal.tsx      # form tambah/ubah mitigasi
│   │   └── ReviewModal.tsx             # form catat review / input residual
│   └── hooks/
│       ├── useRiskRepository.ts        # DI factory
│       ├── riskKeys.ts                 # query-key factory (per tenant)
│       ├── useRisks.ts                 # useQuery: list + detail
│       └── useRiskMutations.ts         # create/confirm/addTreatment/updateTreatment/approve/recordReview
├── __tests__/unit/
│   ├── approveTreatment.usecase.test.ts
│   ├── treatment.schema.test.ts
│   ├── recordReview.test.ts
│   └── risk.mapper.test.ts
├── search.ts                           # typed URL search params (FR-RISK-2)
├── RiskRegisterPage.tsx
├── RiskDetailPage.tsx
└── index.ts
```

> Entity tidak punya folder sendiri: tipe `Risk` dipakai bersama dari [`@/data/types`](../../src/data/types.ts),
> pure function-nya di [`@/lib/risk`](../../src/lib/risk.ts) (aturan inti #2: entity = `type` + pure function).

---

## Dependency Flow

```
RiskRegisterPage / RiskDetailPage / NewRiskModal
    │
    ├── useRisks / useRisk            (useQuery — queryKey: riskKeys.*(companyId))
    │       └── useRiskRepository (DI) → IRiskRepository
    │               └── RiskRepository
    │                       └── RiskMockDataSource → @/data/store (target: Supabase)
    │                               └── RiskDTO → riskToDomain (validasi Zod) → Risk
    │
    ├── useCreateRisk / useConfirmAiRisk / useApproveTreatment  (useMutation → invalidate)
    │       └── [approveTreatment use-case: gate risk_manager/admin] → repository
    │
    └── lookup referensi (deptById/userById/compliance/can) tetap dari @/data/store
```

---

## Domain Layer

### Entities

`Risk` — `type` polos dari [`@/data/types`](../../src/data/types.ts) (bukan class). Pure function turunan
di [`@/lib/risk`](../../src/lib/risk.ts): `computeRiskLevel`, `severityScore`, `cellLevel` (sumber kanonik
severity → level, D4).

### Repository Interface

**File:** [`domain/repositories/IRiskRepository.ts`](../../src/features/risks/domain/repositories/IRiskRepository.ts)

```typescript
interface IRiskRepository {
  list(): Promise<Risk[]>;
  getById(id: string): Promise<Risk | undefined>;
  create(input: NewRiskInput): Promise<string>;
  confirmAiSuggested(id: string): Promise<void>;
  addTreatment(riskId: string, input: TreatmentInput): Promise<string>;
  updateTreatment(riskId: string, treatmentId: string, input: TreatmentInput): Promise<void>;
  approveTreatment(riskId: string, treatmentId: string): Promise<void>;
  recordReview(riskId: string, input: ReviewInput): Promise<void>;
  addKri(riskId: string, input: KriInput): Promise<string>;        // FR-MON-4
  updateKri(riskId: string, kriId: string, input: KriInput): Promise<void>;
  removeKri(riskId: string, kriId: string): Promise<void>;
}
```

### Use Cases

| Use Case | Input | Output | Aturan bisnis |
|---|---|---|---|
| `approveTreatment(repo, roles)` | `riskId`, `treatmentId` | `Promise<void>` | Hanya `risk_manager`/`admin` (FR-TREAT-3, D5); selain itu `throw` & repo tak dipanggil |

---

## Data Layer

### DTOs

**File:** [`data/datasources/risk.dto.ts`](../../src/features/risks/data/datasources/risk.dto.ts)

| DTO | Digunakan oleh | Catatan |
|---|---|---|
| `RiskDTO` | output `RiskMockDataSource` | Mock: `= Risk`. Target Supabase: baris snake_case (`company_id`, `next_review_date`) |

### Data Source

**File:** [`data/datasources/RiskMockDataSource.ts`](../../src/features/risks/data/datasources/RiskMockDataSource.ts)

| Method | Sumber (mock) | Target |
|---|---|---|
| `list()` | `store.activeRisks()` | `select … where company_id = …` |
| `getById(id)` | `store.activeRisks().find` | `select … eq id` |
| `create(input)` | `store.addRisk` | `insert` |
| `confirmAiSuggested(id)` | `store.confirmAiRisk` | `update ai_suggested=false` |
| `addTreatment(riskId, input)` | `store.addTreatment` | `insert treatment` (+ bump status risiko) |
| `updateTreatment(riskId, tId, input)` | `store.updateTreatment` | `update treatment` |
| `approveTreatment(riskId, treatmentId)` | `store.approveTreatment` | `update treatment.approved` |
| `recordReview(riskId, input)` | `store.recordReview` | `insert risk_review` + bump `next_review_date` (FR-MON-2) |

### Mapper

**File:** [`data/mappers/risk.mapper.ts`](../../src/features/risks/data/mappers/risk.mapper.ts)

| Fungsi | Input | Output | Catatan |
|---|---|---|---|
| `riskToDomain(dto)` | `RiskDTO` | `Risk \| null` | Validasi Zod; bentuk rusak → `null` |
| `riskListToDomain(dtos)` | `RiskDTO[]` | `Risk[]` | Item rusak difilter diam-diam |

### Repository Implementation

**File:** [`data/repositories/RiskRepository.ts`](../../src/features/risks/data/repositories/RiskRepository.ts)

`implements IRiskRepository`; gabung datasource + mapper. **DTO tidak bocor** — output selalu entity domain.

---

## Validation Layer

**File:** [`validation/newRisk.schema.ts`](../../src/features/risks/validation/newRisk.schema.ts)

Schema **Zod** untuk form "Risiko Baru" (dipakai react-hook-form via `zodResolver`). Pesan error Bahasa Indonesia.

| Export | Tipe | Keterangan |
|---|---|---|
| `newRiskSchema` | `z.object` | `title` 3–150, `category`/`source` enum, `departmentId`/`ownerId` wajib, `likelihood`/`impact` 1–5 |
| `NewRiskInput` | `z.infer<...>` | Tipe hasil inferensi |

**File:** [`validation/treatment.schema.ts`](../../src/features/risks/validation/treatment.schema.ts) — form mitigasi (FR-TREAT):

| Export | Aturan |
|---|---|
| `treatmentSchema` | `strategy` ∈ {AVOID,REDUCE,TRANSFER,ACCEPT}; `description` 3–300; `ownerId`/`dueDate` wajib; `status` ∈ {planned,in_progress,done}; `cost` int ≥ 0; **ACCEPT ⇒ justifikasi wajib**; **TRANSFER ⇒ penyedia wajib** |
| `TreatmentInput` | `z.infer<...>` |

**File:** [`validation/review.schema.ts`](../../src/features/risks/validation/review.schema.ts) — form "Catat Review" (FR-MON-2):
`likelihood`/`impact` 1–5, `status` & `reviewFrequency` enum, `note` opsional.

**File:** [`validation/kri.schema.ts`](../../src/features/risks/validation/kri.schema.ts) — form KRI (FR-MON-4):
`name` wajib, `current`/`threshold` string bebas-unit (angka di-parse di store untuk hitung breach/rasio).

**File:** [`search.ts`](../../src/features/risks/search.ts) — schema typed URL search params (FR-RISK-2),
dipakai `validateSearch` di route `/risks` ([main.tsx](../../src/main.tsx)).

---

## Presentation Layer

### Hooks

| Hook | Tipe | Query Key | Keterangan |
|---|---|---|---|
| `useRiskRepository` | DI factory | — | Wiring `data → domain` (`useMemo`) |
| `useRisks` | `useQuery` | `["risks", companyId, "list"]` | Daftar risiko aktif; `staleTime` 60 dtk |
| `useRisk(id)` | `useQuery` | `["risks", companyId, "detail", id]` | Satu risiko |
| `useCreateRisk` | `useMutation` | — | invalidate `riskKeys.all(companyId)` |
| `useConfirmAiRisk` | `useMutation` | — | konfirmasi draft AI |
| `useAddTreatment` | `useMutation` | — | tambah mitigasi (FR-TREAT-1) |
| `useUpdateTreatment` | `useMutation` | — | ubah mitigasi (FR-TREAT-4) |
| `useApproveTreatment` | `useMutation` | — | lewat use-case (gate peran) |
| `useRecordReview` | `useMutation` | — | catat review berkala (FR-MON-2) |
| `useAddKri` / `useUpdateKri` / `useRemoveKri` | `useMutation` | — | CRUD indikator KRI (FR-MON-4) |

> **Multi-tenant:** semua key menyertakan `companyId` (perusahaan aktif). Ganti perusahaan lewat
> company switcher otomatis memisah cache (aturan inti #4/#5).

### Components

| Komponen | File | Keterangan |
|---|---|---|
| `NewRiskModal` | [`@/components/NewRiskModal.tsx`](../../src/components/NewRiskModal.tsx) | Form RHF+Zod; `useCreateRisk().mutateAsync` → navigate ke detail |
| `TreatmentFormModal` | [`TreatmentFormModal.tsx`](../../src/features/risks/presentation/components/TreatmentFormModal.tsx) | Form RHF+Zod tambah/ubah mitigasi; field kondisional ACCEPT (justifikasi) & TRANSFER (penyedia/premi) |
| `ReviewModal` | [`ReviewModal.tsx`](../../src/features/risks/presentation/components/ReviewModal.tsx) | Form review berkala: perbarui penilaian (residual bila ada mitigasi), status (reopen FR-MON-5), frekuensi |
| `KriFormModal` | [`KriFormModal.tsx`](../../src/features/risks/presentation/components/KriFormModal.tsx) | Form KRI (nama, current, threshold); breach & rasio dihitung dari angka ter-parse (FR-MON-4) |
| `Heatmap` / `RiskBadge` | `@/components` | Visual level (label + skor, bukan hanya warna — NFR-09) |

### Pages

| Page | File | Alur |
|---|---|---|
| `RiskRegisterPage` | [`RiskRegisterPage.tsx`](../../src/features/risks/RiskRegisterPage.tsx) | `useRisks()` → filter via typed search params (`getRouteApi("/app/risks")`) → tabel + heatmap; **ekspor `.xlsx`/`.pdf` menghormati filter aktif** ([`@/lib/export`](../../src/lib/export.ts), FR-DASH-5) |
| `RiskDetailPage` | [`RiskDetailPage.tsx`](../../src/features/risks/RiskDetailPage.tsx) | `useRisk(riskId)` → stepper, matriks; tambah/ubah mitigasi + approve ACCEPT; **Catat Review** + prompt residual (FR-TREAT-6); **CRUD KRI + badge "Terlampaui"** (FR-MON-4) |

---

## API Endpoints

**Belum ada** — sumber data = mock store in-memory. Target (PRD §5.4): Supabase Postgres + RLS via
`@supabase/supabase-js`, diakses dari `RiskRemoteDataSource` (menggantikan `RiskMockDataSource`).
Tidak ada key/secret di klien (aturan inti #10).

---

## State Management

| State | Tool | Alasan |
|---|---|---|
| Daftar/detail risiko | **TanStack Query** (`useRisks`/`useRisk`) | Server state — cache, invalidate per tenant |
| Filter register | **TanStack Router search params** (Zod) | Shareable/bookmarkable di URL (FR-RISK-2) |
| Referensi (dept/user/compliance/peran) | **Zustand** (`@/data/store`) | Data lintas-fitur; belum punya repository sendiri |
| Form "Risiko Baru" & mitigasi | **react-hook-form + Zod** | Validasi + state form lokal |

---

## Navigasi

| Path | Route id | Page | Keterangan |
|---|---|---|---|
| `/risks` | `/app/risks` | `RiskRegisterPage` | `validateSearch: riskSearchSchema` |
| `/risks/$riskId` | `/app/risks/$riskId` | `RiskDetailPage` | param `riskId` |

> Layout `AppShell` = route pathless `id: "app"` → route id berprefiks `/app`, tapi path `Link`/navigasi
> tanpa prefiks (`to="/risks/$riskId"`). Didaftarkan di [main.tsx](../../src/main.tsx).

---

## Responsiveness

- Layout Tailwind v4 + design token (`@theme` di [index.css](../../src/index.css)); **tanpa hardcode** hex/spacing.
- Breakpoint utama: mobile → `lg`/`xl`. Register: tabel + heatmap menumpuk (`xl:grid-cols-[1fr_320px]`);
  detail: dua kolom di `lg`. Tabel `overflow-x-auto` agar tidak overflow di layar kecil.
- Level risiko selalu **label + skor** (kontras WCAG AA, NFR-09), bukan hanya warna.

---

## Testing

Test runner **Vitest** sudah terpasang & dikonfigurasi ([vitest.config.ts](../../vitest.config.ts)).
Jalankan: `bun run test`.

### Unit — Use Case ([`__tests__/unit/approveTreatment.usecase.test.ts`](../../src/features/risks/__tests__/unit/approveTreatment.usecase.test.ts))

- ✅ `risk_manager`/`admin` → repository dipanggil dengan argumen benar
- ✅ peran lain → `throw`, repository **tidak** dipanggil

### Unit — Mapper ([`__tests__/unit/risk.mapper.test.ts`](../../src/features/risks/__tests__/unit/risk.mapper.test.ts))

- ✅ DTO valid → entity domain
- ✅ DTO rusak (enum salah / id kosong) → `null` / difilter

### Unit — Validation ([`__tests__/unit/treatment.schema.test.ts`](../../src/features/risks/__tests__/unit/treatment.schema.test.ts))

- ✅ REDUCE valid; deskripsi < 3 → pesan ID benar; cost negatif ditolak
- ✅ ACCEPT tanpa justifikasi ditolak (dengan justifikasi lolos); TRANSFER tanpa penyedia ditolak

### Unit — Review ([`__tests__/unit/recordReview.test.ts`](../../src/features/risks/__tests__/unit/recordReview.test.ts))

- ✅ risiko bermitigasi → review menulis **residual** + memajukan `nextReviewDate`
- ✅ risiko tanpa mitigasi → review me-reassess **inherent**

### Unit — KRI ([`__tests__/unit/kri.test.ts`](../../src/features/risks/__tests__/unit/kri.test.ts))

- ✅ breach=true saat current ≥ threshold; rasio benar; update & remove bekerja

### Skenario lanjutan (belum ditulis)

- ⬜ `RiskRepository.list`: datasource di-mock → mapping benar, DTO rusak difilter
- ⬜ `newRiskSchema`: pelanggaran aturan → pesan error Bahasa Indonesia benar
- ⬜ Component `RiskRegisterPage`: render list → filter via search params (RTL)

> E2E (Playwright) & RLS test (pgTAP) = target NFR-12, menyusul saat Supabase masuk.

---

## Migrasi dari Akses Store Langsung

Sebelumnya page memanggil `useStore` langsung untuk entity Risk. Kini akses entity lewat repository.

| Sebelum | Sesudah |
|---|---|
| `useStore(s => s.activeRisks())` | `useRisks()` (TanStack Query) |
| `useStore(s => s.activeRisks().find(...))` | `useRisk(riskId)` |
| `store.addRisk(...)` | `useCreateRisk().mutateAsync(...)` |
| `store.confirmAiRisk(id)` | `useConfirmAiRisk().mutate(id)` |
| `store.approveTreatment(...)` | `useApproveTreatment().mutate(...)` (gate via use-case) |

### Yang dipertahankan (paritas perilaku)

- Filter register tetap di URL (typed search params), termasuk filter sel heatmap (`l`/`i`).
- Lookup referensi (departemen, user, compliance, peran) tetap dari store sampai fitur terkait
  punya repository sendiri.
- Path navigasi tidak berubah (`/risks`, `/risks/$riskId`).

### Belum dimigrasi

- [ ] Fitur lain (incidents, compliance, dashboard, reports, audit, onboarding) masih akses store langsung.
- [ ] `RiskRemoteDataSource` (Supabase) — saat backend tersedia.
