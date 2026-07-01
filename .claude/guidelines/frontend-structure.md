# Frontend Structure — Panduan

Struktur kode **target** RiskoFlow (Feature-Sliced Clean Architecture). Layering bersifat
**dinamis** — sebuah fitur menumbuhkan layer (`domain`/`data`/`presentation`) dan sub-folder
(`use-cases`, `validation`, `stores`) **hanya saat ada kebutuhan nyata**, bukan di awal.

> Stack: **React 19 + TS · TanStack Query + Router + Zustand · react-hook-form + Zod**,
> **Tailwind v4 + shadcn/ui**, data via **Supabase** (Auth + PostgREST + RPC + Edge Functions).
> Cek [package.json](../../package.json) untuk yang sudah terpasang.

---

## 0. Library Stack

[package.json](../../package.json) adalah **sumber kebenaran**. Tabel memisahkan **terpasang sekarang**
vs **target PRD** (lihat [PRD §5](../../docs/PRD.md) & [PRD §6](../../docs/PRD.md)).
**Jangan import lib target sebelum di-install** — ingatkan user, pin versi exact.

### Terpasang sekarang (package manager: **bun**, `bun.lockb`)

| Library | Versi | Peran di RiskoFlow | NFR/FR |
|---|---|---|---|
| `react` / `react-dom` | `^19.0.0` | UI (React Compiler auto-memo) | D16 |
| `@tanstack/react-router` | `1.170.x` | Code-based routing; typed search params | FR-RISK-2 |
| `@tanstack/react-query` | `^5.62.0` | Server state (Supabase target) | — |
| `@tanstack/react-table` | `8.21.x` | Headless DataTable — risk register | — |
| `react-hook-form` + `zod` + `@hookform/resolvers` | `7.80`/`4.4`/`5.4` | Form + validasi; schema `features/*/validation/` | — |
| `zustand` | `^5.0.2` | UI/global state (selector granular) | D5 |
| `recharts` | `^2.15.0` | Heatmap 5×5 + chart (NFR-02 performa) | — |
| `tailwindcss` + `@tailwindcss/vite` | `^4.0.0` | Styling, `@theme` token di `index.css` | NFR-09 |
| `clsx` + `tailwind-merge` | `2.1`/`3.6` | `cn()` utility — shadcn foundation | — |
| `date-fns` | `4.4.x` | Tanggal formatting per locale ID | NFR-10 |
| `react-i18next` + `i18next` | `17.0`/`26.3` | i18n ID/EN (hardcoded string → `t(key)`) | NFR-10 |
| `@sentry/react` | `10.61.x` | Error monitoring; init main.tsx | NFR-11 |
| `@supabase/supabase-js` | `2.108.x` | Client Supabase — PostgREST + RPC (dual-mode remote); **Auth masih ditunda, RLS permissive** | NFR-01 |
| `xlsx` + `jspdf` | — | Ekspor `.xlsx`/`.pdf` (di-import dinamis) | — |
| `typescript` · `vite` · `vitest` · `@testing-library/*` · `eslint` · `prettier` | — | Toolchain (script + config ready) | NFR-12 |
| `@playwright/test` | `1.61.x` | E2E browser (critical path + RLS test) | NFR-12 |

Perintah: `bun run dev | build | typecheck | lint | format | test | test:watch | preview`
(script `e2e` Playwright **belum** didaftarkan di `package.json`).

### Fondasi shadcn/ui (terpasang)

[components.json](../../components.json) siap (style `new-york`, `cssVariables`, `cn` → `@/lib/format`).
**Belum** ada komponen di-generate: tambah `bunx shadcn@latest add <comp>` **saat dibutuhkan**,
lalu **petakan token shadcn ke design token `@theme`** ([design-system.md](design-system.md)) — jangan default.
Primitif bespoke di [ui.tsx](../../src/components/ui.tsx).

### Target PRD yang **belum** terpasang

