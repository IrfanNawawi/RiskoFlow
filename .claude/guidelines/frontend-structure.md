# Frontend Structure — Panduan

Struktur kode **target** RiskoFlow (Feature-Sliced Clean Architecture). Layering bersifat
**dinamis** — sebuah fitur menumbuhkan layer (`domain`/`data`/`presentation`) dan sub-folder
(`use-cases`, `validation`, `stores`) **hanya saat ada kebutuhan nyata**, bukan di awal.

> Stack: **TanStack Query + Zustand + Zod + react-hook-form**, Tailwind v4 + shadcn/ui,
> data lewat **Supabase** (target). Cek [package.json](../../package.json) untuk yang sudah terpasang.

---

## 0. Library stack

[package.json](../../package.json) adalah **sumber kebenaran** — verifikasi ke sana sebelum import.
Tabel di bawah memisahkan **terpasang sekarang** vs **target PRD** (lihat
[CLAUDE.md](../../CLAUDE.md) "Realita vs target" & [PRD §5.5](../../docs/PRD.md)). **Jangan import
lib target sebelum di-install** — ingatkan user lebih dulu dan **pin versi exact**.

### Terpasang sekarang (package manager: **bun**, `bun.lockb`)

| Library | Versi | Peran di RiskoFlow |
|---|---|---|
| `react` / `react-dom` | `^19.0.0` | UI (React Compiler target) |
| `@tanstack/react-router` | `1.170.x` | Routing — code-based di [main.tsx](../../src/main.tsx); typed search params via Zod (FR-RISK-2) |
| `@tanstack/react-query` | `^5.62.0` | Server state; kini membaca **mock store**, target Supabase |
| `@tanstack/react-table` | `8.21.x` | DataTable (headless) — siap dipakai untuk risk register |
| `react-hook-form` + `zod` (v4) + `@hookform/resolvers` | `7.80` / `4.4` / `5.4` | Form + validasi; schema di `features/*/validation/` |
| `zustand` | `^5.0.2` | UI/client state global **+** mock data store ([store.ts](../../src/data/store.ts)) |
| `recharts` | `^2.15.0` | Chart + heatmap ([Heatmap.tsx](../../src/components/Heatmap.tsx)) |
| `tailwindcss` + `@tailwindcss/vite` | `^4.0.0` | Styling, `@theme` token di [index.css](../../src/index.css) |
| `clsx` + `tailwind-merge` | `2.1` / `3.6` | `cn()` di [format.ts](../../src/lib/format.ts) (juga fondasi shadcn) |
| `xlsx` + `jspdf` | — | ekspor `.xlsx`/`.pdf` via [`@/lib/export`](../../src/lib/export.ts) (di-`import()` dinamis); dipakai Risk Register/Reports/Dashboard |
| `date-fns` · `react-i18next` · `@sentry/react` | — | format tanggal · i18n · error tracking (belum di-wire ke UI) |
| `typescript` · `vite` · `vitest` · `@testing-library/*` · `eslint` · `prettier` | — | toolchain (script + config **sudah** disiapkan) |
| `@playwright/test` | `1.61.x` | E2E (browser & spec belum ditulis — `npx playwright install` saat mulai) |

Perintah: `bun run dev | build | typecheck | lint | format | test | preview`.

### Fondasi shadcn/ui (terpasang, adopsi per-kebutuhan)

[components.json](../../components.json) sudah ada (style `new-york`, `cssVariables`, `cn` → `@/lib/format`,
komponen baru ke `@/components/shadcn`). **Belum** ada komponen shadcn yang di-generate: tambah lewat
`bunx shadcn@latest add <comp>` **saat dibutuhkan**, lalu **petakan token shadcn (`bg-background`,
`border-input`, …) ke design token `@theme`** kita ([design-system.md](design-system.md)) — jangan
biarkan komponen memakai warna default. Primitif bespoke tetap di [ui.tsx](../../src/components/ui.tsx).

### Target PRD yang belum terpasang

