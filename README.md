# RiskoFlow — Enterprise Risk Management

Web app pengelolaan manajemen risiko berbasis **ISO 31000:2018**, dibangun sesuai
[`PRD.md`](docs/PRD.md) (v1.6) & sistem desain **"Premium Calm Enterprise"** dari
[`DESIGN.md`](docs/DESIGN.md).

## Stack

- **React 19** + **TypeScript (strict)** + **Vite 6**
- **Tailwind CSS v4** (CSS-first `@theme` — semua design token DESIGN.md)
- **React Router** (typed URL search params untuk filter register)
- **TanStack Query** + **Zustand** (state perusahaan aktif & RBAC)
- **Recharts** (donut/bar dashboard), **Material Symbols** (ikon)

> **Catatan backend (dual-mode):** integrasi **Supabase** sudah ada (`supabase/migrations/`,
> `src/lib/supabase.ts`). Isi `.env` (lihat `.env.example`) + `supabase db push`/`db reset`
> untuk memakai Postgres + RLS; invarian kritis kini DB-enforced (generated column severity/level,
> RPC atomik `create_company_with_admin`, gate ACCEPT FR-TREAT-3 & incident-close FR-INC-6,
> trigger audit/auto-advance). **Tanpa `.env`, app otomatis fallback ke mock in-memory**
> (`src/data/store.ts` + `seed.ts`) yang meniru kontrak yang sama — UI identik di kedua mode.
> **Auth masih ditunda** (pakai `currentUserId` mock; RLS permissive). Edge Functions/Cron/Vault =
> ⚠️ target.

## Menjalankan

```bash
bun install
bun run dev        # http://localhost:5173
```

Perintah lain: `bun run build` · `bun run preview` · `bun run typecheck`.

## Fitur yang diimplementasikan

| Halaman | PRD | Catatan |
|---|---|---|
| **Onboarding** (`/onboarding`) | §3.1 | Wizard 3 langkah, preset departemen per industri, dedupe, seed atomik |
| **Dashboard** (`/dashboard`) | §3.11 | KPI, heatmap 5×5, distribusi kategori/departemen, top risks, perlu ditinjau |
| **Risk Register** (`/risks`) | §3.3–3.4 | Filter via typed URL params, heatmap interaktif (klik sel), draft AI + konfirmasi |
| **Risk Detail** (`/risks/:id`) | §3.4–3.6 | Stepper status, inherent→residual, mitigasi + approval ACCEPT, KRI, kepatuhan |
| **Insiden** (`/incidents`) | §3.7 | Loss/near-miss, gate approval penutupan kerugian ≥ threshold |
| **Compliance** (`/compliance`) | §3.9 | Library regulasi (GENERAL + per industri), progress, gap analysis |
| **Reports** (`/reports`) | §3.11 | Template cepat + custom report builder (drag & drop parameter) |
| **Audit Trail** (`/audit`) | NFR-04 | Jejak who/when/what dari semua aksi |

**RBAC & multi-tenant:** company switcher (≥2 membership), simulator peran di topbar
(`admin/risk_manager/dept_head/executive/compliance`) yang mengaktif-nonaktifkan
kontrol approval secara real-time.

## Struktur (feature-sliced, Clean Architecture)

```
src/
  data/        # types · seed · store (Zustand) — pengganti repository Supabase
  lib/         # risk.ts (computeRiskLevel kanonik, D4) · format.ts (IDR integer)
  components/  # AppShell · Sidebar · Topbar · RiskBadge · Heatmap · ui primitives
  features/    # onboarding · dashboard · risks · incidents · compliance · reports · audit
```
