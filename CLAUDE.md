# RiskoFlow — Panduan untuk Claude

**RiskoFlow** adalah **web SPA** (React 19 + TypeScript strict + Vite) untuk pengelolaan manajemen
risiko perusahaan berbasis **ISO 31000:2018** — identifikasi → analisis/penilaian → mitigasi →
pemantauan → insiden, dengan bantuan AI sebagai *usulan* yang wajib dikonfirmasi manusia. Aplikasi
**multi-tenant**: satu user bisa tergabung di banyak perusahaan dengan banyak peran, berpindah lewat
*company switcher*.

Sumber kebenaran produk: **[`docs/PRD.md`](docs/PRD.md)** (v1.6) — *apa* yang dibangun & *mengapa*;
keputusan mengikat ada di **§9 Decision Log** (rujuk sebagai `D1`–`D27`). Sistem desain:
**[`docs/DESIGN.md`](docs/DESIGN.md)** ("Premium Calm Enterprise"). Status implementasi tiap fitur:
**[`docs/PROGRESS.md`](docs/PROGRESS.md)** (perbarui pada commit yang sama saat status berubah).

Bahasa: tulis komentar, pesan UI, copy, dan dokumentasi dalam **Bahasa Indonesia**. Nama kode
(variabel, fungsi, tipe, file) tetap **Bahasa Inggris**.

## ⚠️ Realita vs target PRD (baca dulu)

PRD mendesain stack ideal **Supabase + bun + TanStack Router + shadcn/ui + Edge Functions / Cron /
Queues / Vault**. Frontend kini **sudah selaras** dengan target (bun, TanStack Router, RHF + Zod,
fondasi shadcn); yang masih ramping hanyalah **backend** karena tak bisa di-provision di environment ini:

| Aspek | Sekarang | Target PRD |
|---|---|---|
| Data/backend | **Dual-mode**: Supabase bila env terisi (`supabase/migrations` + `src/lib/supabase.ts`, RLS permissive, **auth ditunda**), selain itu fallback **mock in-memory** (`src/data/store.ts` + `seed.ts`) | Supabase (Postgres + RLS + **Auth** + Edge Functions) |
| Router | **TanStack Router** (code-based di `main.tsx`, typed search params via Zod) | ✅ tercapai |
| Package manager | **bun** (`bun.lockb`) | ✅ tercapai |
| Form/validasi | **react-hook-form + Zod** (schema di `features/*/validation/`) | ✅ tercapai |
| Styling | Tailwind v4 `@theme` (`src/index.css`) + fondasi shadcn (`components.json`, `cn`) | komponen shadcn diadopsi per-kebutuhan (token dipetakan ke `@theme`) |

Saat membangun fitur: ikuti **layering & konvensi target**, tandai jelas mana yang **sudah ada**
vs **⚠️ target**. Invariant kritis kini **DB-enforced di Supabase** (generated column severity/level,
gate ACCEPT & incident-close, trigger audit & auto-advance review) **dan** tetap ditiru di mock store
sebagai fallback. Yang masih **⚠️ target**: **Auth** (sementara pakai `currentUserId` mock; RLS masih
permissive) dan Edge Functions/Cron/Vault. Jangan menambah dependency baru tanpa konfirmasi user.

**Mengaktifkan Supabase:** salin `.env.example` → `.env`, isi `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`;
`supabase db push` (terapkan `supabase/migrations/`) + `supabase db reset` (seed). Tanpa env, app
otomatis fallback ke mock. Wiring: DI hook tiap fitur (`use<Name>Repository`) memilih
`*RemoteDataSource` vs `*MockDataSource` via `isSupabaseConfigured`; halaman berbasis store
(dashboard/audit/reports/switcher) dihidrasi dari DB oleh `RemoteHydrationGate` (`src/data/remote.ts`).

## Baca dulu sebelum bekerja

Muat file ini saat relevan dengan tugas. Semua guideline ada di `.claude/guidelines/`.

| Tugas | Baca |
|---|---|
| Arsitektur, layer, dependency rule, repository+DI, state | [.claude/guidelines/architecture.md](.claude/guidelines/architecture.md) |
| Konvensi & guardrail (query-key, store, routing, multi-tenant, error, format) + checklist reviewer | [.claude/guidelines/conventions.md](.claude/guidelines/conventions.md) |
| Konvensi penulisan kode (penamaan, TS strict, React, styling, keamanan) | [.claude/guidelines/coding-rules.md](.claude/guidelines/coding-rules.md) |
| Struktur folder & cara bikin/ubah fitur | [.claude/guidelines/frontend-structure.md](.claude/guidelines/frontend-structure.md) |
| Dokumentasi per fitur (template + contoh `risks`) | [docs/_TEMPLATE.md](docs/_TEMPLATE.md) · [docs/features/risks.md](docs/features/risks.md) |
| Design system & token | [.claude/guidelines/design-system.md](.claude/guidelines/design-system.md) |
| Menulis/ubah test | [.claude/guidelines/testing.md](.claude/guidelines/testing.md) |
| Refactor fitur ke arsitektur target | [.claude/guidelines/refactoring-feature.md](.claude/guidelines/refactoring-feature.md) |
| Review kode | [.claude/guidelines/code-review.md](.claude/guidelines/code-review.md) |
| Menulis dokumentasi | [.claude/guidelines/technical-writing.md](.claude/guidelines/technical-writing.md) |
| Commit & push | [.claude/guidelines/git-commit.md](.claude/guidelines/git-commit.md) |

