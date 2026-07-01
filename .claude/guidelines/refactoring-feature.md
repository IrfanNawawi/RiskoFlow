# Feature Workflow — Bangun & Rapi Fitur

**Build fitur baru atau rapi fitur lama ke target stack:** Clean Architecture + TanStack Query + Zustand + Zod + react-hook-form di `src/features/`.

> RiskoFlow = greenfield. No Redux/Saga legacy. "Refactor" = move logic ke layer benar (split UI/data), bukan framework migration.

---

## 🎯 Prinsip

- **Inkremental.** 1 fitur/PR. Jangan refactor massal lintas-fitur.
- **Paritas perilaku.** Rapi fitur lama = **struktur ganti, tampilan/flow tetap** (kecuali diminta user). Perubahan tampilan/flow = fitur baru → pisah PR.
- **Dependency rule** (§1 frontend-structure): `domain` murni (0 React/Supabase); `data` implement repo; `presentation` via DI hook (0 direct import `data`).
- **State sesuai jenis:** Server → Query; global → Zustand; form → RHF + Zod; lokal → `useState`.
- **Entity = type + pure fn** (bukan class). Use-case hanya saat business logic nyata (permission gate / multi-step).
- **DTO boundary:** DTO stay `data/`; mapper + Zod → entity; presentation see entity only.
- **i18n + locale (NFR-10):** String → `t()`, date/currency pakai locale ID.
- **Multi-tenant (NFR-01):** Company scope via RLS, bukan client WHERE. JWT trust DB.
- **RLS policy enforce (NFR-13):** DB types generated; boundary enforced; client 0 secret.

---

## Pemetaan "Kurang Rapi" → Target

| Pola | Target | Alasan |
|---|---|---|
| `useEffect` + fetch manual | TanStack Query `useQuery`/`useMutation` | Auto caching, stale, refetch |
| Server state di useState/Zustand | TanStack Query (true source of truth) | Single source; no sync bugs |
| Direct datasource call dari komponen | Repository + DI hook | Clean dependency; mockable test |
| Form validasi manual/ad-hoc | react-hook-form + `zodResolver` | Declarative; error msg i18n |
| Logika bisnis di JSX | Pure function (`@/lib`) atau use-case | Reusable, testable, decoupled |
| Hex/px hardcode | Tailwind `@theme` token | Design system; NFR-09 contrast |
| `any` type, raw DTO di UI | Domain entity (mapper + Zod) | Type-safe, validated |

---

## Langkah

### 1. **Petakan fitur**
- Catat halaman/komponen, endpoint/tabel, sumber data (sekarang `@/data/store` mock; target Supabase repo).
- Klasifikasi state: **server** (→ Query), **global** (→ Zustand), **form** (→ RHF+Zod), **lokal** (→ useState).
- Confirm scope saat unclear.

### 2. **Siapkan folder**
Ikuti `frontend-structure.md` §2 — **tambah layer dinamis sesuai kebutuhan, jangan folder kosong.**

Minimal simple feature:
```
src/features/<f>/
├── presentation/
│   ├── pages/<F>Page.tsx
│   ├── components/
│   └── hooks/useXxxQuery.ts (if server state)
└── index.ts
```

Full feature (complex logic / server state):
```
src/features/<f>/
├── domain/
│   ├── entities/
│   ├── repositories/I<Name>Repository.ts
│   ├── use-cases/ (only if business logic)
│   └── index.ts
├── data/
│   ├── datasources/<name>.dto.ts + <Name>RemoteDataSource.ts
│   ├── mappers/<name>.mapper.ts
│   ├── repositories/<name>.repository.ts
│   └── index.ts
├── validation/ (Zod schema + i18n error msg)
├── presentation/
│   ├── pages/<F>Page.tsx
│   ├── components/
│   ├── hooks/ (DI factory + useQuery hook + key factory)
│   ├── stores/ (Zustand if global state)
│   └── index.ts
└── index.ts
```

### 3. **Build layer (dinamis)**