Semua **library npm** inti target sudah terpasang (termasuk `@supabase/supabase-js`). Yang tersisa
bukan lib npm melainkan **infrastruktur backend**: **Auth** Supabase (kini pakai `currentUserId` mock,
RLS permissive), **Edge Functions**, **Cron**, dan **Vault** — di-provision saat backend go-live.

> **Sengaja TIDAK dipakai:** `axios` (supabase-js/fetch cukup), `@supabase/auth-helpers-react`
> (deprecated; SPA pakai supabase-js direct), `valibot` (Zod kanonik), `visx`/`d3-scale` (recharts cukup),
> `immer` (Zustand v5 `set` native), `dotenv` (Vite `import.meta.env` native), `sonner` (primitif di `@/components`).

---

## 1. Dependency Rule (wajib)

```
presentation  →  domain  ←  data
```

- **`domain`** murni: `type` + interface + pure function. **Zero** React/Supabase/UI lib.
- **`data`** implements `I*Repository`; Zod validasi DTO → entity. **RLS enforcement di DB** (NFR-01); client trust JWT scope.
- **`presentation`** import `domain`, `@/components`, `@/lib`. **Dilarang** import `data` langsung — wiring via DI hook (§6).

**RLS note (NFR-01):** Semua Supabase query otomatis scope `company_id` via Postgres policy + JWT.
Client **tidak** hardcode `WHERE company_id = X` — trust RLS di layer DB.

---

## 2. Struktur Folder

**Saat ini** (sederhana, mock data):

```
src/
├── components/        # Shared UI: ui.tsx, Sidebar, Topbar, RiskBadge, Heatmap
├── data/              # store.ts (Zustand mock), types.ts (entity domain)
├── features/<f>/      # Page per fitur: <Name>Page.tsx
├── lib/               # Pure helper: risk.ts, format.ts
├── database.types.ts  # Generated dari `supabase gen types` (NFR-13)
├── i18n/              # Locales: id.json, en.json (NFR-10)
└── main.tsx           # Router + provider + Sentry init
```

**Target per fitur** (saat Supabase live / fitur kompleks):

```
src/features/<feature>/
├── domain/
│   ├── entities/            # Type + pure function (bukan class)
│   ├── repositories/        # Interface: I<Name>Repository.ts
│   ├── use-cases/           # DINAMIS — hanya saat ada business logic (§13)
│   └── index.ts
├── data/
│   ├── datasources/         # <name>.dto.ts + <Name>RemoteDataSource.ts (Supabase query)
│   ├── mappers/             # <name>.mapper.ts (DTO → entity + validasi Zod)
│   ├── repositories/        # <name>.repository.ts (implements I<Name>Repository)
│   └── index.ts
├── validation/              # Zod schema form RHF; error msg Bahasa Indonesia
├── presentation/
│   ├── pages/               # <Name>Page.tsx (thin; hook → component)
│   ├── components/          # Local feature component
│   ├── hooks/               # DI factory + useQuery/useMutation + key factory
│   ├── stores/              # Zustand store (opsional; global state feature)
│   └── index.ts
└── index.ts                 # Entry publik: export page
```

Tambah layer saat dibutuhkan; jangan folder kosong. Fitur sederhana: page + hook query + type di `@/data/types` sudah cukup.

> **Referensi:** **risks**, **incidents**, **compliance** pakai full structure.
> Lainnya (dashboard, reports) akses `@/data/store` langsung — migrasikan saat disentuh. Status: [PROGRESS.md](../../docs/PROGRESS.md).

---

## 3. Domain Layer

**Entity** — `type` + pure function (bukan class). Core types di [types.ts](../../src/data/types.ts);
pure function di [risk.ts](../../src/lib/risk.ts).

```typescript
export interface Risk {
  id: string;
  title: string;
  category: RiskCategory;
  inherent: Assessment;
  residual?: Assessment;
}

export const activeAssessment = (r: Risk): Assessment => r.residual ?? r.inherent;
// Delegasi ke sumber kanonik @/lib/risk (D4): LOW 1–4, MEDIUM 5–9, HIGH 10–15, EXTREME 16–25
export const riskLevel = (r: Risk): RiskLevel => {
  const a = activeAssessment(r);
  return computeRiskLevel(a.likelihood, a.impact);
};
```

