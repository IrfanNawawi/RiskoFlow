# RiskoFlow — Progress Tracker

Status implementasi terhadap [PRD.md](PRD.md) (v1.6). Diperbarui **2026-06-26**.

> **Konteks penting (dual-mode):** integrasi **Supabase** kini tersedia — skema + RLS + RPC di
> [supabase/migrations/](../supabase/migrations/), klien [src/lib/supabase.ts](../src/lib/supabase.ts),
> `*RemoteDataSource` + hidrasi store ([src/data/remote.ts](../src/data/remote.ts)). Aktif bila `.env`
> terisi; tanpa itu **fallback mock in-memory** ([src/data/store.ts](../src/data/store.ts)). Invarian
> kritis (severity/level, gate ACCEPT & incident-close, audit, auto-advance, RPC
> `create_company_with_admin`) **DB-enforced**. **Auth masih ⛔** (`currentUserId` mock; RLS permissive);
> Edge Functions/Cron/Vault juga 🎯. Lihat [CLAUDE.md](../CLAUDE.md) "Realita vs target".

**Legend:** ✅ selesai (UI+mock) · 🟡 sebagian · ⛔ belum mulai · 🎯 target (perlu backend)

---

## Ringkasan

| Lapis | Status |
|---|---|
| Fondasi frontend (stack target: bun, TanStack Router, RHF+Zod, TanStack Query, Tailwind v4) | ✅ |
| Arsitektur Clean (domain/data/presentation + repository + DI) | 🟡 — `risks`, `incidents`, `compliance` sudah; sisanya akses store langsung |
| Tooling (Vitest, ESLint, Prettier; gate typecheck/lint/test/build) | ✅ |
| Code splitting (lazy routes + vendor chunk) | ✅ |
| Backend Supabase: Postgres + skema/migrations + RLS (permissive) + RPC + trigger invarian | 🟡 — terpasang & dual-mode; **Auth ⛔**, Edge Functions/Cron/Queues/Vault 🎯 |
| Test E2E (Playwright) + RLS (pgTAP) | ⛔ 🎯 |
| AI Assistant — **generate risiko (mock lokal)** jalan; Edge Function + Gemini 🎯 | 🟡 |
| Notifikasi (in-app + email) | ⛔ 🎯 |

---

## Status per fitur (PRD §3)

| Fitur | PRD | UI | Data layer (Clean Arch) | Backend | Status |
|---|---|---|---|---|---|
| Onboarding & Profil Perusahaan | §3.1 / FR-ONB | ✅ wizard 3 langkah + RHF/Zod | 🟡 via store (`createCompanyWithAdmin` mock RPC) | ⛔ | 🟡 |
| Departemen, User & RBAC + Company Switcher | §3.2 / FR-ORG | 🟡 switcher + role demo (Topbar); **belum** CRUD dept/undang user | ⛔ store langsung | ⛔ | 🟡 |
| Risk Register (Identifikasi) | §3.3 / FR-RISK | ✅ list, filter URL, NewRiskModal | ✅ **domain/data/presentation penuh** | ⛔ | 🟡 |
| Analisis & Penilaian | §3.4 / FR-ASSESS | ✅ heatmap 5×5, matriks, inherent→residual | 🟡 via risks repo; **belum** form re-assessment + riwayat | ⛔ | 🟡 |
| Respons & Mitigasi | §3.5 / FR-TREAT | ✅ form tambah/ubah treatment + approve ACCEPT + **prompt residual otomatis** saat treatment `done` (FR-TREAT-6) | ✅ via [`risks`](features/risks.md) repo + use-case | ⛔ | 🟡 |
| Pemantauan Berkelanjutan | §3.6 / FR-MON | ✅ Catat Review (FR-MON-2, reopen FR-MON-5) + **CRUD KRI + alert terlampaui (FR-MON-4)**; **belum** cron jatuh tempo (🎯) | ✅ via [`risks`](features/risks.md) repo | ⛔ (cron 🎯) | 🟡 |
| Incident / Loss-Event Log | §3.7 / FR-INC | ✅ catat insiden + approve close + **CTA buat-risiko-dari-insiden + auto-link (FR-INC-2)**; **belum** soft delete | ✅ **domain/data/presentation** ([doc](features/incidents.md)) | ⛔ | 🟡 |
| AI Assistant | §3.8 / FR-AI | ✅ **Generate risiko** (FR-AI-1) + **saran mitigasi** (FR-AI-3) → draft/usulan wajib konfirmasi (FR-AI-5) + opt-out (FR-AI-7), **mock lokal**; **belum** saran penilaian (FR-AI-2) & pemantauan (FR-AI-4) | ✅ service [`ai`](features/ai.md) (mock) | ⛔ Edge Function/Gemini 🎯 | 🟡 |
| Kepatuhan + Library Regulasi | §3.9 / FR-COMP | ✅ seed 3 industri + mapping m:n (FR-COMP-2) + CRUD custom (FR-COMP-1) + **duplikasi sistem→custom (FR-COMP-6)** + **laporan gap `.xlsx`/`.pdf` (FR-COMP-4)** | ✅ list + CRUD + duplicate + setMapping ([doc](features/compliance.md)) | ⛔ | 🟡 |
| Notifikasi (in-app + email) | §3.10 / FR-NOTIF | ⛔ | ⛔ | ⛔ 🎯 | ⛔ |
| Dashboard & Reporting | §3.11 / FR-DASH | ✅ dashboard + **ekspor `.xlsx`/`.pdf`** (Register hormati filter aktif, FR-DASH-5); 🟡 Reports builder UI masih mock | 🟡 dashboard baca store/risks | ⛔ | 🟡 |
| Audit Trail | NFR-04 | ✅ viewer audit log | 🟡 entri dibuat aksi store | ⛔ (trigger DB 🎯) | 🟡 |