| Library | Untuk | Catatan |
|---|---|---|
| `@supabase/supabase-js` | Data layer (Auth, Postgres + RLS) | menggantikan mock store — **belum di-install** |

> **Sengaja TIDAK dipakai** (menyimpang dari draf stack umum): `axios` (cukup supabase-js/`fetch`),
> `@supabase/auth-helpers-react` (deprecated → `@supabase/ssr`), `valibot` (validasi kanonik = **Zod**),
> `visx`/`d3-scale`/`d3-interpolate` (heatmap cukup recharts/SVG + token warna), `immer` (belum perlu;
> Zustand v5 pakai `set` biasa), `dotenv` (Vite pakai `import.meta.env.VITE_*`), `sonner` (toast pakai
> primitif `@/components` sampai shadcn diadopsi).

---

## 1. Dependency Rule (wajib)

```
presentation  →  domain  ←  data
```

- `domain` **murni** — tanpa React, Supabase, atau lib UI. Hanya `type` + pure function + interface.
- `data` mengimplementasikan interface (`I*Repository`) milik `domain`; di sini Zod memvalidasi DTO.
- `presentation` boleh import `domain`, `@/components` (design system), `@/lib`. **Dilarang**
  import `data` langsung — wiring lewat DI hook (§6).

---

## 2. Struktur folder

**Saat ini** (sederhana, sumber data mock):

```
src/
├── components/        # UI bersama: ui.tsx, Sidebar, Topbar, RiskBadge, Heatmap, modal
├── data/              # store.ts (Zustand), seed.ts (mock), types.ts (tipe domain)
├── features/<f>/      # page per fitur: <Name>Page.tsx
├── lib/               # pure helper: risk.ts, format.ts
└── main.tsx           # router + provider
```

**Target per fitur** (saat data layer Supabase masuk / fitur tumbuh kompleks):

```
src/features/<feature>/
├── domain/
│   ├── entities/            # type + pure function (BUKAN class) — atau pakai @/data/types
│   ├── repositories/        # interface kontrak: I<Name>Repository.ts
│   ├── use-cases/           # DINAMIS — hanya bila ada business logic
│   └── index.ts
├── data/
│   ├── datasources/         # Supabase query + <name>.dto.ts
│   ├── mappers/             # DTO → entity (+ validasi Zod)
│   ├── repositories/        # <name>.repository.ts (implements I<Name>Repository)
│   └── index.ts
├── validation/              # zod schema untuk form (RHF)
├── presentation/
│   ├── pages/ · components/
│   ├── hooks/               # DI factory + useQuery/useMutation
│   └── stores/              # zustand store fitur (bila ada state global khusus)
└── index.ts                 # entry publik: re-export page
```

Tambah layer saat dibutuhkan; jangan buat folder kosong. Untuk fitur sederhana (passthrough
fetch → tampil), page + hook query + tipe di `@/data/types` sudah cukup.

> **Implementasi acuan:** **risks** ([doc](../../docs/features/risks.md)), **incidents**
> ([doc](../../docs/features/incidents.md)), & **compliance** ([doc](../../docs/features/compliance.md))
> sudah memakai struktur target (domain/data/presentation + DI hook + repository di atas mock store).
> Pakai sebagai cetakan. Sisanya (dashboard, reports, audit, onboarding) **masih akses `@/data/store`
> langsung** — migrasikan saat disentuh. Status: [PROGRESS.md](../../docs/PROGRESS.md).

---

## 3. Domain layer

