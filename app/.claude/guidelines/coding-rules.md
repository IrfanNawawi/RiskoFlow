# Coding Rules — Konvensi Penulisan Kode

Aturan menulis kode RiskoFlow (web SPA — React 19 + TypeScript strict + Vite). Tujuan: konsisten,
mudah dibaca, aman. Ikuti arsitektur target di [architecture.md](architecture.md).

## Bahasa

- **Kode** (variabel, fungsi, tipe, file): Bahasa Inggris.
- **Komentar, pesan error UI, copy, dokumentasi**: Bahasa Indonesia.
- Komentar menjelaskan *kenapa*, bukan *apa*.

## Penamaan

| Hal | Gaya | Contoh |
|---|---|---|
| Komponen | PascalCase | `RiskBadge` |
| File komponen | `<Name>.tsx` | `RiskBadge.tsx` |
| File page | `<Name>Page.tsx` | `DashboardPage.tsx` |
| File entity (`type` + pure fn) | `<name>.entity.ts` / `types.ts` | `risk.entity.ts` |
| Use-case (dinamis) | `<verb><Name>.usecase.ts` | `approveTreatment.usecase.ts` |
| Interface repo | `I<Name>Repository.ts` | `IRiskRepository.ts` |
| Impl repo | `<name>.repository.ts` | `risk.repository.ts` |
| Hook | `use<Thing>` | `useRisks` |
| Zustand store | `use<Thing>Store` / `useStore` | `useStore` |
| Zod schema | `<thing>.schema.ts` / `<thing>Schema` | `newRisk.schema.ts` |
| Query key | array konstan via factory | `riskKeys.list(filter)` |
| Variabel/fungsi | camelCase | `activeRisks`, `isLoading` |
| Konstanta global | UPPER_SNAKE_CASE | `PAGE_SIZE` |

## TypeScript

- `strict` aktif untuk seluruh `src` ([tsconfig.app.json](../../tsconfig.app.json)) — pertahankan.
  `noUnusedLocals` & `noUnusedParameters` menyala: jangan tinggalkan import/variabel mati.
- **Hindari `any`.** Bila tipe tak diketahui, pakai `unknown` lalu narrow.
- `verbatimModuleSyntax` aktif → **wajib `import type { ... }`** untuk import yang hanya tipe.
- Objek immutable pakai `readonly` / `as const`.
- Hindari non-null `!` kecuali sudah ada guard. Jangan `// @ts-ignore`; pakai
  `// @ts-expect-error` + alasan bila terpaksa.

## React

- Komponen fungsional + hooks. Tidak ada class component.
- **Entity = `type` + pure function, BUKAN class** (alasan di
  [architecture.md](architecture.md#entity--type--pure-function-bukan-class)).
- Bungkus callback ke child list dengan `useCallback`; nilai mahal dengan `useMemo`. Jangan over-memo
  (mis. `categoryData`/`topRisks` di [DashboardPage.tsx](../../src/features/dashboard/DashboardPage.tsx)).
- `key` pada list pakai id stabil, **bukan** index.
- Logika turunan dari data → pure function di `@/lib` atau `domain`, bukan di JSX.

## Styling (Tailwind + token)

- **Jangan hardcode** warna/spacing/font. Pakai utility yang memetakan ke `@theme` token di
  [src/index.css](../../src/index.css): `bg-primary`, `text-on-surface`, `text-risk-extreme`,
  `border-border-hairline`, `gap-md`, dst.
- Warna chart/level yang harus dinamis boleh pakai CSS variable
  (`var(--color-risk-high)`) — itu tetap satu sumber token, bukan hex liar.
- Komponen UI reusable → [src/components/ui.tsx](../../src/components/ui.tsx); cek dulu sebelum
  membuat yang baru. Komponen kompleks ikut pola **shadcn/ui** (Radix) demi a11y bawaan.
- Kontras **WCAG AA**; level risiko **tidak hanya warna** — sertakan label + skor (NFR-09).

## State & data

- **Server state** lewat TanStack Query (`useQuery`/`useMutation`) — bukan `useEffect` + fetch manual.
- **Client/UI state global** lewat **Zustand** (store granular, akses via **selector**;
  pakai `useShallow` untuk hasil turunan agar re-render minimal).
- **Form** lewat react-hook-form + `zodResolver`. **Validasi** input eksternal/form dengan **Zod**.
- **Mata uang = integer Rupiah**, tidak pernah float (PRD). Format via `@/lib/format`
  (`idr`, `idrCompact`), jangan format manual.

## Import

- Urutan: (1) lib eksternal, (2) alias `@/...`, (3) relatif `./`.
- Pakai path alias `@/`, bukan `../../../..`. Hormati dependency rule
  (lihat [frontend-structure.md](frontend-structure.md)).

## Error handling

- `domain`/`data` melempar `Error` dengan pesan jelas (Bahasa Indonesia bila tampil ke user).
- Tangani error server state lewat TanStack Query (`isError`/`error`), bukan `try/catch` di komponen.
- Jangan telan error diam-diam (`catch {}` kosong). Sediakan **error state** UI (PRD FR-DASH-6, NFR-07).

## Keamanan (wajib)

- **Tidak ada secret di kode/commit.** Konfig publik klien lewat env `VITE_*`
  (mis. `VITE_SUPABASE_URL`, anon key). **Service-role key / API key LLM & email TIDAK boleh di
  client** — hanya di **Supabase Vault**, diakses dari Edge Function (PRD NFR-01, D20).
- Jangan log token, PII, atau respons sensitif.
- **RLS adalah garis pertahanan utama**, bukan UI. Pengecekan peran di UI (mis. `can()` di store)
  hanya UX; otorisasi sesungguhnya ditegakkan di Postgres RLS/policy (NFR-02).
- Validasi semua input eksternal (form, respons API, search param) dengan Zod sebelum dipakai.

## Format & lint

- **Saat ini** gate yang tersedia: `npm run typecheck` dan `npm run build`. Jalankan sebelum selesai.
- ESLint + Prettier adalah **target PRD (NFR-11)** dan belum dikonfigurasi — saat ditambahkan,
  jadikan sumber kebenaran format dan tambahkan `npm run lint` ke gate.
- Jangan reformat file yang tak Anda sentuh (hindari diff besar tak relevan).

## Dependency

- **Pin versi exact** untuk library baru — tulis `"5.4.0"`, **bukan** `"^5.4.0"`/`"~5.4.0"`.
- Tambah dependency baru hanya setelah **konfirmasi user**; cek dulu di
  [package.json](../../package.json). Package manager = **npm** (`package-lock.json`).

## Yang harus dihindari

- File raksasa: pecah komponen/hook bila > ~200 baris atau punya >1 tanggung jawab.
- Logika bisnis di dalam JSX/page — pindahkan ke hook/use-case/pure function.
- **Class entity** dengan getter — pakai `type` + pure function.
- **Use-case kosong** yang cuma meneruskan panggilan — buat use-case hanya saat ada business logic.
- Hardcode hex warna / nama font di komponen.
- Menambah dependency baru tanpa konfirmasi user.
