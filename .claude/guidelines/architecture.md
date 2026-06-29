# Architecture Overview

RiskoFlow adalah **web SPA** (React 19 + TypeScript strict + Vite) untuk manajemen risiko
ISO 31000. Arsitektur target: **Feature-Sliced Clean Architecture** — kode dikelompokkan per
fitur di `src/features/`, tiap fitur dibagi ke layer `domain` / `data` / `presentation`.

> **Status saat ini.** App berjalan di atas **in-memory Zustand store + mock seed data**
> (`src/data/store.ts`, `src/data/seed.ts`, `src/data/types.ts`) dan routing **react-router-dom**.
> Target PRD (§stack): **Supabase** (Postgres + RLS + Auth + Edge Functions) sebagai sumber data
> dan **TanStack Router** sebagai router. Saat membangun fitur baru, ikuti layering target di
> bawah; tandai jelas mana yang **sudah ada** vs **target** (mis. "⚠️ target Supabase").

## Stack

| Kebutuhan | Tool |
|---|---|
| UI & build | React 19, TypeScript (`strict`), Vite |
| Routing | `react-router-dom` (saat ini) → **TanStack Router** (target PRD) |
| Server state + cache | **TanStack Query** (`@tanstack/react-query`, sudah terpasang) |
| Client/UI state global | **Zustand** |
| Form + validasi | **react-hook-form + Zod** (target) |
| Styling | **Tailwind v4** (`@theme` token di `src/index.css`) + **shadcn/ui** (Radix) |
| Data/backend | **Supabase** — Postgres, RLS, Auth, Edge Functions (target) |

## Dependency Rule

```
presentation → domain ← data
```

- `presentation` boleh import dari `domain`, **tidak** boleh langsung ke `data`.
- `data` mengimplementasikan interface (`I*Repository`) milik `domain`.
- `domain` tidak punya dependency ke layer lain (TypeScript polos — tanpa React, Supabase, atau lib UI).

## Layer Responsibilities

| Layer | Tanggung Jawab | Boleh Import |
|---|---|---|
| `domain` | Tipe entity + pure function, interface repo, use-case (dinamis) | — |
| `data` | Akses data (Supabase client / repository), DTO, mapping + validasi Zod → entity | `domain` |
| `presentation` | UI, hook (query/mutation), store Zustand, routing | `domain`, `@/components` (design system), `@/lib` |

### Entity = `type` + pure function (BUKAN class)

Entity adalah `type`/`interface` polos + fungsi murni untuk logika turunan — **bukan class
dengan getter**:

- Class instance **tidak serializable** → getter hilang saat masuk cache TanStack Query atau
  state Zustand yang dipersist.
- Class instance = referensi baru tiap fetch → **merusak structural sharing** TanStack Query →
  list re-render tanpa perlu. Plain object menjaga referensi stabil.

Pola ini sudah dipakai: lihat [risk.ts](../../src/lib/risk.ts) (`computeRiskLevel`,
`severityScore`, `cellLevel` — pure function atas tipe domain) dan
[types.ts](../../src/data/types.ts) (`Risk`, `Assessment`, dst sebagai `interface`).

```typescript
// domain: type + pure function
export interface Assessment {
  likelihood: number; // 1..5
  impact: number;     // 1..5
  severity: number;   // likelihood * impact
  level: RiskLevel;
}

// pengganti getter — pure function
export const computeRiskLevel = (likelihood: number, impact: number): RiskLevel => {
  const score = likelihood * impact;
  if (score >= 15) return "EXTREME";
  if (score >= 10) return "HIGH";
  if (score >= 5) return "MEDIUM";
  return "LOW";
};
```

> Logika kanonik (mis. severity → level) **harus satu sumber** dengan DB. Di produksi ini
> generated column + IMMUTABLE function Postgres; mirror client-nya di `@/lib/risk` (PRD D4/D22).

### Use-case bersifat dinamis

Tambahkan `domain/use-cases/` **hanya bila ada business logic / orkestrasi nyata** (mis.
approval gate `ACCEPT`, auto-advance review saat insiden, validasi aturan, gabung beberapa
repo). Bila operasi cuma passthrough (fetch → tampil), **lewati use-case** — hook query langsung
memanggil repository. Jangan buat use-case kosong yang hanya meneruskan panggilan.

### Repository + DI

`domain` mendefinisikan `I<Name>Repository`; `data` mengimplementasikannya. Wiring `data → domain`
lewat **DI hook factory** (`use<Name>Repository` / `use<Name>UseCases`) yang di-`useMemo` —
titik tunggal yang tahu cara membangun repository. `presentation` tak pernah membuat Supabase
client / datasource sendiri.

## State Management

| State | Tool | Contoh |
|---|---|---|
| Data dari server + cache | **TanStack Query** (`useQuery`/`useMutation`) | daftar risiko, insiden |
| UI/client state global | **Zustand** (store granular + selector) | perusahaan aktif, filter |
| Form + validasi | **react-hook-form + Zod** | onboarding, form risiko |
| Lokal 1 komponen | `useState`/`useReducer` | toggle modal, input sementara |

> Konvensi konkret (query-key, store Zustand, error) ada di [conventions.md](conventions.md).
> Selektor store sudah dipakai di app (mis. `useStore(useShallow(...))` di
> [DashboardPage.tsx](../../src/features/dashboard/DashboardPage.tsx)).

## Design System

Token warna, font, spacing, dan radius didefinisikan sebagai **Tailwind v4 `@theme`** di
[src/index.css](../../src/index.css) (CSS variable), dipakai lewat utility class
(`bg-primary`, `text-on-surface`, `text-risk-extreme`). Komponen primitif bersama ada di
[src/components/ui.tsx](../../src/components/ui.tsx) (`Card`, `Button`, `Icon`, `SectionTitle`,
…). Detail di [design-system.md](design-system.md). **Jangan hardcode hex** di komponen.

## Path Alias

Satu alias: **`@/* → src/*`** (sinkron di [vite.config.ts](../../vite.config.ts) dan
[tsconfig.app.json](../../tsconfig.app.json)). Pakai `@/...`, bukan `../../../..`.

```typescript
import { Card, Button } from "@/components/ui";
import { computeRiskLevel } from "@/lib/risk";
import type { Risk } from "@/data/types";
```

## Routing

Routing saat ini lewat `react-router-dom` (`createBrowserRouter` di
[main.tsx](../../src/main.tsx)); shell + breadcrumb di
[AppShell.tsx](../../src/components/AppShell.tsx). PRD menargetkan migrasi ke **TanStack Router**
dengan **typed search params** untuk filter (FR-RISK-2). Saat menambah route, pertahankan path
yang sudah ada agar link internal tak putus.

## Backend (target) — Supabase

PRD mendesain data layer di atas Supabase: Postgres + **RLS wajib** per `company_id`, Auth
multi-tenant, Edge Functions (proxy AI & email), Vault untuk secret. Akses data dari `presentation`
**hanya** lewat interface repository `domain` — komponen tidak memanggil Supabase client langsung.
Selama backend belum terpasang, `src/data/store.ts` berperan sebagai sumber data sementara.
