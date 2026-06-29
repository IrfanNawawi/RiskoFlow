# Konvensi & Guardrail

Konvensi konkret untuk kode RiskoFlow agar konsisten lintas fitur & cache/re-render terkendali
saat fitur bertambah. Lengkapi [architecture.md](architecture.md) (aturan layer) dan
[coding-rules.md](coding-rules.md) (gaya kode).

---

## 1. Query key (TanStack Query)

Pola: **`['<fitur>', '<resource>', ...deps]`**. Tiap fitur punya factory key sendiri — jangan
tulis array key mentah ad-hoc di komponen.

```typescript
// features/risks/presentation/queries/keys.ts
export const riskKeys = {
  all: ["risks"] as const,
  list: (filter: RiskListQuery) => ["risks", "list", filter] as const,
  detail: (id: string) => ["risks", "detail", id] as const,
};
```

- Semua `deps` yang mempengaruhi hasil **wajib** masuk key (filter, id, perusahaan aktif).
- Karena data di-scope per perusahaan, **sertakan `activeCompanyId`** pada key bila relevan
  agar cache tidak bocor antar tenant.
- Invalidasi terarah: `queryClient.invalidateQueries({ queryKey: riskKeys.all })`.

## 2. Store Zustand

- **Granular per domain**, bukan satu store raksasa untuk segala hal. Store global lintas-fitur
  (sesi/perusahaan aktif) terpusat; state milik satu fitur → store fitur tersebut.
- **Selektor** untuk baca state, dan `useShallow` untuk hasil turunan (array/obyek) supaya
  re-render hanya saat irisan yang dipakai berubah — pola yang sudah dipakai di
  [DashboardPage.tsx](../../src/features/dashboard/DashboardPage.tsx). Hindari ambil seluruh state.
- Action yang memutasi state ada di dalam store; komponen memanggil action, bukan menyetel state mentah.
- Hanya **UI/client state global**. Server state → TanStack Query; form → RHF+Zod; lokal → `useState`.

> Catatan: `src/data/store.ts` saat ini menampung **mock data + selektor + mutator** sekaligus
> (pengganti backend sementara). Saat Supabase masuk, server state pindah ke TanStack Query dan
> store menyisakan UI state (perusahaan aktif, sesi, filter).

## 3. Routing & navigasi

- Route didaftarkan di [main.tsx](../../src/main.tsx) (`react-router-dom`). **Pertahankan path
  yang sudah ada** (`/dashboard`, `/risks/:riskId`, …) agar `<Link>` internal tak putus.
- Navigasi terprogram lewat `useNavigate`; jangan manipulasi `window.location` langsung.
- Filter daftar → **typed URL search params** (target TanStack Router, FR-RISK-2) agar
  shareable & bookmarkable.

## 4. Otorisasi & multi-tenant

- Semua data di-scope ke **perusahaan aktif**. Selektor `active*()` di store sudah menyaring per
  `activeCompanyId` — ikuti pola itu; jangan tampilkan data lintas tenant.
- Cek peran di UI (`can()`/`myRoles()`) hanya untuk **UX** (sembunyikan tombol). Otorisasi
  sebenarnya = **RLS/policy Postgres** (NFR-02). Jangan pernah andalkan UI sebagai gate keamanan.

## 5. Error API → pesan Bahasa Indonesia

- Map error di boundary `data` menjadi `Error` berpesan **Bahasa Indonesia** yang aman ditampilkan;
  jangan bocorkan detail teknis/PII. Komponen menampilkan via state `isError`/`error` TanStack Query.
- Sediakan tiga state UI untuk data: **loading (skeleton)**, **empty state**, **error** (FR-DASH-6).

## 6. Format angka & tanggal

- Mata uang **integer IDR** lewat `@/lib/format` (`idr`, `idrCompact`) — jangan format manual/float.
- Tanggal lewat `fmtDate`/`fmtDateTime`/`relativeDays` (`@/lib/format`), locale `id-ID`.

---

## Checklist reviewer

- [ ] **Layer:** `presentation` tak import `data`; `domain` tanpa dependency React/UI/Supabase.
- [ ] **Query key:** lewat factory; semua `deps` (termasuk tenant) masuk key.
- [ ] **Store:** granular + baca via selektor/`useShallow`; hanya client-state global.
- [ ] **State sesuai jenis:** server→Query, global UI→Zustand, form→RHF+Zod, lokal→useState.
- [ ] **Multi-tenant:** data di-scope perusahaan aktif; tak ada kebocoran antar tenant.
- [ ] **Keamanan:** tak ada secret/service-key di client; otorisasi nyata di RLS, bukan UI.
- [ ] **Validasi:** input eksternal (form, respons, search param) divalidasi Zod.
- [ ] **Token desain:** dari Tailwind `@theme`; tak ada hardcode warna/spacing/font.
- [ ] **a11y:** level risiko pakai label + skor (bukan hanya warna); kontras AA; elemen interaktif beraksesibilitas.
- [ ] **Gate:** `npm run typecheck` & `npm run build` hijau (`npm run lint`/`test` saat tersedia).
