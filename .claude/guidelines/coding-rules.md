# Coding Rules — Konvensi Penulisan Kode (RiskoFlow)

Aturan menulis kode RiskoFlow (web SPA — React 19 + TypeScript strict + Vite). Tujuan: konsisten, mudah dibaca, aman. Ikuti Feature-Sliced Clean Architecture di [architecture.md](architecture.md) & [frontend-structure.md](frontend-structure.md).

---

## Bahasa

- **Kode** (variabel, fungsi, tipe, file): Bahasa Inggris.
- **Komentar, pesan error UI, copy, dokumentasi, i18n**: Bahasa Indonesia.
- Komentar menjelaskan *kenapa*, bukan *apa*.

---

## Penamaan

| Hal | Gaya | Contoh |
|---|---|---|
| Komponen | PascalCase | `RiskBadge` |
| File komponen | `<Name>.tsx` | `RiskBadge.tsx` |
| File page | `<Name>Page.tsx` | `DashboardPage.tsx` |
| File entity (`type` + pure fn) | `<name>.entity.ts` atau di `@/data/types` | `risk.entity.ts` |
| Use-case (dinamis ONLY) | `<verb><Name>.usecase.ts` | `approveTreatment.usecase.ts` |
| Interface repo | `I<Name>Repository.ts` | `IRiskRepository.ts` |
| Impl repo | `<name>.repository.ts` | `risk.repository.ts` |
| Hook | `use<Thing>` | `useRisks`, `useRiskRepository` |
| Zustand store | `use<Thing>Store` atau `useStore` | `useStore` |
| Zod schema | `<thing>.schema.ts` atau di `validation/` | `newRisk.schema.ts` |
| Query key | array konstan via factory | `riskKeys.list(filter)` |
| DTO (database types) | `database.types.*` (generated) | `Database.Tables.Risks` |
| Variabel/fungsi | camelCase | `activeRisks`, `isLoading` |
| Konstanta global | UPPER_SNAKE_CASE | `PAGE_SIZE` |

---

## TypeScript

- `strict` aktif untuk seluruh `src` ([tsconfig.app.json](../../tsconfig.app.json)) — **wajib pertahankan**.
  `noUnusedLocals` & `noUnusedParameters` menyala: jangan tinggalkan import/variabel mati.
- **Hindari `any`.** Bila tipe tak diketahui, pakai `unknown` lalu narrow.
- `verbatimModuleSyntax` aktif → **wajib `import type { ... }`** untuk import yang hanya tipe.
- Objek immutable pakai `readonly` / `as const`.
- Hindari non-null `!` kecuali sudah ada guard. Jangan `// @ts-ignore`; pakai
  `// @ts-expect-error` + alasan bila terpaksa.

---

## React

- Komponen fungsional + hooks. Tidak ada class component.
- **Entity = `type` + pure function, BUKAN class** — lihat [ARCHITECTURE § 3.4](architecture.md) (TanStack Query structural sharing).
- Bungkus callback ke child list dengan `useCallback`; nilai mahal dengan `useMemo`. Jangan over-memo (cek mana yang benar-benar perlu).
- `key` pada list pakai id stabil, **bukan** index.
- Logika turunan dari data → pure function di `@/lib` atau `domain`, bukan di JSX.
- **React Compiler (React 19) auto-memo aktif** — tidak perlu manual `React.memo` asal tidak ada pelanggaran rule.

---

## Styling (Tailwind + token)

- **Jangan hardcode** warna/spacing/font. Pakai utility yang memetakan ke `@theme` token di
  [src/index.css](../../src/index.css): `bg-primary`, `text-on-surface`, `text-risk-extreme`,
  `border-border-hairline`, `gap-md`, dst.
- Warna chart/level yang harus dinamis boleh pakai CSS variable
  (`var(--color-risk-high)`) — tetap satu sumber token, bukan hex liar.
- Komponen UI reusable → [src/components/ui.tsx](../../src/components/ui.tsx); cek dulu sebelum membuat yang baru.
  Shadcn komponen: generate via `bunx shadcn@latest add <comp>`, petakan token ke `@theme`.
- **Kontras WCAG AA (≥4.5:1 normal, ≥3:1 large).** Risk level: **label + skor**, tidak hanya warna (NFR-09).

---

## State & Data

