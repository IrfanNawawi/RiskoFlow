# RULE: PRD Authoring

## Scope
Berlaku saat membuat, mengisi, atau mengubah file PRD apa pun
(`**/PRD*.md`). Sumber struktur: `docs/PRD-TEMPLATE.md`.

## Aturan Wajib
1. Ikuti struktur section 1–11 dari PRD-TEMPLATE.md PERSIS.
   Jangan tambah/hapus/ubah urutan section tanpa diminta eksplisit.
2. Setiap fitur di Core Features memakai format tetap:
   Description, User Story, Inputs, Outputs, Edge Cases, Dependencies.
3. Semua diagram pakai Mermaid (`flowchart`, `erDiagram`). Tanpa gambar eksternal.
4. Setiap keputusan teknis/produk yang berubah → catat 1 baris di Decision Log (section 9).
5. Perubahan signifikan → naikkan `Version` di header + update `Last Updated`.
6. Functional Requirement WAJIB punya Acceptance Criteria yang testable.
7. Hormati Non-Goals: jangan menambah scope yang sudah ditandai out-of-scope.

## Default Stack (kecuali PRD menyatakan lain)
- Frontend: React Native CLI + TypeScript
- State: TanStack Query (server) + Zustand (UI)
- Backend/DB: Golang atau Supabase (Postgres + RLS)
- Arsitektur: Clean Architecture (domain / data / presentation)
- Theme default: Dark Mode

## Gaya Penulisan
- Penjelasan: Bahasa Indonesia. Kode & istilah teknis: English.
- MVP-first: isi section 1–3 + 8 lebih dulu, sisanya menyusul.
- Ringkas, hindari over-spec di versi awal.

## Larangan
- Jangan menjawab "selesai" untuk PRD yang masih punya placeholder `{{...}}`.
- Jangan membuat field ERD tanpa tipe data.
- Jangan mengubah Tech Stack tanpa mencatat alasannya di Decision Log.