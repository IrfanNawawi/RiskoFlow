# Feature Workflow — Membangun & Merapikan Fitur

Aturan membangun fitur baru atau merapikan fitur yang ada ke arsitektur target
**Clean Architecture + TanStack Query + Zustand + Zod + react-hook-form** di `src/features/`.
Slash command `/refactoring-feature <nama>` menjalankan langkah ini.

> RiskoFlow adalah proyek baru — **tidak ada legacy Redux/Saga** yang perlu di-strangle.
> "Refactor" di sini berarti memindahkan logika ke layer yang benar (memisahkan UI dari data/
> business logic), bukan migrasi besar antar-framework.

## Prinsip wajib

- **Inkremental.** Satu fitur per PR. Jangan refactor massal lintas fitur sekaligus.
- **Jaga paritas perilaku.** Saat merapikan fitur yang sudah jalan, UI/UX & perilaku **tidak
  berubah** kecuali memang diminta; yang berubah hanya struktur internal. Bila sebuah perubahan
  mengubah tampilan/flow, itu **fitur baru** — pisahkan & konfirmasi ke user.
- **Dependency rule.** `domain` murni (tanpa React/Supabase/UI); `presentation` tidak import
  `data` langsung (wiring via hook DI). Lihat [architecture.md](architecture.md).
- **Entity = `type` + pure function** (bukan class). **Use-case dinamis** — hanya saat ada
  business logic nyata. **Repository + DI** untuk akses data.
- **State sesuai jenis.** Server → TanStack Query; UI global → Zustand (selector); form →
  react-hook-form + Zod; lokal → `useState`.
- **Token desain.** Pakai Tailwind `@theme` token; jangan hardcode hex/px. Level risiko punya
  label + skor (a11y, NFR-09).
- **Multi-tenant & keamanan.** Data di-scope perusahaan aktif; otorisasi nyata di RLS bukan UI;
  tak ada secret di client. Validasi input eksternal dengan Zod.

## Pemetaan "kurang rapi" → target

| Pola kurang rapi | Target |
|---|---|
| `useEffect` + fetch manual untuk server state | `useQuery`/`useMutation` (TanStack Query) |
| State server disimpan di `useState`/Zustand | TanStack Query (cache + invalidation) |
| Komponen memanggil sumber data langsung | repository + DI hook |
| Validasi form manual / ad-hoc | react-hook-form + `zodResolver` (`validation/*.schema.ts`) |
| Logika bisnis di dalam JSX | pure function (`@/lib`/`domain`) atau use-case |
| Hex/px hardcode di komponen | Tailwind `@theme` token |
| Tipe `any` / DTO mentah dipakai di UI | entity domain (mapper + Zod) |

## Langkah

1. **Petakan fitur.** Catat page/komponen, sumber data (kini `@/data/store` mock; target
   Supabase repository), dan endpoint/tabel terkait. Klasifikasikan tiap state: server (→ Query),
   global (→ Zustand), form (→ RHF+Zod), lokal (→ useState). Konfirmasi lingkup bila belum jelas.
2. **Siapkan folder** `src/features/<f>/` sesuai
   [frontend-structure.md §2](frontend-structure.md#2-struktur-folder) — **tambah layer seperlunya**,
   jangan buat folder kosong.
3. **Bangun layer (dinamis):** entity (`type` + pure fn) → repository interface → datasource +
   DTO → mapper (validasi Zod) → repository impl → use-case **bila ada business logic** → hook
   (DI + query) → store/validation bila perlu → komponen → page → `index.ts`.
4. **Rakit UI** dengan komponen `@/components/ui` + token; sediakan state **loading/empty/error**
   (FR-DASH-6). Pastikan **responsif** (mobile → `lg`) dan **a11y** (label + skor, `aria-label`).
5. **Pasang route** di [main.tsx](../../src/main.tsx) bila page baru; pertahankan path yang ada.
6. **Tulis skenario testing** per layer (lihat [testing.md](testing.md)) — walau runner belum ada.
7. **Verifikasi & lapor.** `npm run typecheck` + `npm run build` hijau + verifikasi manual di
   browser (`npm run dev`). Laporkan apa adanya: file dibuat/diubah/dihapus & langkah yang
   masih perlu user lakukan.

## Definition of Done per fitur

- [ ] State dipetakan ke Query/Zustand/RHF+Zod/lokal sesuai jenisnya.
- [ ] Dependency rule tidak dilanggar; DTO tidak bocor (mapper + Zod saat data layer nyata).
- [ ] Entity = `type` + pure function; tidak ada class entity.
- [ ] Use-case hanya untuk business logic nyata; sisanya hook → repository.
- [ ] UI pakai token Tailwind; ada state loading/empty/error; **responsif**; **a11y** (label+skor, kontras AA).
- [ ] **Multi-tenant**: data di-scope perusahaan aktif; **keamanan**: tak ada secret di client,
  otorisasi mengandalkan RLS, input divalidasi Zod.
- [ ] Paritas perilaku terjaga bila merapikan fitur lama (tampilan/flow tak bergeser tanpa diminta).
- [ ] Skenario testing ditulis (lihat [testing.md](testing.md)).
- [ ] `npm run typecheck` & `npm run build` hijau.
