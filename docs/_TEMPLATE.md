# <Fitur> Feature — RiskoFlow

<1–2 kalimat: fitur guna + FR-* ref dari PRD.>

> ⚠️ **Mock phase**: data via Zustand `@/data/store`, bukan Supabase. Saat live: datasource → Supabase PostgREST/RPC.

---

## Toc

1. [Lokasi](#lokasi-file)
2. [Struktur Folder](#folder-structure)
3. [Dependency Flow](#dependency-flow)
4. [Domain Layer](#domain-layer)
5. [Data Layer](#data-layer)
6. [Validasi](#validation-layer)
7. [Presentation](#presentation-layer)
8. [Data Source](#data-source--api)
9. [State Mgmt](#state-management)
10. [Routing](#navigasi)
11. [Responsif](#responsiveness)
12. [Testing](#testing)
13. [Migrasi](#migrasi)

---

## Lokasi File

```
src/features/<fitur>/
```

Entry: [`index.ts`](../src/features/<fitur>/index.ts)

---

## Folder Structure

**Tambah layer hanya saat dibutuhkan** — no empty folder.

```
<fitur>/
├── domain/
│   ├── repositories/
│   │   └── I<Name>Repository.ts
│   ├── use-cases/        ← HANYA jika ada biz logic (gate, multi-step)
│   │   └── <verb><Name>.usecase.ts
│   └── index.ts
├── data/
│   ├── datasources/
│   │   ├── <fitur>.dto.ts
│   │   └── <Name>MockDataSource.ts  ← mock sekarang; target: Supabase
│   ├── mappers/
│   │   └── <fitur>.mapper.ts        ← DTO → entity + Zod validasi
│   ├── repositories/
│   │   └── <Name>Repository.ts      ← impl I<Name>Repository
│   └── index.ts
├── validation/           ← HANYA jika ada form (react-hook-form)
│   └── <fitur>.schema.ts ← Zod; pesan error Bahasa Indonesia
├── presentation/
│   ├── components/       ← Fitur-local component (bukan shared)
│   ├── hooks/
│   │   ├── use<Name>Repository.ts  ← DI factory
│   │   ├── <fitur>Keys.ts          ← query-key factory + companyId
│   │   ├── use<Name>s.ts           ← useQuery (list/detail)
│   │   └── use<Name>Mutations.ts   ← useMutation
│   ├── stores/           ← HANYA jika ada global UI state (Zustand)
│   │   └── <fitur>.store.ts
│   ├── pages/
│   │   └── <Name>Page.tsx           ← thin: hook → component
│   └── index.ts
├── __tests__/
├── index.ts             ← export page
└── README.md            ← LOCAL docs (optional)
```

---

## Dependency Flow

```
<Name>Page
├── use<Name>s / use<Name>     (useQuery; key: <fitur>Keys.*(companyId))
│   └── use<Name>Repository (DI) → I<Name>Repository
│       └── <Name>Repository
│           └── <Name>MockDataSource → @/data/store
│               └── DTO → mapper (Zod) → entity
│
└── use<Name>Mutations        (useMutation; invalidate <fitur>Keys.all)
    └── [use-case] → repo
```

**Rule:** presentasi tidak import `data/` langsung — via DI hook.

---

## Domain Layer

### Entities

`type` + pure function (bukan class). Core di [`@/data/types`](../src/data/types.ts):

```typescript
export interface <Name> {
  id: string;
  companyId: string;      // ← multi-tenant wajib
  // … field
}

export const <fn> = (x: <Name>): Ret => /* … */;
```

### Repository Interface

**File:** `domain/repositories/I<Name>Repository.ts`

```typescript
export interface I<Name>Repository {
  list(query: ListQuery): Promise<<Name>[]>;
  getById(id: string): Promise<<Name> | undefined>;
  // … create, update, delete
}
```

### Use Cases (Dinamis)

**HANYA saat:**
- Permission gate (role check)
- Multi-step / cross-aggregate logic

**Hapus jika:** passthrough fetch, form validasi saja.

```typescript
export const <verb><Name> = (
  repo: I<Name>Repository, 
  roles: MembershipRole[]
) => async (arg) => {
  if (!roles.includes("risk_manager")) throw new Error("Denied");
  return repo.<action>(arg);
};
```

---

## Data Layer

### DTO (snake_case)

**File:** `data/datasources/<fitur>.dto.ts`

```typescript
export interface <Name>DTO {
  id: string;
  company_id: string;     // ← Supabase snake_case
  // …
}
```

Generated dari Supabase: [`database.types.ts`](../src/database.types.ts) (via `supabase gen types`).

### Data Source

**File:** `data/datasources/<Name>MockDataSource.ts`

```typescript
export class <Name>MockDataSource implements I<Name>DataSource {
  async list(): Promise<<Name>DTO[]> {
    return store.active<...>();  // ← mock; target: supabase.from()
  }
}
```

Target Supabase:
```typescript
// data/datasources/<Name>RemoteDataSource.ts
async list(companyId: string): Promise<<Name>DTO[]> {
  const { data } = await supabase
    .from("<table>")
    .select(/* specific col */)
    .eq("company_id", companyId);  // RLS scope otomatis + client enforce
  return data ?? [];
}
```

### Mapper

**File:** `data/mappers/<fitur>.mapper.ts`

```typescript
import { z } from "zod";

const dtoSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  // …
});

export const <name>ToDomain = (dto: <Name>DTO): <Name> | null => {
  const parsed = dtoSchema.safeParse(dto);
  if (!parsed.success) return null; // DTO corrupt → filter
  return {
    id: parsed.data.id,
    companyId: parsed.data.company_id,  // ← camelCase domain
    // …
  };
};
```

**Wajib:** DTO tidak bocor ke `presentation`.

### Repository Impl

**File:** `data/repositories/<Name>Repository.ts`

```typescript
export class <Name>Repository implements I<Name>Repository {
  constructor(private ds: I<Name>DataSource) {}

  async list(query): Promise<<Name>[]> {
    const dtos = await this.ds.list();
    return dtos.map(<name>ToDomain).filter(Boolean);
  }
}
```

---

## Validation Layer

**File:** `validation/<fitur>.schema.ts` (jika ada form)

```typescript
import { z } from "zod";

export const <name>Schema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  // … Bahasa Indonesia pesan error
});

export type <Name>Input = z.infer<typeof <name>Schema>;
```

Pakai dengan `react-hook-form`:
```typescript
const form = useForm<CreateInput>({
  resolver: zodResolver(createSchema),
});
```

---

## Presentation Layer

### Hooks (DI + Query)

**File:** `presentation/hooks/use<Name>Repository.ts`

```typescript
export const use<Name>Repository = (): I<Name>Repository => {
  return useMemo(() => {
    const ds = new <Name>MockDataSource(); // target: RemoteDataSource
    return new <Name>Repository(ds);
  }, []);
};
```

**File:** `presentation/hooks/<fitur>Keys.ts`

```typescript
export const <fitur>Keys = {
  all: (companyId: string) => [<fitur>, companyId],
  list: (companyId: string, filter?) => [
    ...<fitur>Keys.all(companyId),
    "list",
    filter
  ],
  detail: (companyId: string, id: string) => [
    ...<fitur>Keys.all(companyId),
    "detail",
    id
  ],
} as const;
```

**Wajib:** Query key include `companyId` (multi-tenant scope).

**File:** `presentation/hooks/use<Name>s.ts`

```typescript
export const use<Name>s = (companyId: string, filter?: Filter) => {
  const repo = use<Name>Repository();
  return useQuery({
    queryKey: <fitur>Keys.list(companyId, filter),
    queryFn: () => repo.list({ companyId, ...filter }),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
};
```

**File:** `presentation/hooks/use<Name>Mutations.ts`

```typescript
export const useCreate<Name> = (companyId: string) => {
  const repo = use<Name>Repository();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (input) => repo.create({ companyId, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: <fitur>Keys.all(companyId),
      });
    },
  });
};
```

### Components

Local component di `presentation/components/`. Shared di `@/components`.

```typescript
// Good: fitur-specific logic
export const <Name>Card: React.FC<{ data: <Name> }> = ({ data }) => (
  <Card>
    <h3>{data.title}</h3>
    {/* … */}
  </Card>
);
```

### Pages

**File:** `presentation/pages/<Name>Page.tsx` (atau root feature folder)

```typescript
export default function <Name>Page() {
  const companyId = useCompanyId(); // from Zustand context hook
  const { data, isPending } = use<Name>s(companyId);

  if (isPending) return <Skeleton />;
  return (
    <div>
      {data.map(item => <ItemCard key={item.id} item={item} />)}
    </div>
  );
}
```

### Zustand Store (Opsional)

**HANYA** jika ada global UI state (filter, modal open, tab active).

**File:** `presentation/stores/<fitur>.store.ts`

```typescript
import { create } from "zustand";

interface <Name>State {
  selectedId: string | null;
  setSelected: (id: string) => void;
}

export const use<Name>Store = create<<Name>State>((set) => ({
  selectedId: null,
  setSelected: (id) => set({ selectedId: id }),
}));
```

**Bukan** untuk server state (TanStack Query job).

---

## Data Source / API

| Op | Sekarang | Target (Supabase) | RLS |
|----|----------|-------------------|-----|
| List | `store.active<...>()` | `from("<table>").select()` | ✓ company_id via JWT |
| Detail | `store.find()` | `from("<table>").eq("id", …)` | ✓ |
| Create | `store.add()` | `from("<table>").insert()` | ✓ RPC atomik (D25) |
| Update | `store.update()` | `from("<table>").update()` | ✓ approval gate DB (D22) |
| Delete | `store.delete()` | `from("<table>").delete()` (soft via trigger) | ✓ |

**Rule:** Client tidak `WHERE company_id = X` — RLS enforce di DB via JWT. Trust JWT scope.

---

## State Management

| State | Tool | Alasan |
|-------|------|--------|
| Server (risk list, detail) | **TanStack Query** | Cache + invalidate per tenant |
| URL filter (search, sort) | **TanStack Router search params** + Zod | Shareable, bookmarkable |
| UI global (modal, tab, selected) | **Zustand** | Cross-component state |
| Form (input, error) | **react-hook-form** | Uncontrolled, perf |
| Local (hover, focus) | `useState` | Single component only |

---

## Navigasi

| Path | Route ID | Page | Catatan |
|------|----------|------|---------|
| `/<path>` | `/app/<path>` | `<Name>Page` | Code-based TanStack Router |

**Registrasi:** `createRoute()` → `addChildren()` di [main.tsx](../src/main.tsx).

**Search params:** Zod validasi + typed.

```typescript
const searchSchema = z.object({
  status: z.enum(["ACTIVE", "CLOSED"]).optional(),
  page: z.number().default(1),
});

const <Name>Page = Route.lazy(() =>
  import("@/features/<fitur>/<Name>Page").then(m => ({
    component: m.default,
    validateSearch: searchSchema,
  }))
);
```

---

## Responsiveness

- **Layout:** Tailwind v4 + `@theme` token di [src/index.css](../src/index.css). No hardcode hex/px.
- **Mobile → `lg`/`xl`:** Grid stack mobile, row lg+.
- **Table overflow:** `overflow-x-auto` wrapper.
- **a11y:** Label + skor risiko (bukan hanya warna), `aria-label` ikon, kontras WCAG AA.

---

## Testing

`bun run test` (Vitest), `bun run e2e` (Playwright).

### Unit — Use Case

- ✅ Sukses: repo dipanggil benar
- ✅ Gate violated: throw; repo tidak dipanggil

### Unit — Mapper

- ✅ DTO valid → entity
- ✅ DTO corrupt (enum salah) → null / filter

### Unit — Validasi (Form)

- ✅ Input valid → lolos
- ✅ Violation → error Bahasa Indonesia

### Component (RTL)

- ✅ Load → success/empty/error state
- ✅ Mutation submit → cache invalidate

### E2E (Playwright)

- ✅ Critical path: navigate → fetch → display
- ✅ **RLS test: user dari company B tidak akses company A data (pgTAP)**

---

## Migrasi

| Before | After |
|--------|-------|
| `useStore(s => s.active<...>())` | `use<Name>s()` (TanStack Query) |
| `store.<action>(...)` | `use<Verb><Name>().mutate(...)` |

**Preserved:**
- Path: `/<path>` unchanged
- Behavior: logic/edge case identical
- Peran: risk_manager, admin role enforced

**Belum migrasi:**
- [ ] `<Name>RemoteDataSource` saat Supabase live
- [ ] Edge Function RPC saat perlu approval (D22)

---

## Catatan Implementasi

### RLS Multi-Tenant (NFR-01)

Semua query scope `company_id` otomatis via Postgres RLS policy. Client trust JWT; jangan `WHERE company_id = X` hardcode.

Test: Verify user dari perusahaan lain tidak akses (pgTAP + Playwright).

### Database Types (NFR-13)

```bash
supabase gen types typescript --linked > src/database.types.ts
```

Import: `import type { <Name>DTO } from "@/database.types"`.
Presentation: import entity domain saja, bukan DTO.

### i18n & Format (NFR-10)

```typescript
import { t } from "react-i18next";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

// Hardcode → t("key")
// Tanggal: format(date, "PPP", { locale: idLocale })
// IDR: Intl.NumberFormat("id-ID", { currency: "IDR" })
```

### Sentry (NFR-11)

Init di [main.tsx](../src/main.tsx) sebelum render. Error otomatis tracked.

```typescript
Sentry.captureException(error);
Sentry.setTag("feature", "<fitur>");
```

### Offline Support (NFR-14)

TanStack Query cache + staleTime/gcTime. Offline badge di topbar (via `useOnline`).

---

## Refs

- [PRD.md](PRD.md) — feature FR-*
- [frontend-structure.md](../.claude/guidelines/frontend-structure.md) — layer rules
- [architecture.md](../.claude/guidelines/architecture.md) — design rationale
- [database.types.ts](../src/database.types.ts) — generated DTO (NFR-13)
- [design-system.md](../.claude/guidelines/design-system.md) — token, palette