**Repository interface** — kontrak `data` implementasikan (Supabase target).

```typescript
export interface IRiskRepository {
  list(query: RiskListQuery): Promise<Risk[]>;
  getById(id: string): Promise<Risk>;
  create(input: NewRiskInput): Promise<Risk>;
  approveTreatment(riskId: string, treatmentId: string): Promise<void>;
}
```

**Use-Case (dinamis)** — buat hanya saat ada permission gate / multi-step business logic.

```typescript
export const approveTreatment = (repo: ITreatmentRepository, roles: MembershipRole[]) =>
  async (treatmentId: string) => {
    if (!roles.includes("risk_manager") && !roles.includes("admin"))
      throw new Error("Hanya risk manager");
    return repo.approveTreatment(treatmentId);
  };
```

**Skip use-case:** passthrough fetch, form validasi, UI state toggle. Hook query langsung repository cukup (lihat §13).

---

## 4. Data Layer (Target Supabase)

**Boundary enforcement (NFR-13):**
- DTO tetap di `data/`; **TIDAK** ke `presentation`
- Mapper + Zod transform DTO → entity domain
- Repository return entity domain only

### 4.0 Database Types Generation (NFR-13)

Postgres schema → TypeScript via `supabase gen types`:

```bash
supabase gen types typescript --linked > src/database.types.ts
```

**Script di package.json:**
```json
{ "gen:types": "supabase gen types typescript --linked > src/database.types.ts" }
```

**Enforcer:** `database.types.*` = DTO (snake_case); `@/data/types` = entity (camelCase).
Presentation import **entity only**.

### 4.1 Environment & Secrets (NFR-04)

**Public client secrets** (aman di browser):
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Private secrets** (LLM, email):
- Stored **Supabase Vault** (NFR-04)
- Akses dari **Edge Function** (`ai-risk-assistant`, `email-worker`)
- Client **NEVER** lihat

**Supabase client init (src/lib/supabase.ts):**
```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### 4.2 RLS Policy & Company Scoping (NFR-01)

Semua PostgREST query scope `company_id` otomatis via Postgres RLS policy.

```typescript
// RLS enforce; client NEVER butuh WHERE company_id = X explicit
const { data } = await supabase
  .from("risks")
  .select("id, title, category")
  .eq("company_id", userCompanyId); // context-aware; RLS enforce
```

**Testing:** Cover RLS deny case (Vitest + unit; pgTAP di backend).

### 4.3 DTO vs Entity Naming Convention

**DTO** (dari Supabase, snake_case):
```typescript
export interface RiskDTO {
  id: string;
  title: string;
  created_at: string;
  company_id: string;
}
```

**Entity** (domain, camelCase):
```typescript
export interface Risk {
  id: string;
  title: string;
  createdAt: Date;
  companyId: string;
}
```

**Mapper** (DTO → Entity + Validasi) — konvensi nama nyata: `<entity>ToDomain`
(mis. `riskToDomain`, `riskListToDomain`). Kembalikan `null` saat invalid (pakai `safeParse`, bukan
`parse`) agar baris rusak **difilter**, bukan menjatuhkan seluruh list:
```typescript
import { z } from "zod";

const riskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3),
  created_at: z.string().datetime(),
  company_id: z.string().uuid(),
});

export function riskToDomain(dto: RiskDTO): Risk | null {
  const parsed = riskSchema.safeParse(dto);
  if (!parsed.success) return null;
  const v = parsed.data;
  return {
    id: v.id,
    title: v.title,
    createdAt: new Date(v.created_at),
    companyId: v.company_id,
  };
}
```

**Kontrol:** Presentation **hanya** import entity, **tidak** DTO.

---

## 5. Validation Layer (Zod)

**Form input schema di `features/<f>/validation/<name>.schema.ts`.** Pesan error Bahasa Indonesia.
Dipakai react-hook-form via `zodResolver`.

```typescript
import { z } from "zod";