### Server State (TanStack Query)
- **TanStack Query WAJIB** (`useQuery`/`useMutation`) — bukan `useEffect` + fetch manual.
- Query key factory (`riskKeys.list()`, dll) untuk consistency.
- `staleTime` + `gcTime` cache strategy (misal: 5 min stale, 10 min garbage).
- Keyset/cursor pagination (bukan offset) — NFR-06.
- `select` hanya kolom dipakai (jangan `SELECT *`).

### Global UI State (Zustand)
- **Granular store** dengan **selector** melalui `useShallow` agar re-render minimal.
- Contoh: `activeCompanyId`, `filterApplied` — akses via selector, bukan full store.

### Form (react-hook-form + Zod)
- Validasi input eksternal/form **dengan Zod**.
- Error msg Bahasa Indonesia (schema `validation/` folder).
- Form state via `useForm`; tidak di Zustand global.

### Mata Uang & Tanggal (Locale ID)
- **Mata uang = integer Rupiah**, tidak pernah float (PRD NFR-10). Format via `@/lib/format`
  (`idr`, `idrCompact`), jangan format manual.
- **Tanggal:** date-fns + locale ID (`import { id } from "date-fns/locale"`) — format per locale.

---

## Folder Structure (Feature-Sliced, Dynamic)

**Saat ini** (sederhana, mock):
```
src/
├── components/        # Shared UI: ui.tsx, Sidebar, RiskBadge
├── data/              # store.ts (Zustand), types.ts (domain entity)
├── features/<f>/      # Page per fitur: <Name>Page.tsx
├── lib/               # Pure helper: risk.ts, format.ts, supabase.ts
├── database.types.ts  # Generated dari `supabase gen types` (WAJIB NFR-13)
├── i18n/              # Locales: id.json, en.json (WAJIB NFR-10)
└── main.tsx           # Router + provider + Sentry init
```

**Target per fitur** (Supabase live / kompleks):
```
src/features/<feature>/
├── domain/
│   ├── entities/            # Type + pure function (bukan class)
│   ├── repositories/        # Interface: I<Name>Repository.ts
│   ├── use-cases/           # DINAMIS — hanya saat ada business logic (§Kapan Buat)
│   └── index.ts
├── data/
│   ├── datasources/         # <name>.dto.ts + RemoteDataSource (Supabase query)
│   ├── mappers/             # <name>.mapper.ts (DTO → entity + Zod validasi)
│   ├── repositories/        # <name>.repository.ts (impl I<Name>Repository)
│   └── index.ts
├── validation/              # Zod schema form RHF; error msg Bahasa Indonesia
├── presentation/
│   ├── pages/               # <Name>Page.tsx (thin; hook → component)
│   ├── components/          # Local feature component
│   ├── hooks/               # DI factory + useQuery/useMutation + key factory
│   ├── stores/              # Zustand store (opsional; state feature)
│   └── index.ts
└── index.ts                 # Export page public
```

**Rules:**
- Tambah layer saat kebutuhan nyata; **jangan folder kosong**.
- Fitur sederhana: page + hook query + type di `@/data/types` sudah cukup.
- Kompleks (risks, incidents, compliance): full structure.

---

## Dependency Rule (WAJIB)

```
presentation  →  domain  ←  data
```

- **`domain`** — `type` + interface + pure function. **ZERO React/Supabase/UI lib.**
- **`data`** — implements `I*Repository`. DTO → entity mapper Zod. **RLS enforce DB sisi** (NFR-01).
- **`presentation`** — import `domain`, `@/components`, `@/lib`. **Dilarang import `data` langsung** — wiring via DI hook factory (§DI).

**RLS (NFR-01):** Semua Supabase query scope `company_id` otomatis via Postgres policy + JWT. Client **trust JWT scope** — jangan `WHERE company_id = X` hardcode. Validasi peran di UI (`can()` di store) hanya UX; otorisasi sesungguhnya di Postgres RLS/policy.

---

## DI + Repository Pattern

**Hook DI Factory** (presentation/hooks/):
```typescript
// useRiskRepository.ts
export const useRiskRepository = (): IRiskRepository => {
  return useMemo(() => new RiskRepository(supabase), []);
};

// useListRisks.ts
export const useListRisks = (companyId: string) => {
  const repo = useRiskRepository();
  return useQuery({
    queryKey: ["risks", companyId],
    queryFn: () => repo.list({ companyId, limit: 20 }),
    staleTime: 5 * 60_000,
  });
};
```

Satu titik tahu cara build repository & dependency.

---

## Kapan Buat Use-Case