**Entity** (domain layer):
```typescript
// types only (bukan class)
export interface Risk {
  id: string;
  title: string;
}

// pure function kanonik (D4) — score = likelihood * impact
export const computeRiskLevel = (likelihood: number, impact: number): RiskLevel => {
  const score = likelihood * impact;
  // PRD D4: LOW 1–4, MEDIUM 5–9, HIGH 10–15, EXTREME 16–25
  if (score >= 16) return "EXTREME";
  if (score >= 10) return "HIGH";
  if (score >= 5) return "MEDIUM";
  return "LOW";
};
```

**Repository interface** (domain):
```typescript
export interface IRiskRepository {
  list(query: Q): Promise<Risk[]>;
  getById(id: string): Promise<Risk>;
  create(input: NewInput): Promise<Risk>;
}
```

**DTO + DataSource** (data layer):
```typescript
// data/datasources/risk.dto.ts
export interface RiskDTO {
  id: string;
  title: string;
  score: number; // snake_case dari Supabase
}

// data/datasources/RiskRemoteDataSource.ts
export class RiskRemoteDataSource {
  async list(query: Q): Promise<RiskDTO[]> {
    const { data } = await supabase
      .from("risks")
      .select("id, title, score")
      .order("created_at", { ascending: false });
    return data ?? [];
  }
}
```

**Mapper** (data layer, DTO → entity + validasi Zod):
```typescript
// data/mappers/risk.mapper.ts
import { z } from "zod";
import type { Risk, RiskDTO } from "@/features/risks/domain";

const riskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  score: z.number().int().min(0).max(25),
});

export const mapRiskDtoToEntity = (dto: RiskDTO): Risk => {
  const validated = riskSchema.parse(dto);
  return { id: validated.id, title: validated.title };
};
```

**Repository impl** (data layer):
```typescript
// data/repositories/risk.repository.ts
export class RiskRepository implements IRiskRepository {
  constructor(private datasource: RiskRemoteDataSource) {}
  
  async list(query: Q): Promise<Risk[]> {
    const dtos = await this.datasource.list(query);
    return dtos.map(mapRiskDtoToEntity);
  }
}
```

**Use-case** (domain layer, **ONLY if business logic**):
```typescript
// domain/use-cases/approve-treatment.ts
export const makeApproveTreatment = (
  repo: ITreatmentRepository,
  roles: MembershipRole[]
) => 
  async (treatmentId: string) => {
    if (!roles.includes("risk_manager")) throw new Error("Permission denied");
    return repo.approve(treatmentId);
  };
```

**Skip use-case if:** passthrough fetch, single form validasi, UI toggle. Hook → repo direct.

**DI hook factory** (presentation layer):
```typescript
// presentation/hooks/useRiskQuery.ts
import { useQuery } from "@tanstack/react-query";
import { useRiskRepository } from "./useRiskRepository";

export const riskQueryKey = {
  all: ["risks"] as const,
  list: (filter?: Q) => [...riskQueryKey.all, "list", filter] as const,
};

export const useRiskList = (filter?: Q) => {
  const repo = useRiskRepository();
  return useQuery({
    queryKey: riskQueryKey.list(filter),
    queryFn: () => repo.list(filter),
    staleTime: 5 * 60_000,
  });
};
```

DI factory:
```typescript
// presentation/hooks/useRiskRepository.ts
export const useRiskRepository = (): IRiskRepository => {
  const datasource = new RiskRemoteDataSource();
  return new RiskRepository(datasource);
};
```

**Form validation** (if needed):
```typescript
// validation/risk.schema.ts
import { z } from "zod";

export const newRiskSchema = z.object({
  title: z.string().min(1, "Judul wajib"),
  score: z.number().min(0).max(25),
});

export type NewRiskInput = z.infer<typeof newRiskSchema>;
```

**Zustand store** (if global state needed):
```typescript
// presentation/stores/filterStore.ts
import { create } from "zustand";

export const useFilterStore = create<FilterState>((set) => ({
  category: null,
  setCategory: (cat) => set({ category: cat }),
}));
```

**Component** (presentation):
```typescript
// presentation/components/RiskCard.tsx
export function RiskCard({ risk }: { risk: Risk }) {
  return (
    <div className="p-4 border rounded">
      <h3 className="font-semibold">{risk.title}</h3>
      <RiskBadge level={risk.inherent.level} score={risk.inherent.severity} />
    </div>
  );
}
```