export const newRiskSchema = z.object({
  title: z.string()
    .min(3, "Judul minimal 3 karakter")
    .max(150, "Maksimal 150 karakter"),
  category: z.enum(["FINANCIAL", "OPERATIONAL", "LEGAL", "REPUTATIONAL", "STRATEGIC"]),
  departmentId: z.string().uuid("Departemen wajib dipilih"),
});

export type NewRiskInput = z.infer<typeof newRiskSchema>;
```

### 5.2 Typed Search Parameters (FR-RISK-2)

Filter persisten di URL pakai TanStack Router `validateSearch` + Zod.

```typescript
export const riskSearchSchema = z.object({
  category: z.enum(["FINANCIAL", "OPERATIONAL", "LEGAL", "REPUTATIONAL", "STRATEGIC"]).optional(),
  level: z.enum(["LOW", "MEDIUM", "HIGH", "EXTREME"]).optional(),
  departmentId: z.string().uuid().optional(),
  page: z.coerce.number().default(1),
});

export type RiskSearch = z.infer<typeof riskSearchSchema>;

// Di RiskRegisterPage
const route = getRouteApi("/app/risks");
const search = route.useSearch({ select: (s) => riskSearchSchema.parse(s) });
```

URL: `?category=FINANCIAL&level=HIGH` → bookmark-safe, shareable.

---

## 6. Presentation Layer

### 6.1 Multi-Company Context in Hooks (NFR-01)

**Every server query wajib contextual ke active company:**

```typescript
const company = useActiveCompany();
const repo = useRiskRepository();

useQuery({
  queryKey: riskKeys.list(company.id, filter), // company_id di key
  queryFn: () => repo.list(filter), // RLS filter otomatis DB-side
});
```

**Zustand store untuk active company:**
```typescript
interface CompanyState {
  activeCompanyId: string | null;
  switchCompany: (id: string) => void;
}
export const useCompanyStore = create<CompanyState>((set) => ({
  activeCompanyId: null,
  switchCompany: (id) => set({ activeCompanyId: id }),
}));
```

**Multi-role (D27):** User bisa >1 peran per company. Check `useUserRoles(companyId)` di hooks.

### 6.2 DI Hook Factory

Satu titik wiring `data → domain`:

```typescript
export const useRiskRepository = () =>
  useMemo(() => {
    const datasource = new RiskRemoteDataSource(supabase);
    const mapper = new RiskMapper();
    return new RiskRepository(datasource, mapper);
  }, []);
```

### 6.3 Server State (TanStack Query)

Query key factory + useQuery/useMutation.

```typescript
export const riskKeys = {
  all: ["risks"] as const,
  lists: () => [...riskKeys.all, "list"] as const,
  list: (companyId: string, filter: RiskListQuery) => 
    [...riskKeys.lists(), { companyId, ...filter }] as const,
};

export const useRisks = (filter: RiskListQuery) => {
  const repo = useRiskRepository();
  const company = useCompanyStore((s) => s.activeCompanyId);
  
  return useQuery({
    queryKey: riskKeys.list(company!, filter),
    queryFn: () => repo.list({ ...filter, companyId: company! }),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000, // Keep cache 10 min (NFR-14 offline)
  });
};
```

### 6.4 UI State Global (Zustand)

Selector granular; tanpa `immer` di v5 — `set` native.

```typescript
interface RiskFilterState {
  category: RiskCategory[];
  level: RiskLevel[];
  setCategory: (v: RiskCategory[]) => void;
  reset: () => void;
}

export const useRiskFilterStore = create<RiskFilterState>((set) => ({
  category: [],
  level: [],
  setCategory: (category) => set({ category }),
  reset: () => set({ category: [], level: [] }),
}));