**Entity** — `type` + pure function (alasan di
[architecture.md](architecture.md#entity--type--pure-function-bukan-class)). Tipe domain inti
sudah ada di [types.ts](../../src/data/types.ts); pure function turunannya di
[risk.ts](../../src/lib/risk.ts).

```typescript
export interface Risk {
  id: string;
  title: string;
  category: RiskCategory;
  inherent: Assessment;
  residual?: Assessment;
  // ...
}

export const activeAssessment = (r: Risk): Assessment => r.residual ?? r.inherent;
```

**Repository interface** — kontrak yang diimplementasikan `data` (target Supabase).

```typescript
// domain/repositories/IRiskRepository.ts
import type { Risk } from "@/data/types";

export interface IRiskRepository {
  list(query: RiskListQuery): Promise<Risk[]>;
  approveTreatment(riskId: string, treatmentId: string): Promise<void>;
}
```

> Contoh nyata: [IRiskRepository.ts](../../src/features/risks/domain/repositories/IRiskRepository.ts).

**Use-case (dinamis)** — buat saat ada business logic (mis. gate approval `ACCEPT`).

```typescript
// domain/use-cases/approveTreatment.usecase.ts
export const approveTreatment = (repo: IRiskRepository, role: MembershipRole[]) =>
  (riskId: string, treatmentId: string) => {
    if (!role.includes("risk_manager") && !role.includes("admin"))
      throw new Error("Hanya risk manager yang dapat menyetujui");
    return repo.approveTreatment(riskId, treatmentId);
  };
```

> Kalau tidak ada aturan seperti ini, **lewati use-case** — hook query langsung panggil repository.
> Contoh nyata: [approveTreatment.usecase.ts](../../src/features/risks/domain/use-cases/approveTreatment.usecase.ts).

---

## 4. Data layer (target Supabase)

- `datasources/<name>.dto.ts` — bentuk mentah dari Supabase (kolom snake_case apa adanya).
- `datasources/<Name>RemoteDataSource.ts` — query Supabase, kembalikan DTO.
- `mappers/<name>.mapper.ts` — `toDomain(dto)`. **Validasi DTO dengan Zod di sini**; data rusak
  ditolak/difilter. Hasil = entity domain (plain object camelCase).
- `repositories/<name>.repository.ts` — `implements I<Name>Repository`, gabung datasource + mapper.

Aturan: **DTO tidak boleh bocor ke `presentation`.** Yang keluar dari repository selalu entity domain.

> Selama backend belum ada, "repository" sementara membaca dari `@/data/store` (Zustand mock).
> Pertahankan signature repository agar penggantian ke Supabase tidak menyentuh `presentation`.
> Contoh nyata (mock): [RiskMockDataSource.ts](../../src/features/risks/data/datasources/RiskMockDataSource.ts) ·
> [risk.mapper.ts](../../src/features/risks/data/mappers/risk.mapper.ts) ·
> [RiskRepository.ts](../../src/features/risks/data/repositories/RiskRepository.ts).

---

## 5. Validation layer (Zod)

Schema input form di `validation/<name>.schema.ts`. Pesan error **Bahasa Indonesia**. Dipakai
react-hook-form via `zodResolver`.

```typescript
import { z } from "zod";

export const newRiskSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter").max(150, "Maksimal 150 karakter"),
  category: z.enum(["FINANCIAL", "OPERATIONAL", "LEGAL", "REPUTATIONAL", "STRATEGIC"]),
  departmentId: z.string().min(1, "Departemen wajib dipilih"),
});
export type NewRiskInput = z.infer<typeof newRiskSchema>;
```

---

## 6. Presentation layer

**DI hook factory** — satu titik wiring `data → domain`, di-`useMemo`.

```typescript
// presentation/hooks/useRiskRepository.ts
export const useRiskRepository = () =>
  useMemo(() => new RiskRepository(new RiskRemoteDataSource(supabase)), []);
```

> Contoh nyata: [useRiskRepository.ts](../../src/features/risks/presentation/hooks/useRiskRepository.ts).

**Server state** → TanStack Query, query key lewat factory (lihat [conventions.md](conventions.md)).
Contoh nyata: [riskKeys.ts](../../src/features/risks/presentation/hooks/riskKeys.ts) ·
[useRisks.ts](../../src/features/risks/presentation/hooks/useRisks.ts) ·
[useRiskMutations.ts](../../src/features/risks/presentation/hooks/useRiskMutations.ts).

```typescript
export const useRisks = (filter: RiskListQuery) => {
  const repo = useRiskRepository();
  return useQuery({
    queryKey: riskKeys.list(filter),
    queryFn: () => repo.list(filter),
    staleTime: 5 * 60_000,
  });
};
```

**UI state global** → Zustand (selector granular; tanpa `immer` di v5 — pakai `set` biasa).

```typescript
// presentation/stores/riskFilter.store.ts
import { create } from "zustand";
import type { RiskCategory, RiskLevel, RiskStatus } from "@/data/types";

interface RiskFilterState {
  category: RiskCategory[];
  level: RiskLevel[];
  status: RiskStatus[];
  setCategory: (v: RiskCategory[]) => void;
  reset: () => void;
}

export const useRiskFilterStore = create<RiskFilterState>((set) => ({
  category: [],
  level: [],
  status: [],
  setCategory: (category) => set({ category }),
  reset: () => set({ category: [], level: [], status: [] }),
}));

// Komponen: selektor granular agar re-render minimal
const category = useRiskFilterStore((s) => s.category);
```

> Catatan: filter **risk register** sudah memakai **typed search params** (TanStack Router + Zod,
> FR-RISK-2) — lihat [search.ts](../../src/features/risks/search.ts) &
> [RiskRegisterPage.tsx](../../src/features/risks/RiskRegisterPage.tsx) (`getRouteApi("/app/risks")`).
> Pakai Zustand seperti contoh di atas hanya untuk UI state global lain yang **tidak** perlu di URL.

**Form** → react-hook-form + `zodResolver`. Schema di `features/<f>/validation/`; contoh nyata:
[newRisk.schema.ts](../../src/features/risks/validation/newRisk.schema.ts) +
[NewRiskModal.tsx](../../src/components/NewRiskModal.tsx). **State lokal** → `useState`. Page tetap
tipis: ambil dari hook, render komponen.

---

## 7. Design system & routing

- Token & komponen bersama → `@/components` + `@theme` di
  [src/index.css](../../src/index.css). **Selalu** pakai utility token (`bg-primary`,
  `text-on-surface`), jangan hardcode hex. Detail di [design-system.md](design-system.md).
- Routing **TanStack Router** (code-based). Daftarkan route baru di
  [main.tsx](../../src/main.tsx) (`createRoute` + `addChildren`); pertahankan path yang sudah ada.
  Layout `AppShell` adalah route pathless `id: "app"` → route id berprefiks `/app` (mis.
  `getRouteApi("/app/risks")`), tetapi path `Link`/navigasi tetap tanpa prefiks (`to="/risks/$riskId"`).
  Filter → typed search params + Zod (`validateSearch`), FR-RISK-2.

---

## 8. Path alias

Satu alias **`@/* → src/*`** (sinkron di [vite.config.ts](../../vite.config.ts) &
[tsconfig.app.json](../../tsconfig.app.json)).

```typescript
// ✅
import { Card } from "@/components/ui";
import type { Risk } from "@/data/types";
// ❌
import { Card } from "../../../components/ui";
```

---

## 9. Checklist saat membangun/merapikan fitur

- [ ] Folder mengikuti §2 (layer seperlunya, tidak ada folder kosong).
- [ ] Dependency rule §1 tidak dilanggar; `presentation` tak import `data` langsung.
- [ ] Entity = `type` + pure function (tidak ada class entity).
- [ ] DTO tidak bocor; mapper + validasi Zod ada (saat data layer nyata).
- [ ] Use-case hanya bila ada business logic; selain itu hook → repository langsung.
- [ ] Server state pakai Query; global state Zustand (selector); form RHF + Zod.
- [ ] UI pakai token Tailwind; level risiko punya label + skor (bukan hanya warna); kontras AA.
- [ ] **Responsif** di breakpoint utama (mobile → `lg`), tidak ada overflow.
- [ ] `bun run typecheck`, `bun run build`, `bun run lint` & `bun run test` hijau.
- [ ] Dokumentasi fitur di `docs/features/<fitur>.md` (pakai [_TEMPLATE.md](../../docs/_TEMPLATE.md)) diperbarui.
