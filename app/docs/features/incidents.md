# Incident / Loss-Event Log Feature

Pencatatan kejadian risiko nyata (loss event / near-miss) sebagai umpan balik ke penilaian &
pemantauan (FR-INC-*). Insiden kerugian besar butuh approval sebelum ditutup (FR-INC-6).

> ⚠️ **Mock phase:** data layer membaca [Zustand mock store](../../src/data/store.ts), bukan Supabase.
> Auto-advance review & trigger DB (FR-INC-4) = 🎯 target.

---

## Daftar Isi

1. [Lokasi File](#lokasi-file)
2. [Folder Structure](#folder-structure)
3. [Dependency Flow](#dependency-flow)
4. [Domain Layer](#domain-layer)
5. [Data Layer](#data-layer)
6. [Validation Layer](#validation-layer)
7. [Presentation Layer](#presentation-layer)
8. [State Management](#state-management)
9. [Navigasi](#navigasi)
10. [Testing](#testing)
11. [Status & Belum Dibangun](#status--belum-dibangun)

---

## Lokasi File

```
src/features/incidents/
```

Entry point publik: [`index.ts`](../../src/features/incidents/index.ts)

---

## Folder Structure

```
incidents/
├── domain/
│   ├── repositories/IIncidentRepository.ts
│   ├── use-cases/approveIncidentClose.usecase.ts   # gate peran (FR-INC-6)
│   └── index.ts
├── data/
│   ├── datasources/incident.dto.ts · IncidentMockDataSource.ts
│   ├── mappers/incident.mapper.ts                  # validasi Zod
│   ├── repositories/IncidentRepository.ts
│   └── index.ts
├── validation/newIncident.schema.ts               # Zod form "Catat Insiden" (FR-INC-1)
├── presentation/
│   ├── components/NewIncidentModal.tsx            # form RHF + Zod
│   └── hooks/
│       ├── useIncidentRepository.ts · incidentKeys.ts
│       ├── useIncidents.ts                         # useQuery
│       └── useIncidentMutations.ts                # useCreateIncident · useApproveIncidentClose
├── __tests__/unit/
│   ├── approveIncidentClose.usecase.test.ts
│   └── newIncident.schema.test.ts
├── IncidentsPage.tsx
└── index.ts
```

> Entity `Incident` dari [`@/data/types`](../../src/data/types.ts).

---

## Dependency Flow

```
IncidentsPage
    ├── useIncidents              (useQuery — incidentKeys.list(companyId))
    │       └── useIncidentRepository (DI) → IIncidentRepository
    │               └── IncidentRepository → IncidentMockDataSource → @/data/store
    │                       └── IncidentDTO → incidentToDomain (Zod) → Incident
    ├── NewIncidentModal → useCreateIncident   (useMutation → repo.create → invalidate)
    │       └── newIncidentSchema (RHF + zodResolver)
    └── useApproveIncidentClose   (useMutation)
            └── approveIncidentClose use-case (gate risk_manager/admin) → repository
```

---

## Domain Layer

### Repository Interface

**File:** [`domain/repositories/IIncidentRepository.ts`](../../src/features/incidents/domain/repositories/IIncidentRepository.ts)

```typescript
interface IIncidentRepository {
  list(): Promise<Incident[]>;
  create(input: NewIncidentInput): Promise<string>;
  linkRisk(incidentId: string, riskId: string): Promise<void>; // FR-INC-2
  approveClose(incidentId: string): Promise<void>;
}
```

### Use Cases

| Use Case | Input | Output | Aturan bisnis |
|---|---|---|---|
| `approveIncidentClose(repo, roles)` | `incidentId` | `Promise<void>` | Hanya `risk_manager`/`admin` (FR-INC-6, D13); selain itu `throw`, repo tak dipanggil |

> Threshold (`closeApprovalThreshold`, default Rp 50 jt) menentukan **kapan** approval diperlukan —
> dievaluasi di UI ([IncidentsPage.tsx](../../src/features/incidents/IncidentsPage.tsx)). Gate **siapa**
> yang boleh menyetujui ada di use-case.

---

## Data Layer

| File | Peran |
|---|---|
| [`incident.dto.ts`](../../src/features/incidents/data/datasources/incident.dto.ts) | `IncidentDTO` (mock: `= Incident`) |
| [`IncidentMockDataSource.ts`](../../src/features/incidents/data/datasources/IncidentMockDataSource.ts) | `list()` → `store.activeIncidents()`; `create()` → `store.addIncident()`; `approveClose()` → `store.approveIncidentClose()` |
| [`incident.mapper.ts`](../../src/features/incidents/data/mappers/incident.mapper.ts) | `incidentToDomain` / `incidentListToDomain` (Zod; rusak → `null`/difilter) |
| [`IncidentRepository.ts`](../../src/features/incidents/data/repositories/IncidentRepository.ts) | `implements IIncidentRepository` |

---

## Validation Layer

**File:** [`validation/newIncident.schema.ts`](../../src/features/incidents/validation/newIncident.schema.ts)

Schema **Zod** form "Catat Insiden" (RHF via `zodResolver`). Pesan error Bahasa Indonesia.

| Export | Aturan |
|---|---|
| `newIncidentSchema` | `title` 3–150; `occurredAt` wajib & **tidak boleh masa depan**; `departmentId` wajib; `type` ∈ {LOSS, NEAR_MISS}; `lossAmount` integer ≥ 0; **NEAR_MISS ⇒ lossAmount = 0**; `riskIds` opsional |
| `NewIncidentInput` | `z.infer<...>` |

---

## Presentation Layer

### Hooks

| Hook | Tipe | Query Key | Keterangan |
|---|---|---|---|
| `useIncidentRepository` | DI factory | — | wiring data→domain |
| `useIncidents` | `useQuery` | `["incidents", companyId, "list"]` | daftar insiden; `staleTime` 60 dtk |
| `useCreateIncident` | `useMutation` | — | `repo.create` → invalidate `incidentKeys.all` |
| `useLinkIncidentRisk` | `useMutation` | — | tautkan insiden → risiko (FR-INC-2) |
| `useApproveIncidentClose` | `useMutation` | — | via use-case (gate peran) → invalidate `incidentKeys.all` |

### Components

| Komponen | File | Keterangan |
|---|---|---|
| `NewIncidentModal` | [`NewIncidentModal.tsx`](../../src/features/incidents/presentation/components/NewIncidentModal.tsx) | Form RHF+Zod; `lossAmount` terkunci 0 saat NEAR_MISS; tautkan ke risiko opsional (checkbox) → `useCreateIncident` |

### Pages

| Page | File | Alur |
|---|---|---|
| `IncidentsPage` | [`IncidentsPage.tsx`](../../src/features/incidents/IncidentsPage.tsx) | `useIncidents()` → statistik (kerugian/open/near-miss) + tabel; tombol **Catat Insiden** buka `NewIncidentModal`; badge "butuh approval" bila `LOSS ≥ threshold`; Approve & Close untuk yang berwenang |

> Lookup `deptById`, `threshold`, `can("approve")` tetap dari [store](../../src/data/store.ts).

---

## State Management

| State | Tool | Alasan |
|---|---|---|
| Daftar insiden | **TanStack Query** (`useIncidents`) | server state, invalidate per tenant |
| Referensi (dept, threshold, peran) | **Zustand** | data lintas-fitur |

---

## Navigasi

| Path | Route id | Page |
|---|---|---|
| `/incidents` | `/app/incidents` | `IncidentsPage` (lazy) |

Didaftarkan di [main.tsx](../../src/main.tsx) (`lazyRouteComponent`).

---

## Testing

`bun run test`.

Use-case ([approveIncidentClose.usecase.test.ts](../../src/features/incidents/__tests__/unit/approveIncidentClose.usecase.test.ts)):
- ✅ `risk_manager` → repository dipanggil dengan id benar
- ✅ peran lain → `throw`, repository tidak dipanggil

Validation ([newIncident.schema.test.ts](../../src/features/incidents/__tests__/unit/newIncident.schema.test.ts)):
- ✅ LOSS valid lolos; judul < 3 → pesan ID benar
- ✅ tanggal masa depan ditolak; NEAR_MISS + kerugian > 0 ditolak; NEAR_MISS + 0 lolos

Skenario menyusul: ⬜ `IncidentRepository.list` mapping; ⬜ component render statistik + gate tombol.

---

## Status & Belum Dibangun

Lihat [PROGRESS.md](../PROGRESS.md). Status: 🟡 (UI + catat insiden + approve close jalan).

- [x] Form **Catat Insiden** (FR-INC-1) — `NewIncidentModal` + `useCreateIncident`.
- [x] Tautkan insiden → risiko saat dibuat (FR-INC-2, opsional via checkbox).
- [x] CTA **"Buat risiko"** untuk insiden tanpa risiko → `NewRiskModal` prefill + auto-link (FR-INC-2).
- [ ] Auto-advance `next_review_date` risiko terkait (FR-INC-4) — 🎯 trigger DB.
- [ ] Soft delete (FR-INC-5); `IncidentRemoteDataSource` (Supabase).