// Component: selektor granular
const category = useRiskFilterStore((s) => s.category);
```

### 6.5 Localization & Formatting (NFR-10)

**I18n init (src/i18n/config.ts):**
```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  lng: "id",
  fallbackLng: "en",
  resources: {
    id: { translation: require("./locales/id.json") },
    en: { translation: require("./locales/en.json") },
  },
});
```

**Hardcoded string → i18n:**
```typescript
// ✅
const { t } = useTranslation();
return <span>{t("risk.level.high")}</span>;

// ❌
return <span>Risiko Tinggi</span>;
```

**Angka & tanggal per locale:**
```typescript
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const formatted = format(new Date("2026-07-01"), "PPP", { locale: idLocale });
// "1 Juli 2026"

// Mata uang IDR (integer rupiah, tanpa desimal — NFR-10)
const formatIDR = (amount: number) => 
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
```

### 6.6 Error Monitoring (NFR-11, Sentry)

**Init di main.tsx sebelum render React:**
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({ useEffect }),
  ],
});

export default Sentry.withProfiler(<Router />);
```

**Usage:**
```typescript
Sentry.captureException(error);
Sentry.setUser({ id: user.id, email: user.email });
Sentry.setTag("company_id", companyId);
```

**Goal:** Error-free sessions ≥ 99% (NFR-11).

---

## 7. Design System & Routing

- **Token & komponen** → `@/components` + `@theme` di [src/index.css](../../src/index.css).
  **Selalu** pakai utility token (`bg-primary`, `text-on-surface`), jangan hardcode hex. Detail di [design-system.md](design-system.md).

- **Routing** TanStack Router (code-based). Register route di [main.tsx](../../src/main.tsx);
  path yang ada tetap. Layout `AppShell` = route pathless `id: "app"` → route id prefiks `/app`.
  Filter typed search params + Zod (FR-RISK-2).

---

## 8. Path Alias

Satu alias: **`@/* → src/*`** (sinkron di [vite.config.ts](../../vite.config.ts) & [tsconfig.app.json](../../tsconfig.app.json)).

```typescript
// ✅
import { Card } from "@/components/ui";
import type { Risk } from "@/data/types";
import { supabase } from "@/lib/supabase";

// ❌
import { Card } from "../../../components/ui";
```

---

## 9. Performance (NFR-02)

**React Compiler (D16):** Auto-memoization aktif (React 19).

**Query optimization:**
- Keyset/cursor pagination (bukan offset) — NFR-06
- `select` hanya kolom dipakai (jangan `SELECT *`)
- `staleTime` + `gcTime` cache strategy

```typescript
useQuery({
  queryKey: ["risks", companyId, { limit: 20, offset }],
  queryFn: () => repo.list({
    select: ["id", "title", "category", "status"],
    limit: 20,
    offset,
  }),
  staleTime: 5 * 60_000,
  gcTime: 10 * 60_000,
});
```

**Heatmap:** Limit 500 risiko per viewport; memoize data transform.

**Target:** Dashboard < 1.5s, list < 300ms, heatmap < 500ms (NFR-02).

---

## 10. Accessibility (NFR-09)

**WCAG 2.1 Level AA:**
- Token Tailwind `text-*` + `bg-*` ≥ 4.5:1 contrast (normal) / ≥ 3:1 (large)
- Test: axe DevTools browser extension

**Risk level: label + skor, tidak hanya warna:**
```typescript
// ✅
<RiskBadge level="HIGH" score={15} label="HIGH (15/25)" />

// ❌
<div className="bg-red-500" />
```

**Radix primitives (shadcn/ui):** Focus ring, ARIA, keyboard nav otomatis (D17).
Label ikon-only: `<button aria-label="Unduh laporan">{IconDownload}</button>`.

---

## 11. Testing (NFR-12)

**Unit + Integration (Vitest + RTL):**
```bash
bun run test
bun run test:watch
```

Convention: `*.test.ts(x)`. Features pakai `describe` granular; mock repository via DI.

