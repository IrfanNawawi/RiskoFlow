# Git Commit & Push

Konvensi commit RiskoFlow. Tujuan: histori yang bisa ditelusuri dan alur **commit → PR** yang aman.

## Format pesan commit

Pakai **Conventional Commits**: `<type>(<scope>): <deskripsi>`.

```
feat(dashboard): tambah kartu estimasi nilai risiko
fix(risks): cegah draft AI masuk agregat heatmap
refactor(incidents): pisahkan repository dari komponen
docs(guidelines): sesuaikan panduan ke stack web
```

| Type | Untuk |
|---|---|
| `feat` | Fitur baru |
| `fix` | Perbaikan bug |
| `refactor` | Ubah struktur tanpa ubah perilaku |
| `docs` | Dokumentasi/guideline |
| `chore` | Konfigurasi, dependency, tooling |
| `test` | Menambah/memperbaiki test |

- **scope** = nama fitur/area (`dashboard`, `risks`, `incidents`, `compliance`, `ui`).
- **deskripsi** ringkas, imperatif, Bahasa Indonesia; jelaskan *apa* (dan *kenapa* bila tak jelas).

## Footer co-author (commit buatan Claude)

Setiap commit yang dibuat Claude **harus** diakhiri footer berikut:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

Bila perlu, tambahkan juga baris co-author developer (dari `git config user.email`).

## Alur commit & push

Lakukan commit/push **hanya bila user memintanya**. Sebelum push, lolos gate kualitas.

1. **Cek dulu** — `git status` dan `git diff` agar hanya perubahan yang diinginkan ikut.
2. **Lolos gate** — `npm run typecheck` + `npm run build` (tambah `npm run lint`/`test` saat
   sudah dikonfigurasi). Jangan push bila gagal; laporkan apa adanya.
3. **Jangan commit langsung di branch utama** (`main`). Buat branch dulu:
   ```bash
   git switch -c feat/<ringkas-deskripsi>
   ```
4. **Stage perubahan yang relevan** (hindari `git add .` membabi buta):
   ```bash
   git add <file-yang-diubah>
   ```
5. **Commit** sesuai format di atas (sertakan footer co-author).
6. **Push** dan buka Pull Request ke branch target.

### Aturan keamanan push

- **Jangan pernah** commit secret/API key/service-role key. Konfig publik klien lewat env
  `VITE_*`; secret backend di **Supabase Vault** (lihat [coding-rules.md](coding-rules.md)).
  Pastikan `.env*` ada di `.gitignore`.
- **Jangan** `git push --force` ke branch bersama. Untuk branch sendiri, pakai `--force-with-lease`.
- Pisahkan perubahan besar per fitur ke PR berbeda agar diff bisa di-review.
- Periksa target sebelum menimpa/menghapus file yang bukan kamu buat.

## Penamaan branch

| Awalan | Untuk |
|---|---|
| `feat/` | Fitur baru |
| `fix/` | Perbaikan bug |
| `refactor/` | Perubahan struktur tanpa ubah perilaku |
| `chore/` | Tugas rutin / konfigurasi |

Contoh: `feat/dashboard-exposure-card`, `fix/heatmap-ai-draft`.

> Catatan: bila direktori kerja **belum** repo git, inisialisasi dulu (`git init`) hanya bila
> user memintanya — jangan asumsikan.