**Page** (presentation, thin):
```typescript
// presentation/pages/RisksPage.tsx
import { useRiskList } from "../hooks/useRiskQuery";
import { RiskCard } from "../components/RiskCard";

export function RisksPage() {
  const { data, isLoading, error } = useRiskList();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data?.length) return <div>No risks.</div>;
  
  return (
    <div className="grid gap-4">
      {data.map((risk) => <RiskCard key={risk.id} risk={risk} />)}
    </div>
  );
}
```

**Export** (feature index):
```typescript
// index.ts
export { RisksPage as default } from "./presentation/pages/RisksPage";
```

### 4. **Rakit UI**
- Komponen `@/components/ui` + Tailwind `@theme` token.
- **State:** loading, empty, error (FR-DASH-6).
- **Responsive:** mobile → `lg`, no overflow.
- **A11y:** label + skor warna, contrast AA (axe DevTools check).

### 5. **Pasang route**
`main.tsx` — TanStack Router code-based. Path lama tetap; layout AppShell = pathless route `id: "app"`.

```typescript
{
  path: "/app/risks",
  lazy: async () => {
    const { default: RisksPage } = await import("@/features/risks");
    return { component: RisksPage };
  },
}
```

### 6. **Tulis scenario testing**
`*.test.ts(x)`. Unit + integration (Vitest + RTL); mock repo via DI.  
E2E (Playwright) = critical path.  
See [testing.md](testing.md) detail.

### 7. **Verifikasi & lapor**
```bash
bun run typecheck    # 0 errors
bun run build        # ✅
bun run lint         # ✅
bun run test         # vitest run — semua hijau
bun run dev          # cek manual di browser
```

Report:
- File dibuat/ubah/hapus.
- Langkah sisa user kerjakan (e.g., "pasang route", "update PROGRESS.md").

---

## ✅ Definition of Done

- [ ] **State mapping:** Query/Zustand/RHF+Zod/useState sesuai jenis.
- [ ] **Dependency rule:** No `presentation` → `data` direct; DI hook; DTO boundary.
- [ ] **Entity:** `type` + pure function; 0 class.
- [ ] **Use-case:** Business logic only (permission, multi-step); else hook → repo.
- [ ] **DTO boundary:** DTO ⊂ `data/`; mapper + Zod → entity.
- [ ] **DB types:** Generated via `supabase gen types`; boundary enforced (NFR-13).
- [ ] **UI:** Tailwind token; loading/empty/error; responsive; A11y AA; `aria-label` icon-only.
- [ ] **i18n (NFR-10):** Hardcoded → `t()`; date/currency locale ID.
- [ ] **Multi-tenant (NFR-01):** Company scope RLS; JWT trust; 0 client WHERE.
- [ ] **Sentry (NFR-11):** Error tracking init main.tsx.
- [ ] **Offline (NFR-14):** TanStack Query stale/gc strategy; offline badge.
- [ ] **Pagination (NFR-06):** Keyset, not offset; select field-specific.
- [ ] **Parityifikasi:** Rapi lama fitur = tampilan tetap (kecuali user minta).
- [ ] **Test scenario:** Vitest unit/integration; Playwright E2E; RLS auth test.
- [ ] **CI gates:** typecheck, lint, test, migration dry-run **MUST PASS**.
- [ ] **Docs:** Feature brief di `docs/features/<f>.md`; [PROGRESS.md](../../docs/PROGRESS.md) updated.

---

## 🔗 Related

- [frontend-structure.md](frontend-structure.md) — Full stack detail
- [architecture.md](architecture.md) — Clean arch rationale
- [testing.md](testing.md) — Test scenarios per layer
- [conventions.md](conventions.md) — Naming, imports, PR
- [design-system.md](design-system.md) — Token + palette

---

## Slash Command

`/refactoring-feature <nama>`  
→ Auto-scaffold folder, layer skeleton, boilerplate (entity, repo interface, mapper template, hook, component stub).