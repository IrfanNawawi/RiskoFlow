# Code Review — Checklist

Checklist review diff RiskoFlow (web SPA). Dipakai juga oleh subagent `code-reviewer`.
Fokus pada hal penting; jangan rewel soal selera yang nantinya diatur Prettier/ESLint.

## Cara review

1. Pahami tujuan perubahan dulu (baca deskripsi/PR/commit).
2. Telusuri diff per file. Catat temuan dengan **severity** + **lokasi `file:line`** + **saran konkret**.
3. Bedakan **🔴 blocker** (harus diperbaiki), **🟠 sebaiknya**, **🟢 nit/opsional**.
4. Jika ragu apakah sesuatu bug, katakan ragu — jangan mengarang kepastian.

## Arsitektur & dependency rule

- [ ] Kode fitur ada di `src/features/<f>/` dengan layer yang benar (lihat [frontend-structure.md](frontend-structure.md)).
- [ ] `domain` tidak import dari `data`/`presentation`/framework (React/Supabase/UI).
- [ ] `presentation` tidak import `data` langsung (wiring via hook DI).
- [ ] DTO tidak bocor ke `presentation` — ada mapper DTO → entity + validasi Zod (saat data layer nyata).
- [ ] **Entity = `type` + pure function**, bukan class dengan getter.
- [ ] **Use-case hanya bila ada business logic** — tidak ada use-case kosong/passthrough.

## State & data

- [ ] Server state lewat TanStack Query (bukan `useEffect` + fetch manual).
- [ ] Client/UI state global lewat Zustand (store granular, akses via selector/`useShallow`).
- [ ] Form lewat react-hook-form + `zodResolver`; input eksternal (form/respons/search param) divalidasi Zod.
- [ ] `queryKey` benar (semua deps + tenant masuk); invalidation tepat; tak ada race condition.

## Korektitas

- [ ] Logika sesuai maksud; cek off-by-one, kondisi batas, `null`/`undefined`.
- [ ] `async`/`await` benar; promise tidak menggantung; error tidak ditelan.
- [ ] State update tidak memicu render loop; dependency array hook benar.
- [ ] Nilai finansial = **integer IDR** (tak ada float); format lewat `@/lib/format`.

## TypeScript & kualitas

- [ ] Tidak ada `any` baru / `@ts-ignore` tanpa alasan; pakai `unknown` + narrow.
- [ ] `import type` untuk tipe (wajib — `verbatimModuleSyntax`); tak ada non-null `!` tanpa guard.
- [ ] Tidak ada import/variabel mati (`noUnusedLocals`/`noUnusedParameters` menyala).
- [ ] Tidak ada duplikasi yang bisa direuse; komponen/fungsi tidak kebanyakan tanggung jawab.
- [ ] Penamaan sesuai [coding-rules.md](coding-rules.md).

## React & UI

- [ ] `key` list pakai id stabil (bukan index).
- [ ] `useCallback`/`useMemo` dipakai tepat (tidak kurang, tidak berlebihan).
- [ ] Styling via token Tailwind (`@theme`)/`@/components/ui`, **bukan hex/px hardcode**.
- [ ] **Responsif**: grid/komponen tidak pecah di mobile maupun desktop; tak ada overflow.
- [ ] **a11y**: level risiko pakai label + skor (bukan hanya warna); ikon-only punya `aria-label`; kontras AA.

## Performa

- [ ] Page route baru di-`lazyRouteComponent` (code splitting) di [main.tsx](../../src/main.tsx); tidak menambah import berat ke entry/eager chunk.
- [ ] Lib berat (mis. `recharts`) tidak diimpor di modul yang selalu dimuat; biarkan masuk chunk `charts`/lazy.
- [ ] Tidak ada pekerjaan mahal di render (loop besar/clone) tanpa `useMemo`; list panjang tidak re-render seluruhnya.

## Multi-tenant & keamanan (prioritas tinggi)

- [ ] **Tidak ada secret/service-role key/API key** di diff; konfig publik hanya `VITE_*` (anon key).
- [ ] Tidak ada log PII/token/respons sensitif.
- [ ] Data di-scope **perusahaan aktif**; tak ada kebocoran antar tenant; key cache menyertakan tenant.
- [ ] Otorisasi nyata mengandalkan **RLS/policy**, bukan sekadar UI (`can()` hanya UX).
- [ ] Akses data lewat repository/layer, bukan komponen memanggil Supabase client langsung.

## Test (Vitest sudah terpasang)

- [ ] Logika baru (use-case, mapper, schema, pure function) punya test unit — `bun run test` hijau.
- [ ] Edge case tercakup (null, data rusak, error path, empty state).
- [ ] Mapper/validasi: kasus DTO rusak → `null`/ditolak ada di test (lihat [testing.md](testing.md)).

## Dokumentasi (sinkron pada commit yang sama)

- [ ] Fitur baru/refactor: `docs/features/<fitur>.md` (dari [_TEMPLATE.md](../../docs/_TEMPLATE.md)) dibuat/diperbarui.
- [ ] Perubahan status fitur tercermin di [PROGRESS.md](../../docs/PROGRESS.md).
- [ ] Ubah stack/alias/perintah/arsitektur → guideline `.claude/guidelines/` diperbarui (tak ada path mati).

## Dependency

- [ ] Tidak ada dependency baru tanpa justifikasi/konfirmasi; versi **di-pin exact**.
- [ ] Lib yang di-import benar-benar ada di [package.json](../../package.json).

## Gate

- [ ] `bun run typecheck`, `bun run lint`, `bun run test`, & `bun run build` semuanya hijau.

## Format output review

```
🔴 [src/features/risks/data/mappers/risk.mapper.ts:42] DTO bocor ke presentation.
   Page meng-import RiskDTO langsung — seharusnya entity Risk.
   Saran: kembalikan hasil mapper, jangan teruskan DTO.
```

Tutup dengan ringkasan: jumlah blocker/sebaiknya/nit, dan rekomendasi (layak merge / perlu
perbaikan). Jika tidak ada blocker, katakan jelas.