**CREATE** saat:
- ✓ Permission gate (hanya `risk_manager` bisa approve ACCEPT)
- ✓ Multi-step transaction (update risiko + auto-trigger review)
- ✓ Cross-aggregate logic (insiden → update severity risiko)

**SKIP** saat:
- ✗ Passthrough fetch → display (hook query langsung repo cukup)
- ✗ Form validasi single (Zod cukup)
- ✗ UI state toggle (Zustand cukup)

---

## Import

- Urutan: (1) lib eksternal, (2) alias `@/...`, (3) relatif `./`.
- Pakai path alias `@/`, bukan `../../../..`. Hormati dependency rule.
- `import type { ... }` untuk tipe only (TypeScript `verbatimModuleSyntax`).

---

## Database & Security (WAJIB NFR-01, NFR-13, NFR-04)

### Database Types Generation (NFR-13)

```bash
supabase gen types typescript --linked > src/database.types.ts
```

**Script di package.json:**
```json
{ "gen:types": "supabase gen types typescript --linked > src/database.types.ts" }
```

- `database.types.*` = DTO (snake_case, generated)
- `@/data/types` = entity domain (camelCase)
- **Presentation import entity only** — DTO di-isolate `data/`.

### Secrets & Environment (NFR-04)

**Public client:**
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SENTRY_DSN=...
```

**Private secrets** (LLM, email):
- Stored **Supabase Vault** saja.
- Akses dari **Edge Function** (`ai-risk-assistant`, `email-worker`).
- Client **NEVER** punya akses.

### RLS & Company Scoping (NFR-01)

Semua PostgREST query scope `company_id` otomatis via Postgres RLS policy. Client **tidak** hardcode `WHERE company_id = X`:

```typescript
// RLS enforce otomatis
const { data } = await supabase
  .from("risks")
  .select("id, title, category");  // Policy scope company_id auto
```

**Testing:** Vitest + RTL unit; **Playwright wajib test RLS deny** (user perusahaan lain block).

---

## Error Handling & Monitoring (NFR-11)

### Sentry (WAJIB init main.tsx)

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
Sentry.setUser({ id: user.id });
Sentry.setTag("company_id", companyId);
```

**Goal:** Error-free sessions ≥ 99% (NFR-11).

### Error Handling Pattern

- **`domain`/`data`** → throw `Error` pesan jelas (Bahasa Indonesia untuk UI).
- **Komponen** → tangani error TanStack Query (`isError`/`error`), bukan `try/catch` manual.
- Sediakan **error state UI** (loading, empty, error, offline) — PRD FR-DASH-6, NFR-07.
- **Jangan telan error** (`catch {}` kosong) — log atau propagate.

---

## Internationalization (NFR-10 — WAJIB)

### i18n (react-i18next)

**Hardcoded string → `t("key")`:**
```typescript
import { useTranslation } from "react-i18next";

export function RiskBadge() {
  const { t } = useTranslation();
  return <span>{t("riskLevel.high")}</span>;
}
```

Locales di `src/i18n/id.json`, `en.json`.

### Tanggal (date-fns + locale ID)

```typescript
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const formatted = format(new Date("2026-07-01"), "PPP", { locale: idLocale });
// "1 Juli 2026"
```

### Mata Uang (Integer IDR)

```typescript
const formatIDR = (amount: number) => 
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
```

**Nilai internal = integer Rupiah** (tidak pernah float — PRD).

---

## Offline Support (NFR-14)

### useOnline Hook

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

### UI Pattern

- **Offline badge** di topbar (icon + "Mode Offline").
- **Query cached** hasil; label "Data lokal" jika stale.
- **Mutasi** (create/update) hold di client; belum POST sampai online.

**Goal:** User tidak hilang data saat jaringan mati.

---

## Testing (NFR-12 — WAJIB)

### Unit + Integration (Vitest + RTL)

```bash
bun run test
bun run test:watch
```

Convention: `*.test.ts(x)`. Features pakai `describe` granular; mock repository via DI.

### E2E (Playwright)

```bash
bun run e2e
```

**Critical path:** auth → onboarding → risk register → review/treat.
**RLS test wajib (D23):** verify user dari perusahaan lain tidak akses.

### CI Gates (WAJIB)

**Sebelum merge, sinkronkan:**
```bash
bun run typecheck
bun run build
bun run test
bun run e2e  # critical path minimal
```

Status: **WAJIB hijau** (lint + typecheck + test + migration dry-run).

---

## Routing (TanStack Router)

