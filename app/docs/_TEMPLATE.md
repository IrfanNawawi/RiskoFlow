<!--
TEMPLATE dokumentasi fitur (web SPA). Salin file ini ke docs/features/<nama-fitur>.md
lalu isi placeholder <...> dan hapus blok komentar HTML.

Contoh nyata yang sudah jadi: docs/features/risks.md.

Aturan (lihat .claude/guidelines/technical-writing.md):
- Verifikasi SETIAP path/route/lib ke kode nyata. Jangan tulis yang tidak ada.
- Bedakan "sudah ada" (mock store, TanStack Router, Vitest) vs "⚠️ target" (Supabase).
- Entity digambarkan sebagai `type` + pure function (BUKAN class).
- Layer dinamis (use-cases, store, validation) hanya didokumentasikan bila memang ada — hapus bagiannya bila tidak.
- Bagian Testing diisi skenario konkret (Vitest sudah terpasang).
- Prosa Bahasa Indonesia; identifier kode Bahasa Inggris.
-->

# <Nama Fitur> Feature

<Satu–dua kalimat: fitur ini untuk apa, dari sudut pandang pengguna + referensi FR-* PRD.>

> ⚠️ **Mock phase** (bila relevan): data layer membaca [Zustand mock store](../../src/data/store.ts),
> bukan Supabase. Signature repository sudah Supabase-ready.

---

## Daftar Isi

