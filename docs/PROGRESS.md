# RiskoFlow — Progress Tracker

PRD v1.6.1 status. Updated **2026-07-02**.

> **Dual-mode active:** Supabase optional (`VITE_SUPABASE_*` env). Fallback mock in-memory. DB-enforced invariants (severity/gate/RLS/audit) live in migrations. Auth still mock (`currentUserId`); RLS permissive. 
> Ref: [frontend-structure.md](../.claude/guidelines/frontend-structure.md) (Clean Arch), [PRD.md](PRD.md) (spec).

---

## Status Summary

| Layer | Status | Notes |
|---|---|---|
| Frontend stack (React 19/TS, TanStack, Tailwind v4, shadcn/ui) | ✅ | All deps installed |
| Clean Architecture (domain/data/presentation + DI) | 🟡 | `risks`, `incidents`, `compliance`, `ai`, `dashboard`, `reports` full; `audit`/`onboarding`/`org` direct store access |
| Code splitting, CI gates (typecheck/lint/test/build) | ✅ | Via Vite + Vitest |
| Supabase (Postgres + RLS + RPC + migrations) | 🟡 | Wired; auth+Edge Fn 🎯 |
| AI (Edge Fn + Gemini) | ✅ | Risk + mitigation drafts; gate kuota 🎯 |
| Notifikasi (in-app + email) | 🟡 | In-app pusat notifikasi ✅; email + Cron/Queues 🎯 |

---

## Fitur per PRD §3

### FR-ONB: Onboarding & Profil Perusahaan (§3.1)
- **Status:** 🟡 (UI ✅, backend mock)
- **Implemented:**
  - Wizard 3 langkah (`OnboardingPage`) + validasi Zod per-langkah (`onboarding.schema`)
  - `createCompanyWithAdmin` (mock store + RPC `create_company_with_admin`): atomik buat tenant +
    seed departemen (dedupe case-insensitive) + admin+risk_manager (D25/D27)
  - Tipe biz (jasa/dagang/manufaktur) → seed regulasi GENERAL + industri (`INDUSTRY_SEED`)
- **Remaining:**
  - [ ] Phone format ID via Zod + `format.ts` (butuh kolom `phone` + param RPC → 🎯 backend)

### FR-ORG: Departemen, User & RBAC (§3.2)
- **Status:** ✅ (dept CRUD ✅, anggota & peran ✅, switcher ✅, Auth frontend ✅; RLS 🎯)
- **Auth frontend (dual-mode, `src/features/auth/`):**
  - `AuthGate` (init sesi saat boot) + `/login` (`LoginPage`) + route guard di `AppShell`/onboarding
  - Flag `isAuthEnabled` (`VITE_SUPABASE_AUTH`) **terpisah** dari `isSupabaseConfigured`: DB/PostgREST
    bisa aktif sementara Auth ditunda. `true` → login email/password Supabase; default → **login demo**
    (pilih user, dipersist localStorage) agar app tetap dipakai. Logout di sidebar → `/login`
  - `store.setCurrentUser` menjaga perusahaan aktif tetap milik user sesi; 5 unit test `authStore`
  - ⚠️ target `supabase/migrations/0002_auth_rls.sql`: policy permissive → berbasis `auth.uid()` +
    keanggotaan (helper SECURITY DEFINER `is_company_member`/`has_company_role`) — belum bisa dijalankan di sini
- **Structure:** `src/features/org/` (store-direct, seperti dashboard/reports) — page + validation + components
- **Implemented:**
  - Halaman Organisasi (`/organisasi`): departemen + anggota & peran
  - Dept CRUD: create/rename + archive soft delete (`archivedAt`) + guard FR-ORG-002 (tolak arsip bila ada risiko/insiden aktif; dedupe nama case-insensitive)
  - Undang anggota (email valid + multi-role D27) + ubah peran + keluarkan; guard last-admin (min 1 admin aktif)
  - Store actions + audit log per mutasi; cek peran UI (`can("admin")`) = UX; 7 unit test guard
- **Remaining 🎯:**
  - [ ] RLS per company_id + role check via `auth.claims()` (backend)
  - [ ] Invite via email (SMTP) — kini buat user langsung di mock

### FR-RISK: Risk Register — Identifikasi (§3.3)
- **Status:** ✅ (full Clean Arch)
- **Structure:** `src/features/risks/` — domain/ + data/ + validation/ + presentation/
- **Implemented:**
  - List + filter (FR-RISK-2: typed search params)
  - NewRiskModal + severity computed (D4)
  - Approval gate ACCEPT (risk_manager/admin, D20)
  - Data layer: repo pattern ✅

### FR-ASSESS: Analisis & Penilaian (§3.4)
- **Status:** ✅ (inherent + residual ✅, heatmap ✅; riwayat penilaian 🎯)
- **Implemented:**
  - Severity/level generated column DB (`assessments`, D22) + `computeRiskLevel` kanonik (D4)
  - Heatmap 5×5 (`components/Heatmap.tsx`) + MiniMatrix di RiskDetailPage
  - Inherent + residual di RiskDetailPage; residual gate (≥1 treatment, FR-ASSESS-001 AC-003)
