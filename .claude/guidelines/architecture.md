# Architecture Overview — RiskoFlow

**RiskoFlow** = React 19 SPA (TypeScript strict, Vite) untuk manajemen risiko ISO 31000:2018.
**PRD v1.6.1 — Approved (MVP).** Pakai Feature-Sliced Clean Architecture.

## Stack (PRD 1.6.1 — Current)

| Layer | Tool | Status |
|---|---|---|
| UI/React | React 19, TypeScript `strict`, Vite | ✓ Terpasang |
| Routing | **TanStack Router** (code-based + typed search params) | ✓ **CURRENT** (bukan target) |
| Server state | **TanStack Query** (`@tanstack/react-query` 5.62.0+) | ✓ Terpasang |
| Client state | **Zustand** (store granular, selector) | ✓ Terpasang |
| Form + validasi | **react-hook-form 7.80 + Zod 4.4** | ✓ Terpasang |
| Styling | **Tailwind v4** + **Radix (shadcn/ui)** | ✓ Terpasang |
| Data/Backend | **Supabase** (Postgres + RLS + Auth + Edge Functions + Cron + Queues + Vault) | ⚠️ **Live soon** |
| Database types | `supabase gen types` → `src/database.types.ts` | ✓ **WAJIB** (NFR-13) |
| i18n | **react-i18next** (ID/EN, date-fns locale, IDR formatter) | ✓ **WAJIB** (NFR-10) |
| Error tracking | **Sentry** (init main.tsx sebelum render) | ✓ **WAJIB** (NFR-11) |
| Testing | **Vitest + RTL** (unit/integration) + **Playwright 1.61** (E2E) | ✓ Terpasang |

> **Catatan:** react-router-dom → ditinggal. TanStack Router = routing default PRD.

## Dependency Rule (WAJIB)

```
presentation → domain ← data
```

- **`domain`** — `type` + interface + pure function. ZERO React/Supabase/UI lib.
- **`data`** — implements `I*Repository`. DTO → entity Zod mapper. RLS enforce DB sisi.
- **`presentation`** — import `domain`, `@/components`, `@/lib`. **JANGAN** import `data` langsung. DI via hook factory.

**RLS (NFR-01):** Semua Supabase query scope `company_id` otomatis via Postgres policy. Client **trust JWT scope** — jangan `WHERE company_id = X` hardcode.

## Layer Responsibilities

| Layer | Tanggung Jawab | Boleh Import |
|---|---|---|
| `domain` | Tipe + pure function, interface repo, use-case (dinamis saja) | — |
| `data` | Supabase client, DTO, mapper Zod → entity, repository impl | `domain` |
| `presentation` | UI, useQuery/useMutation, Zustand store, routing | `domain`, `@/components`, `@/lib` |

### Entity = `type` + pure function (BUKAN class)

**Kenapa:** Class instance = referensi baru → merusak TanStack Query structural sharing → list re-render tanpa perlu. Plain object = stable reference.

```typescript
// domain/entities/risk.ts
export interface Risk {
  id: string;
  title: string;
  likelihood: number; // 1..5
  impact: number;     // 1..5
  severity: number;   // generated column DB; mirrored client
  level: RiskLevel;
}

// Pure function (bukan getter) — kanonik D4, harus identik dengan @/lib/risk.ts
export const computeRiskLevel = (likelihood: number, impact: number): RiskLevel => {
  const score = likelihood * impact;
  // PRD D4: LOW 1–4, MEDIUM 5–9, HIGH 10–15, EXTREME 16–25
  if (score >= 16) return "EXTREME";
  if (score >= 10) return "HIGH";
  if (score >= 5) return "MEDIUM";
  return "LOW";
};
```

**Kanonik:** Severity → level logic **satu sumber** di Postgres (generated column + IMMUTABLE function). Client mirror di `@/lib/risk.ts`.

### Use-Case — Dinamis (Hanya Saat Ada Business Logic)

**Buat saat:**
- ✓ Permission gate (hanya `risk_manager` approve ACCEPT)
- ✓ Multi-step transaction (update risiko + auto-trigger review)
- ✓ Cross-aggregate (insiden → update severity)

**Skip saat:**
- ✗ Passthrough fetch → display → hook query langsung repo
- ✗ Form validasi single → Zod cukup
- ✗ UI state toggle → Zustand cukup

```typescript
// domain/use-cases/approveTreatment.ts
export const approveTreatment = 
  (repo: ITreatmentRepository, userRoles: MembershipRole[]) =>
  async (treatmentId: string) => {
    if (!userRoles.includes("risk_manager") && !userRoles.includes("admin"))
      throw new Error("Hanya risk manager");
    return repo.approveTreatment(treatmentId);
  };
```

### Repository + DI

`domain` → `I<Name>Repository`; `data` implement. Wiring via **DI hook factory** (`use<Name>Repository` / `use<Name>UseCases`), useMemo — satu titik tahu cara build.

