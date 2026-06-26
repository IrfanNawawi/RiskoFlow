# Technical Writing — Panduan Dokumentasi

Cara menulis dokumentasi RiskoFlow (guideline `.claude/`, README, doc fitur, komentar penting).
Dipakai juga oleh subagent `technical-writer`.

## Prinsip

1. **Akurat di atas segalanya.** Jangan tulis API/path/lib yang tidak ada. Verifikasi ke kode &
   [package.json](../../package.json) dulu. Bedakan jelas mana yang **sudah ada** (TanStack
   Router/Query, RHF+Zod, Vitest/ESLint/Prettier, mock store) vs **target** (tandai "⚠️ target" /
   "⛔ belum dibuat"). Yang masih target: **Supabase, Edge Functions, Cron/Queues, Playwright/pgTAP,
   AI & notifikasi** — jangan tulis seolah sudah jadi. Status terkini per fitur: [PROGRESS.md](../../docs/PROGRESS.md).
2. **Ringkas.** Satu dokumen = satu tujuan. Pembaca developer yang sibuk.
3. **Contoh nyata.** Ambil dari kode yang benar-benar ada (mis. `@/lib/risk`, `@/components/ui`).
   Jika contoh menggambarkan pola target, **tandai sebagai ilustrasi**.
4. **Bisa langsung dipakai.** Pembaca harus bisa menyalin dan menjalankan.

## Bahasa & gaya

- Prosa & penjelasan: **Bahasa Indonesia**. Identifier kode tetap Inggris.
- Kalimat aktif, langsung. Hindari kata pengisi.
- Konsisten istilah dengan kode & guideline: entity, repository, use-case, datasource, mapper,
  store (Zustand), query (TanStack), schema (Zod), token (Tailwind `@theme`).

## Struktur dokumen

- Mulai dengan satu kalimat "dokumen ini tentang apa".
- Heading deskriptif, hierarki dangkal (maks 3 level).
- **Tabel** untuk pemetaan (token → nilai, layer → tanggung jawab).
- **Blok kode** berlabel bahasa (` ```tsx ` / ` ```typescript ` / ` ```bash `).
- Checklist untuk Definition of Done / langkah.

## Larangan

- ❌ Jangan tempel mentah output chat ("I'll build…", "Here's…"). Tulis sebagai dokumen.
- ❌ Jangan cantumkan secret/API key — pakai placeholder (`<YOUR_SUPABASE_ANON_KEY>`).
- ❌ Jangan dokumentasikan rencana yang belum dibangun seolah sudah jadi. Tandai status.
- ❌ Jangan duplikasi: bila info sudah ada di guideline lain, **tautkan**, jangan salin.

## Referensi file

Pakai link Markdown relatif agar bisa diklik:

```markdown
Lihat [risk.ts](../../src/lib/risk.ts) dan [types.ts](../../src/data/types.ts).
```

## Lokasi dokumen

| Jenis | Lokasi |
|---|---|
| Aturan Claude & guideline (arsitektur, design system, dst) | `.claude/guidelines/` |
| Sumber kebenaran produk (apa & kenapa) | [`PRD.md`](../../docs/PRD.md) (`app/docs/`) |
| Status implementasi per fitur | [`PROGRESS.md`](../../docs/PROGRESS.md) (`app/docs/`) |
| Sistem desain & token | [`DESIGN.md`](../../docs/DESIGN.md) (`app/docs/`) |
| Template doc fitur | [`_TEMPLATE.md`](../../docs/_TEMPLATE.md) (`app/docs/`) |
| Dokumentasi per fitur (bila dibuat) | `docs/features/<feature>.md` (contoh: [`risks.md`](../../docs/features/risks.md)) |
| Setup, build, rilis | [`README.md`](../../README.md) |

> Dokumen produk (`PRD.md`, `DESIGN.md`, `PRD-RULE.md`, `PRD-TEMPLATE.md`) ada di `app/docs/`.
> Bila membuat doc fitur, taruh di `app/docs/features/`, bentuk strukturnya konsisten dengan
> guideline ini, dan tautkan ke PRD untuk requirement (`FR-*`).

## Kapan memperbarui dokumentasi (wajib)

Dokumentasi diperbarui **pada perubahan yang sama** dengan kode.

| Perubahan kode | Aksi |
|---|---|
| Tambah/refactor fitur | Buat/Perbarui doc fitur (dari `_TEMPLATE.md`) **dan** baris status di [PROGRESS.md](../../docs/PROGRESS.md) |
| Tambah/ubah file, hook, page, entity | Perbarui bagian struktur terkait |
| Ubah API publik (props, signature hook, return) | Perbarui tabel props/return + contoh |
| Hapus/rename fitur atau file | Hapus/sesuaikan entri — jangan tinggalkan path mati |
| Ubah arsitektur, token, alias, stack, perintah | Perbarui guideline `.claude/guidelines/` |

## Checklist sebelum selesai

- [ ] Semua path/lib/API yang disebut benar-benar ada (atau ditandai statusnya).
- [ ] Tidak ada secret.
- [ ] Contoh kode bisa di-copy dan masuk akal.
- [ ] Tidak ada sisa transkrip chat.
- [ ] Link relatif berfungsi.