- **Code-based routing** di [main.tsx](../../src/main.tsx); typed search params via Zod (FR-RISK-2).
- Path existing tetap agar internal link tidak putus.
- Filter via typed search params + validasi Zod.

---

## Package Management

- Package manager = **bun** (`bun.lockb`).
- **Pin versi exact** untuk library baru — tulis `"5.4.0"`, **bukan** `"^5.4.0"`.
- Tambah dependency baru hanya setelah **konfirmasi user**; cek dulu di `package.json`.

---

## Format & Quality Gates

**Saat ini** tersedia:
```bash
bun run typecheck    # TS strict check
bun run build        # Vite build
```

**Target PRD (NFR-11):** ESLint + Prettier (gate saat diconfig).

Jangan reformat file yang tak Anda sentuh (hindari diff besar tak relevan).

---

## Performance (NFR-02)

- **React Compiler** (React 19) auto-memo — jangan over-memo.
- **Query optimization:**
  - Keyset/cursor pagination (bukan offset)
  - `select` hanya field dipakai
  - `staleTime` + `gcTime` cache strategy
- **Heatmap:** limit 500 risiko, memoize transform.
- **Target:** Dashboard < 1.5s, list < 300ms, heatmap < 500ms.

---

## Accessibility (WCAG 2.1 AA — NFR-09)

- Token Tailwind `text-*` + `bg-*` ≥ 4.5:1 contrast (normal) / ≥ 3:1 (large).
- **Risk level = label + skor**, tidak hanya warna.
- Radix primitives (shadcn/ui): focus ring, ARIA, keyboard nav otomatis.
- Icon-only button: `aria-label="Unduh laporan"`.

---

## Yang Harus Dihindari

- File raksasa: pecah komponen/hook bila > ~200 baris atau punya >1 tanggung jawab.
- Logika bisnis di dalam JSX/page — pindahkan ke hook/use-case/pure function.
- **Class entity** dengan getter — pakai `type` + pure function.
- **Use-case kosong** yang cuma meneruskan panggilan — buat use-case hanya saat ada business logic.
- Hardcode hex warna / nama font di komponen.
- Menambah dependency baru tanpa konfirmasi user.
- `catch {}` kosong — log atau propagate error.
- Import DTO ke `presentation` — mapper + entity only.
- Hardcode `company_id` di query — trust RLS policy.
- Secret di kode/commit — Vault Supabase untuk private key.

---

## Checklist — Build/Fix Feature

- [ ] Folder mengikuti Feature-Sliced (layer seperlunya, no empty).
- [ ] Dependency rule: presentation → domain ← data.
- [ ] Entity = `type` + pure function (tidak class).
- [ ] DTO tidak bocor ke `presentation`; mapper + Zod ada.
- [ ] Use-case hanya saat ada business logic (permission, transaction, cross-agg).
- [ ] Server state pakai TanStack Query; global state Zustand; form RHF + Zod.
- [ ] **RLS policy enforce company_id (NFR-01); client trust DB scope via JWT.**
- [ ] **DB types generated via `supabase gen types`; entity boundary enforced (NFR-13).**
- [ ] **i18n: hardcoded string → `t("key")`; tanggal + mata uang pakai locale ID (NFR-10).**
- [ ] **Sentry init di main.tsx; error tracking live (NFR-11).**
- [ ] **Offline: TanStack Query `staleTime`/`gcTime`; offline badge saat jaringan putus (NFR-14).**
- [ ] **Keyset pagination; `SELECT` field-specific; indeks aktif (NFR-06, NFR-02).**
- [ ] UI pakai token Tailwind; risk level = label + skor + warna; kontras AA (NFR-09).
- [ ] Responsif mobile → `lg` breakpoint, no overflow.
- [ ] Vitest + RTL unit/integration; Playwright E2E critical path + RLS test.
- [ ] Typecheck + build **hijau** sebelum push.
- [ ] Dokumentasi fitur di `docs/features/<fitur>.md` + PROGRESS.md updated.

---

## Referensi

- [architecture.md](architecture.md) — clean arch rationale, layer responsibility
- [frontend-structure.md](frontend-structure.md) — folder structure, state management, DI pattern
- [PRD.md](../../docs/PRD.md) — source of truth features & NFR
- [design-system.md](design-system.md) — token, palette, contrast
- [PROGRESS.md](../../docs/PROGRESS.md) — feature status

---

**Last Updated:** 2026-07-01 | **Aligned dengan:** architecture v1.6.1 + frontend-structure v1.6.1 + PRD v1.6.1