```typescript
// presentation/hooks/useRiskRepository.ts
export const useRiskRepository = (): IRiskRepository => {
  return useMemo(() => new RiskRepository(supabase), []);
};

// presentation/hooks/useListRisks.ts
export const useListRisks = (companyId: string) => {
  const repo = useRiskRepository();
  return useQuery({
    queryKey: ["risks", companyId],
    queryFn: () => repo.list({ companyId, limit: 20 }),
    staleTime: 5 * 60_000,
  });
};
```

## State Management

| State | Tool | Contoh |
|---|---|---|
| Server data + cache | **TanStack Query** | daftar risiko, insiden |
| Global UI state | **Zustand** (granular store + selector) | perusahaan aktif, filter applied |
| Form + validasi | **react-hook-form + Zod** | risk register form, onboarding |
| Lokal component | `useState`/`useReducer` | toggle modal, input sementara |

**Zustand pattern:** Granular store, selector `useShallow`:
```typescript
export const useStore = create<AppState>((set) => ({
  activeCompanyId: null,
  setActiveCompanyId: (id: string) => set({ activeCompanyId: id }),
}));

// Component
const companyId = useStore(useShallow((s) => s.activeCompanyId));
```

## Design System

**Token Tailwind v4** (CSS variable `@theme` di `src/index.css`):
```css
@theme {
  --color-primary: #006699;
  --color-on-surface: #1a1a1a;
  --color-risk-extreme: #cc0000;
  --color-risk-high: #ff6600;
  --color-risk-medium: #ffcc00;
}
```

**UI komponen:** Radix primitives (shadcn/ui) + bespoke di `@/components/ui.tsx` (`Card`, `Button`, `Icon`, `SectionTitle`, `RiskBadge`, `Heatmap`).

**JANGAN hardcode hex.** Pakai utility: `bg-primary`, `text-on-surface`, `text-risk-extreme`.

**Akses:** Shadcn → generate via `bunx shadcn@latest add <comp>` saat butuh, petakan token ke `@theme`.

## Folder Structure (Target)

**Saat ini** (mock data, in-memory Zustand):
```
src/
├── components/           # Shared UI: ui.tsx, Sidebar, RiskBadge, Heatmap
├── data/                 # store.ts (mock), types.ts (entity domain)
├── features/<f>/         # Page per fitur + hook query
├── lib/                  # Pure helper: risk.ts, format.ts, supabase.ts (live)
├── i18n/                 # Locales: id.json, en.json
├── database.types.ts     # Generated via `supabase gen types` (NFR-13)
└── main.tsx              # TanStack Router + provider init
```

**Target per fitur** (Supabase live):
```
src/features/<feature>/
├── domain/
│   ├── entities/         # Type + pure function
│   ├── repositories/     # I<Name>Repository interface
│   ├── use-cases/        # DINAMIS — saat ada business logic
│   └── index.ts
├── data/
│   ├── datasources/      # <name>.dto.ts + RemoteDataSource
│   ├── mappers/          # <name>.mapper.ts (DTO → entity Zod)
│   ├── repositories/     # <name>.repository.ts (impl interface)
│   └── index.ts
├── validation/           # Zod schema form RHF (error msg ID)
├── presentation/
│   ├── pages/            # <Name>Page.tsx (thin)
│   ├── components/       # Feature-local component
│   ├── hooks/            # DI factory + useQuery hook + key factory
│   ├── stores/           # Zustand (opsional)
│   └── index.ts
└── index.ts              # Export page
```

**Referensi:**
- Kompleks (full layer): `features/risks`, `features/incidents`, `features/compliance`
- Sederhana: page + hook query + type di `@/data/types` sudah cukup

**Jangan folder kosong.** Tambah layer saat ada kebutuhan nyata.

## Database Layer — Supabase (NFR-01, NFR-13)

### Types Generation (WAJIB)

```bash
supabase gen types typescript --linked > src/database.types.ts
```

**Script di `package.json`:**
```json
{ "gen:types": "supabase gen types typescript --linked > src/database.types.ts" }
```

`database.types.*` = DTO (snake_case). `@/data/types` = entity (camelCase).  
Presentation **import entity only**.

### RLS Policy & Company Scoping (WAJIB, NFR-01)

Semua PostgREST query scope `company_id` otomatis via Postgres policy. Client **tidak** hardcode `WHERE company_id = X`.

```typescript
// RLS enforce otomatis via JWT + policy
const { data } = await supabase
  .from("risks")
  .select("id, title, category");  // Policy scope company_id
```

**Testing:** Vitest + RTL unit; **Playwright wajib test RLS deny** (user perusahaan lain block).

### Atomic RPC + Multi-Role (D25, D27)

Onboarding: provisioning perusahaan + admin pertama **atomik** via `create_company_with_admin` RPC.
Admin = dua peran: `admin` + `risk_manager` (D27).