- **Remaining 🎯:**
  - [ ] Riwayat penilaian: shadow table `assessments.history` per risk
  - [ ] Auto residual recalc saat treatment done (link FR-TREAT)

### FR-TREAT: Respons & Mitigasi (§3.5)
- **Status:** ✅ (form + approval ✅, prompt residual ✅)
- **Implemented:**
  - Treatment CRUD (avoid/reduce/transfer/accept)
  - Approval gate + gate close (D20)
  - Trigger residual prompt saat status=done (FR-TREAT-6)
  - Form via RHF + Zod

### FR-MON: Pemantauan Berkelanjutan (§3.6)
- **Status:** ✅ (review ✅, KRI CRUD ✅; cron jatuh tempo 🎯)
- **Implemented:**
  - Review form (`ReviewModal`) + `review.schema` + trigger bump `next_review_date`
  - KRI CRUD (`KriFormModal` + `kri.schema` + tabel `kris`): name + threshold + actual
  - Alert flag saat KRI lewat ambang (UI)
- **Remaining 🎯:**
  - [ ] Cron harian scan `next_review_date` → enqueue notifikasi (FR-MON-001 AC-001)
  - [ ] Reopen risk saat review fail

### FR-INC: Incident / Loss-Event Log (§3.7)
- **Status:** ✅ (form ✅, link risk ✅, close gate ✅)
- **Implemented:**
  - Record insiden form (date/category/loss/root cause)
  - Approve close gate (≥ threshold, D18)
  - CTA: create-risk-from-incident + auto-link (FR-INC-2)
  - Data layer: full domain/data/presentation

### FR-DASH: Dashboard & Reporting (§3.8)
- **Status:** 🟡 (ekspor ✅, builder pilih kolom + filter ✅ (simpan preset 🎯); data layer ✅)
- **Structure:** `dashboard` & `reports` full domain/data/presentation (mirror `risks`)
- **Implemented:**
  - Dashboard: risk count + heatmap + top mitigasi
  - Ekspor Risk Register `.xlsx`/`.pdf` respecting filter (lazy chunk)
  - **Custom Report Builder fungsional (FR-DASH-3):** katalog kolom `reports/domain/entities/columns`
    (`REPORT_COLUMNS` + `projectRows`/`selectedColumnKeys`); drag/klik kolom → ekspor XLSX/PDF
    hanya kolom terpilih (base Kode+Judul selalu ikut). Template cepat tetap seluruh kolom.
  - **Filter nilai** `reports/domain/entities/filter` (`applyRiskFilter` by level/kategori/status, AND antar-dimensi;
    level pakai penilaian aktif) — chip toggle + hitung live "N dari M" + Reset; ekspor custom menghormati filter.
    13 unit test domain (kolom + filter).
  - **Data layer Clean Arch:** metrik dashboard = pure function `domain/entities/metrics` (11 unit test);
    `DashboardRepository`/`ReportsRepository` meng-compose `IRiskRepository`/`IIncidentRepository`
    (reuse SELECT/mapper) + `*ReferenceDataSource` (dept/user/company) via DI hook + TanStack Query
    (`useDashboardOverview`/`useReportRegister`, key ter-scope tenant). Page tak lagi akses `@/data/store`.
- **Tasks:**
  - [x] Reports builder: pilih kolom → ekspor terproyeksi (mock)
  - [x] Reports builder: filter nilai (level/kategori/status) diterapkan ke ekspor
  - [ ] Reports builder: simpan preset laporan + filter periode/tanggal

### FR-AI: AI Assistant (§3.9)
- **Status:** ✅ (risk + assess + mitigation + monitor draft; kuota 🎯)
- **Implemented:**
  - FR-AI-1: Generate risiko per dept (Edge Fn `supabase/functions/ai-suggest` + Gemini)
  - FR-AI-2: Saran penilaian (likelihood/impact + rationale) — prefill di `ReviewModal`, draft → confirm (D6)
  - FR-AI-3: Saran mitigasi (draft → confirm required, D6)
  - FR-AI-4: Saran pemantauan (frekuensi review + kandidat KRI) — prefill di `ReviewModal`
  - Semua tahap: mock + Edge (action `assessment`/`monitoring`) + Browser-Gemini, `responseSchema` + Zod
  - Opt-out per user (FR-AI-7)
  - Fallback mock saat `.env` empty
- **Remaining 🎯:**
  - [ ] Guard kuota harian + key di Vault (D10/D20)