## Aturan inti (selalu berlaku)

1. **Clean Architecture feature-sliced** — `presentation → domain ← data`. `presentation` **tak boleh**
   import `data` langsung; `domain` polos (tanpa React/UI/Supabase); `data` mengimplementasikan
   interface `I<Name>Repository` milik `domain`. Akses data dari UI hanya lewat repository `domain`.
2. **Entity = `type` + pure function, BUKAN class** — agar serializable & menjaga structural sharing
   TanStack Query. Lihat `src/lib/risk.ts` & `src/data/types.ts`.
3. **Logika kanonik satu sumber:** severity → level lewat `@/lib/risk` (`computeRiskLevel`, D4); di
   produksi di-mirror sebagai generated column / IMMUTABLE function Postgres (D22).
4. **State sesuai jenisnya:** server state → **TanStack Query** (query-key via factory, sertakan tenant
   aktif); UI/client state global → **Zustand** (selector + `useShallow`); form → **react-hook-form +
   Zod**; lokal → `useState`/`useReducer`.
5. **Multi-tenant:** semua data di-scope **perusahaan aktif**; jangan bocorkan antar tenant. Cek peran di
   UI (`can()`/`myRoles()`) **hanya UX** — otorisasi sebenarnya = RLS Postgres (target, NFR-02).
6. **Path alias tunggal `@/* → src/*`** (sinkron di `vite.config.ts` & `tsconfig.app.json`). Pakai
   `@/...`, bukan `../../../..`.
7. **Design token, jangan hardcode** warna/spacing/font — pakai utility Tailwind `@theme` di
   `src/index.css` (`bg-primary`, `text-risk-extreme`, `gap-md`). Level risiko **tidak hanya warna**:
   sertakan label + skor (NFR-09, kontras WCAG AA).
8. **Uang = integer Rupiah penuh**, tak pernah float — format via `@/lib/format` (`idr`, `idrCompact`);
   tanggal via `fmtDate`/`relativeDays` (locale `id-ID`).
9. **Validasi input eksternal & form dengan Zod** sebelum dipakai (form, search param, respons).
10. **Jangan pernah commit secret.** Konfig publik klien lewat env `VITE_*`; service-role key & API key
    LLM/email **tidak boleh di client** — hanya di Supabase Vault → Edge Function (target, D20).
11. **Jaga dokumentasi `.md` tetap sinkron.** Saat mengubah struktur folder, penamaan/alias, stack,
    atau perintah, perbarui semua `.md` terdampak pada perubahan yang sama (`CLAUDE.md`,
    `.claude/guidelines/*.md`, `README.md`). Verifikasi ke kode/`package.json`. Jangan tinggalkan docs basi.

## Jangan lakukan

- **Jangan tambah library baru tanpa konfirmasi user.** Cek `package.json` dulu; bila butuh lib target
  yang belum terpasang (mis. `@supabase/supabase-js`), ingatkan user untuk meng-install. Pin versi
  exact (`bun add --exact`) untuk lib baru.
- **Jangan langgar dependency rule** (Aturan inti #1) — `presentation` tak import `data`.
- **Jangan fetch/side-effect di komponen.** Server state lewat TanStack Query hook; side-effect lain
  lewat action Zustand atau custom hook — bukan `useEffect` + fetch manual.
- **Jangan class entity** dengan getter, **jangan use-case kosong** (passthrough), **jangan hardcode hex**.
- **Jangan menulis seolah Supabase sudah ada** — tandai bagian backend sebagai ⚠️ target.

## Struktur

```
src/
  data/        # types.ts · seed.ts · store.ts (Zustand mock — pengganti repository Supabase)
  lib/         # risk.ts (computeRiskLevel kanonik, D4) · format.ts (IDR integer, locale id-ID)
  components/  # AppShell · Sidebar · Topbar · RiskBadge · Heatmap · NewRiskModal · ui.tsx (primitif)
  features/    # risks (acuan: domain/data/presentation penuh) · onboarding · dashboard · incidents · compliance · reports · audit
  main.tsx     # TanStack Router (code-based) — pertahankan path yang ada (/dashboard, /risks/$riskId, …)
  index.css    # Tailwind v4 @theme — semua design token
```

> Detail per layer fitur (`domain`/`data`/`presentation`): [frontend-structure.md](.claude/guidelines/frontend-structure.md).
> Halaman yang sudah ada & pemetaannya ke PRD: lihat [README.md](README.md).

## Perintah

```bash
bun install
bun run dev        # http://localhost:5173
bun run build      # tsc -b && vite build
bun run typecheck  # tsc -b --noEmit
bun run preview
```

**Gate sebelum selesai:** `bun run typecheck`, `bun run build`, `bun run lint`, **dan** `bun run test`
harus hijau — laporkan apa adanya bila gagal. Vitest + ESLint (flat config) + Prettier sudah
dikonfigurasi. **Playwright E2E & pgTAP RLS test** (NFR-12) masih target — belum ada spec.

## Alat bantu (Claude Code)

- Slash command **`/new-feature`** — scaffold fitur baru sesuai arsitektur target (`.claude/commands/new-feature.md`).
- Subagent **`code-reviewer`** — review diff terhadap checklist (`.claude/agents/code-reviewer.md`).
- Subagent **`technical-writer`** — menulis/merapikan dokumentasi (`.claude/agents/technical-writer.md`).
