# Kepatuhan & Regulasi Feature

Pemetaan & pemantauan kepatuhan organisasi terhadap regulasi/standar industri & GCG (FR-COMP-*).
Library regulasi 3 industri di-seed saat onboarding (FR-COMP-5).

> ⚠️ **Mock phase:** data layer membaca [Zustand mock store](../../src/data/store.ts), bukan Supabase.
> **Mapping m:n (FR-COMP-2) + CRUD requirement custom (FR-COMP-1) sudah ada.** Regulasi sistem
> (`isSystem`) read-only sampai diduplikasi (FR-COMP-6).

---

## Daftar Isi

1. [Lokasi File](#lokasi-file)
2. [Folder Structure](#folder-structure)
3. [Dependency Flow](#dependency-flow)
4. [Domain Layer](#domain-layer)
5. [Data Layer](#data-layer)
6. [Presentation Layer](#presentation-layer)
7. [State Management](#state-management)
8. [Navigasi](#navigasi)
9. [Testing](#testing)
10. [Status & Belum Dibangun](#status--belum-dibangun)

---

## Lokasi File

```
src/features/compliance/
```

Entry point publik: [`index.ts`](../../src/features/compliance/index.ts)

---

## Folder Structure

```
compliance/
├── domain/
│   ├── repositories/IComplianceRepository.ts   # list + setMapping (FR-COMP-2)
│   └── index.ts
├── data/
│   ├── datasources/compliance.dto.ts · ComplianceMockDataSource.ts
│   ├── mappers/compliance.mapper.ts            # validasi Zod
│   ├── repositories/ComplianceRepository.ts
│   └── index.ts
├── validation/compliance.schema.ts             # Zod form CRUD requirement (FR-COMP-1)
├── presentation/
│   ├── components/
│   │   ├── ComplianceMappingModal.tsx          # kelola risiko tertaut + status (FR-COMP-2)
│   │   └── ComplianceFormModal.tsx             # tambah/ubah requirement custom (FR-COMP-1)
│   └── hooks/
│       ├── useComplianceRepository.ts · complianceKeys.ts
│       ├── useCompliances.ts                    # useQuery
│       └── useComplianceMutations.ts           # setMapping + create/update/remove
├── __tests__/unit/
│   ├── compliance.mapper.test.ts
│   ├── setComplianceMapping.test.ts            # invariant sinkron dua arah
│   └── complianceCrud.test.ts                  # CRUD + guard regulasi sistem
├── CompliancePage.tsx
└── index.ts
```

> **Tanpa folder `use-cases`** — pemetaan tidak punya gate peran/aturan kompleks; sinkronisasi m:n
> dua arah ditangani di store/repository, sesuai aturan "use-case hanya bila ada aturan bisnis"
> ([frontend-structure.md](../../.claude/guidelines/frontend-structure.md) §3).
> Entity `ComplianceRequirement` dari [`@/data/types`](../../src/data/types.ts).

---

## Dependency Flow

```
CompliancePage
    ├── useCompliances            (useQuery — complianceKeys.list(companyId))
    │       └── useComplianceRepository (DI) → IComplianceRepository
    │               └── ComplianceRepository → ComplianceMockDataSource → @/data/store
    │                       └── ComplianceDTO → complianceToDomain (Zod) → ComplianceRequirement
    └── ComplianceMappingModal → useSetComplianceMapping  (useMutation)
            └── repo.setMapping → store.setComplianceMapping (sinkron 2 arah)
            └── invalidate complianceKeys.all + riskKeys.all
```

---

## Domain Layer

### Repository Interface

**File:** [`domain/repositories/IComplianceRepository.ts`](../../src/features/compliance/domain/repositories/IComplianceRepository.ts)

```typescript
interface IComplianceRepository {
  list(): Promise<ComplianceRequirement[]>;
  create(input: ComplianceFormInput): Promise<string>;            // FR-COMP-1
  update(id: string, input: ComplianceFormInput): Promise<void>;  // custom saja
  remove(id: string): Promise<void>;                              // custom saja
  duplicate(id: string): Promise<string>;                         // sistem → custom (FR-COMP-6)
  setMapping(complianceId: string, riskIds: string[], status: ComplianceStatus): Promise<void>;
}
```

> **Guard FR-COMP-6:** `update`/`remove` hanya berpengaruh pada requirement `isSystem = false`;
> regulasi sistem (seed) read-only di store **dan** disembunyikan tombol edit/hapus-nya di UI.

> `setMapping` menjaga invariant m:n **dua arah**: `risk.complianceIds` ↔ `requirement.linkedRiskIds`
> selalu konsisten (diuji di [setComplianceMapping.test.ts](../../src/features/compliance/__tests__/unit/setComplianceMapping.test.ts)).

---

## Data Layer

| File | Peran |
|---|---|
| [`compliance.dto.ts`](../../src/features/compliance/data/datasources/compliance.dto.ts) | `ComplianceDTO` (mock: `= ComplianceRequirement`) |
| [`ComplianceMockDataSource.ts`](../../src/features/compliance/data/datasources/ComplianceMockDataSource.ts) | `list/create/update/remove/setMapping` → action store terkait |
| [`compliance.mapper.ts`](../../src/features/compliance/data/mappers/compliance.mapper.ts) | `complianceToDomain` / `complianceListToDomain` (Zod; `progress` 0–100, status enum) |
| [`ComplianceRepository.ts`](../../src/features/compliance/data/repositories/ComplianceRepository.ts) | `implements IComplianceRepository` |

---

## Presentation Layer

### Hooks

| Hook | Tipe | Query Key | Keterangan |
|---|---|---|---|
| `useComplianceRepository` | DI factory | — | wiring data→domain |
| `useCompliances` | `useQuery` | `["compliance", companyId, "list"]` | daftar requirement; `staleTime` 60 dtk |
| `useSetComplianceMapping` | `useMutation` | — | set mapping+status → invalidate `complianceKeys.all` **dan** `riskKeys.all` |
| `useCreateCompliance` | `useMutation` | — | tambah requirement custom (FR-COMP-1) |
| `useUpdateCompliance` | `useMutation` | — | ubah requirement custom |
| `useRemoveCompliance` | `useMutation` | — | hapus custom → invalidate compliance **+** risks |
| `useDuplicateCompliance` | `useMutation` | — | duplikasi sistem → custom (FR-COMP-6) |

### Components

| Komponen | File | Keterangan |
|---|---|---|
| `ComplianceMappingModal` | [`ComplianceMappingModal.tsx`](../../src/features/compliance/presentation/components/ComplianceMappingModal.tsx) | Checklist risiko aktif (tertaut) + dropdown status → `useSetComplianceMapping` |
| `ComplianceFormModal` | [`ComplianceFormModal.tsx`](../../src/features/compliance/presentation/components/ComplianceFormModal.tsx) | Form RHF+Zod tambah/ubah requirement custom (nama, deskripsi, otoritas, industri, status) |

### Pages

| Page | File | Alur |
|---|---|---|
| `CompliancePage` | [`CompliancePage.tsx`](../../src/features/compliance/CompliancePage.tsx) | `useCompliances()` → kartu ringkas + grid framework; **Tambah Regulasi** (header), per-kartu **Kelola Pemetaan** + **edit/hapus** (custom saja, gated `can("edit")`); tandai **gap** |

> Lookup `risks` (untuk hitung relasi & checklist) tetap dari [store](../../src/data/store.ts).

---

## State Management

| State | Tool | Alasan |
|---|---|---|
| Daftar requirement | **TanStack Query** (`useCompliances`) | server state per tenant |
| `risks` (relasi) | **Zustand** | data fitur lain |

---

## Navigasi

| Path | Route id | Page |
|---|---|---|
| `/compliance` | `/app/compliance` | `CompliancePage` (lazy) |

---

## Testing

`bun run test`.

Mapper ([compliance.mapper.test.ts](../../src/features/compliance/__tests__/unit/compliance.mapper.test.ts)):
- ✅ DTO valid → entity; `progress` di luar 0–100 → `null`; item rusak difilter

Mapping invariant ([setComplianceMapping.test.ts](../../src/features/compliance/__tests__/unit/setComplianceMapping.test.ts)):
- ✅ menautkan risiko menyinkronkan kedua sisi + set status
- ✅ melepas tautan menghapus dari kedua sisi

CRUD ([complianceCrud.test.ts](../../src/features/compliance/__tests__/unit/complianceCrud.test.ts)):
- ✅ add → custom (`isSystem=false`); update mengubah status+progress
- ✅ remove menghapus custom; **regulasi sistem tidak terhapus** (FR-COMP-6)

---

## Status & Belum Dibangun

Lihat [PROGRESS.md](../PROGRESS.md). Status: 🟡 (tampil + seed + **mapping m:n & CRUD custom** jalan).

- [x] Mapping m:n risk ↔ requirement + status (FR-COMP-2) — `ComplianceMappingModal`.
- [x] CRUD requirement custom (FR-COMP-1) + guard regulasi sistem (FR-COMP-6) — `ComplianceFormModal`.
- [x] **Duplikasi** regulasi sistem → custom (FR-COMP-6) — tombol `content_copy` + `useDuplicateCompliance`.
- [x] **Laporan kepatuhan + gap** (FR-COMP-4) — `buildComplianceReportRows` → ekspor `.xlsx`/`.pdf`.
- [ ] Mapping ke **treatment** (selain risk) — FR-COMP-2 menyebut risk/treatment; baru risk.