```sql
CREATE OR REPLACE FUNCTION create_company_with_admin(
  p_company_name text,
  p_industry_type text,
  p_user_id uuid
) RETURNS uuid AS $$
BEGIN
  INSERT INTO companies (name, industry_type) VALUES (...) RETURNING id;
  INSERT INTO memberships (company_id, user_id, role) VALUES (..., ..., 'admin');
  INSERT INTO memberships (company_id, user_id, role) VALUES (..., ..., 'risk_manager');
  RETURN company_id;
END;
$$ LANGUAGE plpgsql;
```

## Routing (TanStack Router)

**Current:** TanStack Router di main.tsx (code-based, typed search params).
**FR-RISK-2:** Filter via typed search params + Zod.

```typescript
// Typed search
type RiskSearch = {
  status?: RiskStatus[];
  category?: RiskCategory[];
  sortBy?: "severity" | "dueDate";
};

const riskSearchSchema = z.object({
  status: z.array(z.enum(["ACTIVE", "MITIGATED"])).optional(),
  category: z.array(z.string()).optional(),
  sortBy: z.enum(["severity", "dueDate"]).optional(),
});
```

**Path existing tetap** agar internal link tidak putus.

## Offline Support (NFR-14)

```typescript
export const useOnline = () => {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return online;
};

// UI: offline badge di topbar, query cached, label "Data lokal" jika stale
// Mutasi (create/update) hold client; belum POST
```

## Internationalization (NFR-10 — WAJIB)

**i18n:** react-i18next, hardcoded string → `t("key")`.

**Tanggal:** date-fns + locale ID:
```typescript
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const formatted = format(new Date("2026-07-01"), "PPP", { locale: idLocale });
// "1 Juli 2026"
```

**Mata uang:** IDR (integer, no decimal):
```typescript
const formatIDR = (amount: number) => 
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
```

## Error Monitoring (NFR-11 — WAJIB)

**Init main.tsx sebelum render React:**
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});

export default Sentry.withProfiler(<Router />);
```

**Target:** Error-free sessions ≥ 99%.

## Path Alias

**Satu alias:** `@/* → src/*` (sinkron di vite.config.ts, tsconfig.app.json).

```typescript
// ✅
import { Card } from "@/components/ui";
import type { Risk } from "@/data/types";
import { computeRiskLevel } from "@/lib/risk";

// ❌
import { Card } from "../../../components/ui";
```

## Performance (NFR-02)

**React Compiler (D16):** React 19 auto-memoization aktif.

**Query optimization:**
- Keyset/cursor pagination (bukan offset) — NFR-06
- `select` hanya field dipakai
- `staleTime` + `gcTime` cache strategy
- Heatmap: limit 500 risiko, memoize transform

**Target:** Dashboard < 1.5s, list < 300ms, heatmap < 500ms.

## Accessibility (WCAG 2.1 AA — NFR-09)

- Token Tailwind ≥ 4.5:1 contrast (normal) / ≥ 3:1 (large)
- Risk level = label + skor (bukan hanya warna)
- Radix primitives: focus ring, ARIA, keyboard nav otomatis
- Icon-only button: `aria-label="..."`

## Testing (NFR-12 — WAJIB)

**Unit + Integration (Vitest + RTL):**
```bash
bun run test
bun run test:watch
```

**E2E (Playwright):**
```bash
bun run e2e
```

Critical path: auth → onboarding → risk register → review/treat.
**RLS auth test wajib:** verify user perusahaan lain tidak akses.

**CI:** lint + typecheck + test + migration dry-run **WAJIB hijau**.

## Checklist — Build Feature

- [ ] Folder per §2 (layer saat butuh, no empty)
- [ ] Dependency rule §1 ✓
- [ ] Entity = `type` + pure function
- [ ] DTO tidak bocor presentation; mapper + Zod
- [ ] Use-case hanya saat ada business logic
- [ ] Query = TanStack, global = Zustand, form = RHF+Zod
- [ ] RLS enforce company_id; client trust JWT (NFR-01)
- [ ] DB types via `supabase gen types`; boundary enforced (NFR-13)
- [ ] i18n hardcoded → `t()`; tanggal+mata uang locale ID (NFR-10)
- [ ] Sentry init main.tsx; error tracking live (NFR-11)
- [ ] Offline: cache staleTime/gcTime; badge jaringan putus (NFR-14)
- [ ] Keyset pagination; SELECT field-specific; indeks (NFR-06, NFR-02)
- [ ] Token Tailwind; risk level = label+skor+warna; kontras AA (NFR-09)
- [ ] Mobile responsive → `lg` breakpoint
- [ ] Vitest+RTL unit/integration; Playwright E2E
- [ ] CI gates ✓
- [ ] Docs feature di `docs/features/`; PROGRESS.md updated