**E2E (Playwright):**
```bash
bun run e2e
```

Critical path: auth → onboarding → risk register → review/treat.
**RLS auth test wajib (D23):** verify user dari perusahaan lain tidak akses.

**CI requirement:** lint + typecheck + test + migration dry-run **WAJIB hijau**.

---

## 12. Offline Support (NFR-14)

**Setup:**
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
```

**UI state:**
- Offline badge di topbar (kecil, icon + "Mode Offline")
- Query results cached; label "Data lokal" jika stale
- Mutasi (create/update) hold di client; belum POST

**Success:** User tidak hilang data saat jaringan mati.

---

## 13. When to Create a Use-Case

**Create** saat:
- ✓ Permission gate (hanya `risk_manager` bisa approve ACCEPT)
- ✓ Multi-step transaction (update risiko + auto-trigger review)
- ✓ Cross-aggregate logic (insiden → update severity risiko)

**Skip** saat:
- ✗ Passthrough fetch → map → display (hook query langsung)
- ✗ Form validasi single (Zod cukup)
- ✗ UI state toggle (Zustand cukup)

---

## 14. Checklist — Build/Fix Feature

- [ ] Folder mengikuti §2 (layer seperlunya, no empty).
- [ ] Dependency rule §1 tidak dilanggar.
- [ ] Entity = `type` + pure function (tidak class).
- [ ] DTO tidak bocor ke `presentation`; mapper + Zod ada.
- [ ] Use-case hanya saat ada business logic; else hook → repo langsung.
- [ ] Server state pakai Query; global state Zustand; form RHF + Zod.
- [ ] **RLS policy enforce company_id (NFR-01); client trust DB scope via JWT.**
- [ ] **DB types generated via `supabase gen types`; entity boundary enforced (NFR-13).**
- [ ] **I18n: hardcoded string → `t("key")`; tanggal + mata uang pakai locale ID (NFR-10).**
- [ ] **Sentry init di main.tsx; error tracking live (NFR-11).**
- [ ] **Offline: TanStack Query `staleTime`/`gcTime`; offline badge saat jaringan putus (NFR-14).**
- [ ] **Keyset pagination; `SELECT` field-specific; indeks aktif (NFR-06, NFR-02).**
- [ ] UI pakai token Tailwind; risk level = label + skor + warna; kontras AA (NFR-09).
- [ ] Responsif mobile → `lg`, no overflow.
- [ ] Vitest + RTL unit/integration; Playwright E2E critical path.
- [ ] CI: typecheck, lint, test, migration dry-run **WAJIB hijau**.
- [ ] Dokumentasi fitur di `docs/features/<fitur>.md` + [PROGRESS.md](../../docs/PROGRESS.md) updated.

---

## 📌 PRD Traceability

| NFR | §5 Requirement | Guide Section | Status |
|-----|----------------|---------------|--------|
| NFR-01 | Multi-tenant RLS isolation | §1, §4.2, §6.1 | ✓ |
| NFR-02 | Performance targets | §9 | ✓ |
| NFR-09 | WCAG AA accessibility | §10 | ✓ |
| NFR-10 | i18n ID/EN, date-fns locale, IDR | §6.5 | ✓ |
| NFR-11 | Sentry error monitoring | §6.6 | ✓ |
| NFR-12 | Vitest+RTL, Playwright, CI gates | §11 | ✓ |
| NFR-13 | Generated DB types + boundary | §4.0, §4.3 | ✓ |
| NFR-14 | Offline cache + badge | §12 | ✓ |
| FR-RISK-2 | Typed search params Zod | §5.2 | ✓ |

---

## 🔗 Related Docs

- [PRD.md](../../docs/PRD.md) — source of truth
- [design-system.md](design-system.md) — token, palette, contrast
- [PROGRESS.md](../../docs/PROGRESS.md) — feature status
- [architecture.md](architecture.md) — clean arch rationale
- [conventions.md](conventions.md) — naming, imports, PR template