### FR-NOTIF: Notifikasi (§3.10)
- **Status:** 🟡 (in-app ✅ + read-state persist ✅; email + Cron/Queues 🎯)
- **Structure:** `src/features/notifications/` (derived + read-state, seperti dashboard/org)
- **Implemented:**
  - In-app pusat notifikasi (`components/NotificationCenter.tsx`): lonceng Topbar + badge unread + dropdown
  - Derivasi murni (`build.ts`): review terlambat (critical) / akan jatuh tempo ≤7 hari (warning) + insiden approved (info); scope perusahaan aktif, urut per severity
  - Read-state Zustand (`store.ts`) — buka panel = tandai semua terbaca; klik item → navigasi + tandai terbaca
  - **Persist read-state**: `zustand/persist` → `localStorage` (Set diserialisasi via replacer/reviver); badge unread bertahan lintas reload
  - 11 unit test (`buildNotifications` derivasi + `readStore` persist/rehydrate)
- **Remaining 🎯:**
  - [ ] Email via Supabase Queues: digest harian
  - [ ] Cron: scan next_review_date, flag alert (daily 09:00)
  - [ ] Persist read-state ke DB per-user (kini di localStorage; hilang bila ganti device/clear)

### FR-COMP: Kepatuhan + Library Regulasi (§3.11)
- **Status:** ✅ (CRUD ✅, laporan ✅, duplikasi ✅)
- **Implemented:**
  - Seed 3 industri (jasa/dagang/manufaktur)
  - CRUD custom requirement (FR-COMP-1)
  - Mapping m:n risk ↔ requirement (FR-COMP-2)
  - Duplicate sistem → custom (FR-COMP-6)
  - Gap report `.xlsx`/`.pdf` (FR-COMP-4)
  - Data layer: full Clean Arch

### NFR-04: Audit Trail
- **Status:** 🟡 (viewer ✅, entries created; trigger 🎯)
- **Implemented:**
  - Audit log viewer page
  - Action logged saat store mutation
- **Tasks:**
  - [ ] DB trigger: insert audit per company_id (RLS enforce)
  - [ ] Soft delete: `deleted_at` not null, still audit-visible

---

## Architecture Checklist (per frontend-structure.md §14)

- [ ] **Dependency rule:** presentation → domain ← data. Zero React/DB in domain.
- [ ] **DTO boundary:** Mapper + Zod enforce; DTO not in presentation.
- [ ] **Use-case:** Only permission gate / multi-step logic; else hook → repo.
- [ ] **RLS:** All queries scope company_id via RLS policy + JWT.
- [ ] **DB types:** `supabase gen types` → `database.types.ts`; entity ≠ DTO.
- [ ] **I18n:** Hardcoded → `t("key")`. Date/currency locale ID.
- [ ] **Sentry:** Init main.tsx; error tracking live.
- [ ] **Offline:** `staleTime`/`gcTime`; offline badge when net down.
- [ ] **Keyset pagination:** Cursor-based; SELECT specific fields.
- [ ] **UI tokens:** Tailwind utility; risk level = label + score + color (AA contrast).
- [ ] **Tests:** Vitest unit; Playwright E2E critical path.
- [ ] **CI gates:** typecheck + lint + test + migration dry-run (MUST pass).

---

## Next Steps (Prioritized)

**Tier 1 (unblock main features):**
1. Auth: **frontend selesai** (login demo/Supabase, guard, logout, sesi) ✅ — sisa 🎯: aktifkan `VITE_SUPABASE_AUTH`,
   set user Auth = `users.id`, swap scoping ke `auth.uid()`, invite flow via email
2. Tighten RLS: migrasi `0002_auth_rls.sql` ditulis (permissive → `auth.uid()` + membership) — sisa 🎯: apply + pgTAP cross-company deny
3. FR-MON cron: daily scan next_review_date, flag stale (Cron job)

**Tier 2 (post-core):**
4. FR-NOTIF: Queues + email template (Sendgrid / Resend integration via Vault)
5. FR-AI: guard kuota harian + key di Vault (D10/D20) — saran assessment/monitoring ✅ done
6. ~~Dashboard/reports data layer: migrate direct store → repository~~ ✅ done (Clean Arch + TanStack Query)

**Tier 3 (polish):**
7. E2E tests (Playwright): auth → register → assess → treat → monitor
8. RLS tests (pgTAP): verify cross-tenant denial
9. Soft delete + audit cleanup per retention policy

---

## Dual-Mode (Mock ↔ Supabase)

**With `.env` empty:** Mock in-memory store (`src/data/store.ts`).
**With `.env` filled:** Supabase remote data source (`src/data/remote.ts`).

Key wiring:
- `src/lib/supabase.ts` — Supabase client init (TS types from `database.types.ts`)
- `src/data/remote.ts` — RemoteDataSource factory; fallback mock if env missing
- `src/features/*/data/repositories/` — Implement IRepository; swap data source at DI level

**Migration path:** Feature complete in mock → add RemoteDataSource + migrate DI → activate Supabase env.

---

## Docs Reference

- **PRD.md** — spec source of truth
- **frontend-structure.md** — arch rules, layer rules, checklist
- **features/** — per-feature domain/data/validation docs
- **PRD-RULE.md** — doc authoring rules
- **architecture.md** — Clean Arch rationale

Update PROGRESS.md per commit; keep task breakdowns concrete + scanned regularly.