---

## Detail status (acceptance criteria menonjol)

### ✅ Sudah jalan (mock)
- Routing typed + **typed search params** untuk filter Risk Register (FR-RISK-2) — [search.ts](../src/features/risks/search.ts).
- Severity → level dari satu sumber kanonik `computeRiskLevel` (D4) — [risk.ts](../src/lib/risk.ts).
- Gate approval ACCEPT hanya `risk_manager`/`admin` (FR-TREAT-3) — [approveTreatment.usecase.ts](../src/features/risks/domain/use-cases/approveTreatment.usecase.ts).
- Gate approval tutup insiden besar ≥ threshold (FR-INC-6) — di store `approveIncidentClose`.
- Multi-tenant scope per perusahaan aktif + company switcher (FR-ORG-6) — query key menyertakan `companyId`.
- Seed library regulasi per industri saat onboarding (FR-COMP-5) — store `createCompanyWithAdmin`.
- Uang = integer IDR via [format.ts](../src/lib/format.ts).

### 🟡 Sebagian / perlu dilengkapi
- **Otorisasi nyata** masih UI-only (`can()`/`myRoles()`); RLS = 🎯 (NFR-02).
- Invariant kritis (severity generated column, auto-advance insiden, guard last-admin/dept-delete) ditiru di store; **DB-enforced = 🎯** (D22).
- Form: treatment ✅, catat insiden ✅, mapping kepatuhan ✅, catat review ✅, CRUD requirement custom ✅, **KRI** ✅, **buat-risiko-dari-insiden** ✅, **duplikasi regulasi** ✅, **laporan gap** ✅.
- Ekspor laporan `.xlsx`/`.pdf` (FR-DASH-5) ✅ — [`@/lib/export`](../src/lib/export.ts); Risk Register hormati filter aktif, lib di-`import()` dinamis (lazy chunk).

### ⛔ Belum mulai (butuh backend / layanan)
- AI Assistant 4 tahap via Edge Function + Gemini (FR-AI) + sanitasi payload (NFR-08).
- Notifikasi in-app + email via Cron + Queues (FR-NOTIF).
- Auth Supabase (login/invite), RLS, migrations, RPC provisioning atomik (NFR-01/13, D25).
- Test E2E (Playwright) & RLS test (pgTAP) (NFR-12).

---

## Langkah berikutnya (saran urutan)

1. ✅ ~~Replikasi pola data layer `risks` ke **incidents** & **compliance**.~~ (selesai 2026-06-26)
2. Form mock: ~~catat insiden, treatment, review+residual, KRI (FR-MON-4), buat-risiko-dari-insiden (FR-INC-2)~~ ✅; berikutnya: soft delete insiden, riwayat penilaian.
3. Kepatuhan: ~~mapping (FR-COMP-2), CRUD custom (FR-COMP-1), laporan gap (FR-COMP-4), duplikasi sistem (FR-COMP-6)~~ ✅; berikutnya: mapping treatment↔requirement.
6. **Auth Supabase** (login/invite) + ganti `currentUserId` mock → `auth.uid()` + perketat RLS dari permissive (NFR-02). Lalu Edge Functions (AI), Cron (review due), Queues/email.
4. Replikasi data layer ke sisa fitur (dashboard/reports/audit/onboarding) bila disentuh.
5. Saat Supabase tersedia: ganti `*MockDataSource` → `*RemoteDataSource`, aktifkan RLS + Auth, lalu AI & Notifikasi.

> Cara update file ini: saat menyelesaikan/menambah fitur, perbarui baris status terkait **pada commit yang sama** (konsisten dengan aturan dok di [technical-writing.md](../.claude/guidelines/technical-writing.md)).