1. [Lokasi File](#lokasi-file)
2. [Folder Structure](#folder-structure)
3. [Dependency Flow](#dependency-flow)
4. [Domain Layer](#domain-layer)
5. [Data Layer](#data-layer)
6. [Validation Layer](#validation-layer)
7. [Presentation Layer](#presentation-layer)
8. [Data Source / API](#data-source--api)
9. [State Management](#state-management)
10. [Navigasi](#navigasi)
11. [Responsiveness](#responsiveness)
12. [Testing](#testing)
13. [Migrasi](#migrasi)

---

## Lokasi File

```
src/features/<nama-fitur>/
```

Entry point publik: [`index.ts`](../../src/features/<nama-fitur>/index.ts)

---

## Folder Structure

<!-- Cantumkan hanya folder/file yang BENAR-BENAR dibuat. Layer dinamis (use-cases, stores,
     validation) dihapus bila fitur tidak membutuhkannya — jangan buat folder kosong. -->

```
<nama-fitur>/
├── domain/
│   ├── repositories/
│   │   └── I<Name>Repository.ts
│   ├── use-cases/                  # OPSIONAL — hanya bila ada business logic
│   │   └── <verb><Name>.usecase.ts
│   └── index.ts
├── data/
│   ├── datasources/
│   │   ├── <nama-fitur>.dto.ts
│   │   └── <Name>MockDataSource.ts   # ⚠️ mock; target: <Name>RemoteDataSource (Supabase)
│   ├── mappers/
│   │   └── <nama-fitur>.mapper.ts
│   ├── repositories/
│   │   └── <Name>Repository.ts        # implements I<Name>Repository
│   └── index.ts
├── validation/                     # OPSIONAL — bila ada form
│   └── <nama-fitur>.schema.ts
├── presentation/
│   ├── stores/                     # OPSIONAL — UI state global khusus fitur (Zustand)
│   │   └── <nama-fitur>.store.ts
│   └── hooks/
│       ├── use<Name>Repository.ts  # DI factory
│       ├── <name>Keys.ts           # query-key factory (sertakan tenant)
│       ├── use<Name>s.ts           # useQuery (list/detail)
│       └── use<Name>Mutations.ts   # useMutation
├── __tests__/unit/
├── <Name>Page.tsx                  # page (route component)
└── index.ts
```

> Entity sering dipakai bersama dari [`@/data/types`](../../src/data/types.ts) + pure function di
> [`@/lib`](../../src/lib/) (aturan inti #2: entity = `type` + pure function, bukan class).

---

## Dependency Flow

```
<Name>Page
    │
    ├── use<Name>s / use<Name>        (useQuery — queryKey: <name>Keys.*(companyId))
    │       └── use<Name>Repository (DI) → I<Name>Repository
    │               └── <Name>Repository
    │                       └── <Name>MockDataSource → @/data/store  (⚠️ target: Supabase)
    │                               └── <Name>DTO → <name>ToDomain (validasi Zod) → <Entity>
    │
    └── use<Name>Mutations            (useMutation → invalidate <name>Keys.all)
            └── [<verb> use-case: aturan bisnis] → repository
```

---

## Domain Layer

### Entities

`<Name>` — `type` polos (dari [`@/data/types`](../../src/data/types.ts) atau `domain/entities/`).
Pure function turunan (pengganti getter):

| Fungsi | Signature | Keterangan |
|---|---|---|
| `<fn>` | `(x: <Name>) => <ret>` | <keterangan; sebut null-handling> |

### Repository Interface

**File:** [`domain/repositories/I<Name>Repository.ts`](../../src/features/<nama-fitur>/domain/repositories/I<Name>Repository.ts)

```typescript
interface I<Name>Repository {
  list(): Promise<<Name>[]>;
  getById(id: string): Promise<<Name> | undefined>;
}
```

### Use Cases

<!-- Hapus bagian ini bila fitur tidak punya business logic. -->

| Use Case | Input | Output | Aturan bisnis |
|---|---|---|---|
| `<verb><Name>(repo, ...)` | `<input>` | `Promise<...>` | <aturan, mis. gate peran> |

---

## Data Layer

### DTOs

**File:** [`data/datasources/<nama-fitur>.dto.ts`](../../src/features/<nama-fitur>/data/datasources/<nama-fitur>.dto.ts)

| DTO | Digunakan oleh | Catatan |
|---|---|---|
| `<Name>DTO` | output data source | Mock: `= <Name>`. Target Supabase: baris snake_case |

### Data Source

**File:** [`data/datasources/<Name>MockDataSource.ts`](../../src/features/<nama-fitur>/data/datasources/<Name>MockDataSource.ts)

| Method | Sumber (mock) | Target (Supabase) |
|---|---|---|
| `list()` | `store.active<...>()` | `select … where company_id = …` |

### Mapper

**File:** [`data/mappers/<nama-fitur>.mapper.ts`](../../src/features/<nama-fitur>/data/mappers/<nama-fitur>.mapper.ts)

| Fungsi | Input | Output | Catatan |
|---|---|---|---|
| `<x>ToDomain(dto)` | `<X>DTO` | `<Entity> \| null` | Validasi Zod; data rusak → `null` |

### Repository Implementation

**File:** [`data/repositories/<Name>Repository.ts`](../../src/features/<nama-fitur>/data/repositories/<Name>Repository.ts)

`implements I<Name>Repository`; gabung datasource + mapper. **DTO tidak bocor** ke presentation.

---

## Validation Layer

<!-- Hapus bila tidak ada form. -->

**File:** [`validation/<nama-fitur>.schema.ts`](../../src/features/<nama-fitur>/validation/<nama-fitur>.schema.ts)

Schema **Zod** untuk input form (react-hook-form via `zodResolver`). Pesan error Bahasa Indonesia.

| Export | Tipe | Keterangan |
|---|---|---|
| `<name>Schema` | `z.object` | <field + aturan> |
| `<Name>Input` | `z.infer<...>` | Tipe hasil inferensi |

---

## Presentation Layer

### Hooks

| Hook | Tipe | Query Key | Keterangan |
|---|---|---|---|
| `use<Name>Repository` | DI factory | — | Wiring data→domain (`useMemo`) |
| `use<Name>s` | `useQuery` | `["<key>", companyId, ...]` | <config: staleTime> |
| `use<Verb><Name>` | `useMutation` | — | invalidate `<name>Keys.all(companyId)` |

> **Multi-tenant:** query key WAJIB menyertakan `companyId` (perusahaan aktif).

### Components

| Komponen | File | Keterangan |
|---|---|---|
| `<Name>Card` | [`...`](../../src/features/<nama-fitur>/presentation/components/<Name>Card.tsx) | <props utama + keterangan> |

### Pages

| Page | File | Alur |
|---|---|---|
| `<Name>Page` | [`<Name>Page.tsx`](../../src/features/<nama-fitur>/<Name>Page.tsx) | <alur + search/route params> |

---

## Data Source / API

<!-- Mock phase: tulis "Belum ada API; sumber = mock store". Saat Supabase: isi tabel. -->

| Operasi | Sumber sekarang | Target (Supabase) | Auth |
|---|---|---|---|
| <op> | `@/data/store` (mock) | `<tabel/RPC>` + RLS | — (anon key `VITE_*`) |

> Tidak ada secret/service-role key di klien (aturan inti #10). Akses data lewat repository, bukan
> komponen memanggil Supabase langsung.

---

## State Management

| State | Tool | Alasan |
|---|---|---|
| <data server> | **TanStack Query** | Server state — cache, invalidate per tenant |
| <filter di URL> | **TanStack Router search params** (Zod) | Shareable/bookmarkable |
| <UI state global> | **Zustand** | UI state lintas komponen |
| <state lokal> | `useState` | Hanya 1 komponen |

---

## Navigasi

| Path | Route id | Page | Keterangan |
|---|---|---|---|
| `/<path>` | `/app/<path>` | `<Name>Page` | <search/param + validateSearch bila ada> |

> Rute didaftarkan **code-based** di [main.tsx](../../src/main.tsx) (`createRoute` + `addChildren`),
> di-`lazyRouteComponent` (code splitting). Layout `AppShell` = route pathless `id: "app"` → route id
> berprefiks `/app`, tetapi path `Link`/navigasi tanpa prefiks (`to="/<path>"`).

---

## Responsiveness

- Layout Tailwind v4 + design token (`@theme` di [index.css](../../src/index.css)); **tanpa hardcode** hex/spacing.
- Breakpoint utama: mobile → `lg`/`xl`. <Jelaskan grid/stacking + `overflow-x-auto` bila ada tabel.>
- a11y: level risiko **label + skor** (bukan hanya warna), ikon-only punya `aria-label`, kontras WCAG AA (NFR-09).

---

## Testing

Test runner **Vitest** sudah terpasang ([vitest.config.ts](../../vitest.config.ts)). Jalankan: `bun run test`.

### Unit — Use Case ([`__tests__/unit/<verb><Name>.usecase.test.ts`](../../src/features/<nama-fitur>/__tests__/unit/))

- ✅ jalur sukses → repository dipanggil dengan argumen benar
- ✅ aturan bisnis dilanggar → `throw`; repository tidak dipanggil

### Unit — Mapper ([`__tests__/unit/<nama-fitur>.mapper.test.ts`](../../src/features/<nama-fitur>/__tests__/unit/))

- ✅ DTO valid → entity domain
- ✅ DTO rusak (enum/field salah) → `null` / difilter

### Unit — Validation (bila ada form)

- ✅ input valid → lolos; pelanggaran → pesan error Bahasa Indonesia benar

### Component (opsional, React Testing Library)

- ✅ render loading → success; empty/error state tampil benar

> E2E (Playwright) & RLS test (pgTAP) = target NFR-12, menyusul saat Supabase masuk.

---

## Migrasi

<!-- Bila fitur ini menggantikan akses store langsung / halaman lama. Hapus bila fitur baru. -->

| Sebelum | Sesudah |
|---|---|
| `useStore(s => s.active<...>())` | `use<Name>s()` (TanStack Query) |
| `store.<action>(...)` | `use<Verb><Name>().mutate(...)` |

### Yang dipertahankan (paritas perilaku)

- <Logika/edge case yang harus identik.>
- <Path navigasi dipertahankan: `/<path>`, ...>

### Belum dimigrasi

- [ ] <Fitur/akses store lain yang masih langsung.>
- [ ] `<Name>RemoteDataSource` (Supabase) — saat backend tersedia.
