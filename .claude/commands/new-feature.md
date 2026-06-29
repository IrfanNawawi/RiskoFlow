---
description: Implementasi fitur baru ke Clean Architecture + TanStack Query + Zustand + Zod di src/features
argument-hint: <nama-fitur> (mis. risks, incidents, compliance, dashboard, onboarding)
---

## Tugas

Implementasikan **fitur baru** `$ARGUMENTS` di `src/features/$ARGUMENTS/` mengikuti arsitektur
target proyek: **Clean Architecture + TanStack Query + Zustand + Zod + react-hook-form**.

> Fokus command ini adalah membangun fitur dari nol. Untuk merapikan fitur lama tanpa mengubah
> perilaku, gunakan command/guideline refactoring.

## Bacaan wajib (baca sebelum mulai)

- `.claude/guidelines/refactoring-feature.md` — prinsip wajib, tabel pemetaan, langkah 1–7, dan
  Definition of Done (berlaku juga untuk fitur baru).
- `.claude/guidelines/frontend-structure.md` — struktur folder & layer per fitur.
- `.claude/guidelines/architecture.md` — dependency rule (`domain` murni, `presentation` tak
  import `data` langsung).
- `.claude/guidelines/coding-rules.md` & `.claude/guidelines/design-system.md` — konvensi kode &
  token desain.

## Sebelum mulai

1. **Tetapkan lingkup.** Petakan requirement di `PRD.md` (`FR-*`) untuk `$ARGUMENTS`: page apa
   yang dibuat, data apa yang dibutuhkan, dan tabel/entitas terkait.
2. **Klasifikasi state** sejak awal: server (→ TanStack Query), UI global (→ Zustand), form
   (→ react-hook-form + Zod), lokal (→ `useState`).
3. **Konfirmasi singkat ke user** bila lingkup, sumber data, atau alur belum jelas — jangan
   menebak requirement.

## Langkah implementasi

1. **Siapkan folder** `src/features/$ARGUMENTS/` sesuai frontend-structure — tambah layer
   seperlunya, jangan buat folder kosong.
2. **Bangun layer (dari dalam ke luar):** entity (`type` + pure function) → repository interface →
   datasource + DTO → mapper (validasi Zod) → repository impl → use-case **bila ada business
   logic nyata** → hook (DI + query/mutation) → store/validation bila perlu → komponen → page →
   `index.ts`.
3. **Rakit UI** dengan komponen `@/components/ui` + token Tailwind `@theme` (jangan hardcode
   hex/px). Sediakan state **loading/empty/error**.
4. **Pasang route** di `src/main.tsx` untuk page baru.
5. **Sumber data:** kini `@/data/store` (mock), target Supabase repository. Data di-scope
   perusahaan aktif (multi-tenant); validasi input eksternal dengan Zod; tak ada secret di client.

## Definition of Done

- State dipetakan ke Query/Zustand/RHF+Zod/lokal sesuai jenisnya.
- Dependency rule tidak dilanggar; DTO tidak bocor ke UI (mapper + Zod).
- Entity = `type` + pure function; use-case hanya untuk business logic nyata.
- UI pakai token desain; ada state loading/empty/error; **responsif** (mobile → `lg`) & **a11y**
  (level risiko = label + skor, `aria-label`, kontras AA).
- Skenario testing per layer ditulis (lihat `.claude/guidelines/testing.md`), walau runner belum ada.
- `npm run typecheck` & `npm run build` hijau, lalu verifikasi manual di browser (`npm run dev`).
- **Laporkan apa adanya:** file dibuat/diubah/dihapus & langkah yang masih perlu user lakukan.
