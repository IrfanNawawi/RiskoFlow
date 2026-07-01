# Code Review — Checklist

Checklist review diff RiskoFlow (web SPA). Dipakai subagent `code-reviewer`.
Fokus penting; jangan selera (Prettier/ESLint). Ref: [frontend-structure.md](frontend-structure.md).

## Review Process

1. Pahami tujuan (PR/commit).
2. Per file: temuan + **severity** + **file:line** + fix konkret.
3. Severity: **🔴 blocker** | **🟠 sebaiknya** | **🟢 nit**.
4. Ragu bug? Bilang ragu, jangan prediksi.

---

## Arsitektur & Dependency (§1 frontend-structure)

- [ ] Fitur: `src/features/<f>/` layer benar (§2).
  - `domain`: type + pure fn **zero** React/Supabase/UI.
  - `data`: DTO → entity mapper + Zod; RLS enforce DB.
  - `presentation`: import domain + @/lib, **TIDAK data** langsung.
- [ ] DTO boundary: mapper + Zod (§4.3) → entity, TIDAK leak presentation.
- [ ] Entity = `type` + pure fn, **bukan class**.
- [ ] Use-case hanya if business logic (§13); skip passthrough/form/UI toggle.

---

## State & Data (§5, §6 frontend-structure)

- [ ] Server state: TanStack Query, TIDAK `useEffect` + fetch manual.
- [ ] Global state: Zustand granular (selector/`useShallow`).
- [ ] Form: RHF + `zodResolver`; eksternal input (form/search/respons) validasi Zod.
- [ ] Query key: semua deps + tenant; invalidation tepat; race-free.
- [ ] **Multi-tenant: `company_id` RLS enforce DB (§4.2, §6.1, NFR-01); client trust JWT scope.**

---

## Korektitas & Logika

- [ ] Logic intent sesuai; off-by-one, edge (null/undefined).
- [ ] `async`/`await` benar; promise TIDAK gantung; error TIDAK ditelan.
- [ ] State update TIDAK render loop; hook deps benar.
- [ ] **Finansial: integer IDR TIDAK float (§6.5, NFR-10); format via `@/lib/format`.**

---

## TypeScript & Kualitas

- [ ] TIDAK `any` / `@ts-ignore` baru (pakai `unknown` + narrow).
- [ ] `import type` wajib (`verbatimModuleSyntax`); TIDAK non-null `!` tanpa guard.
- [ ] TIDAK dead import/var (`noUnusedLocals`/`noUnusedParameters` on).
- [ ] TIDAK duplikasi reusable; tanggung jawab jelas.
- [ ] Naming: [coding-rules.md](coding-rules.md).

---

## React & UI (§7, §10 frontend-structure)

- [ ] List `key`: id stabil (TIDAK index).
- [ ] `useCallback`/`useMemo` tepat (TIDAK kurang/lebih).
- [ ] Styling: token Tailwind (`@theme`) / `@/components/ui` (TIDAK hex/px).
- [ ] **Responsif mobile → lg, TIDAK overflow.**
- [ ] **a11y (§10, NFR-09):** level + skor (TIDAK hanya warna); ikon-only `aria-label`; kontras ≥AA.**

---

## Performa (§9 frontend-structure, NFR-02)

- [ ] Route baru: `lazyRouteComponent` di [main.tsx](../../src/main.tsx) (code-split).
- [ ] Lib berat (recharts): lazy chunk, TIDAK eager import.
- [ ] Render: TIDAK mahal work (loop/clone) tanpa `useMemo`; list panjang TIDAK re-render all.
- [ ] Query: keyset pagination (§9, NFR-06); `SELECT` field-specific TIDAK `*`; `staleTime`/`gcTime` set.

---

## DB & Types (§4.0, §4.3 frontend-structure, NFR-13)

- [ ] DB types generated: `supabase gen types` → `database.types.ts`.
- [ ] DTO snake_case (`database.types`), entity camelCase (`@/data/types`).
- [ ] Presentation import **entity only**, TIDAK DTO.

---

## Offline & i18n (§12, §6.5 frontend-structure, NFR-14, NFR-10)

- [ ] Cache strategy: Query `staleTime`/`gcTime`; offline badge saat disconnect (§12).
- [ ] i18n: hardcode string → `t("key")`; tanggal/IDR pakai locale ID (§6.5).
- [ ] **Sentry init main.tsx; error tracking live (§6.6, NFR-11).**

---

## Keamanan & Multi-tenant (NFR-04, NFR-01)

- [ ] TIDAK secret/service-key/API-key di diff; publik = `VITE_*` (anon) (§4.1).
- [ ] TIDAK PII/token/sensitif log.
- [ ] RLS enforce tenant; cache key include `company_id` (§4.2, NFR-01).
- [ ] Auth: repository layer TIDAK Supabase client langsung; DI hook (§6.1).

---

## Test (Vitest, §11 frontend-structure, NFR-12)

- [ ] Logika baru (use-case, mapper, schema, pure fn): unit test, `bun run test` hijau.
- [ ] Edge case: null, corrupt, error path, empty.
- [ ] Mapper/Zod: corrupt DTO → reject di test (§4.3, [testing.md](testing.md)).
- [ ] E2E critical: auth → onboarding → register → review/treat (Playwright).
- [ ] **RLS test mandatory (D23):** cross-tenant TIDAK akses.

---

## Dokumentasi (§14 frontend-structure)

- [ ] Feature baru/refactor: `docs/features/<f>.md` (from [_TEMPLATE.md](../../docs/_TEMPLATE.md)).
- [ ] Status di [PROGRESS.md](../../docs/PROGRESS.md).
- [ ] Stack/alias/cmd/arch change → update guideline (TIDAK broken path).

---

## Dependency & CI

- [ ] TIDAK dep baru tanpa why/confirm; versi **exact pin**.
- [ ] Import = di [package.json](../../package.json).
- [ ] `bun run typecheck`, `lint`, `test`, `build` — **ALL GREEN (§14, NFR-12).**

---

## Output Format

```
🔴 src/features/risks/data/mappers/risk.mapper.ts:42
   DTO leak: Page import RiskDTO direct (should entity Risk).
   Fix: return mapper result, don't pass DTO.

🟠 src/features/risks/presentation/hooks/useRisks.ts:15
   Query key missing tenant. Include company_id (NFR-01).
   Fix: [..., companyId] in queryKey.

🟢 src/features/risks/domain/entities/risk.ts:8
   Nit: rename param p1 → risk (clarity).
```

**Summary:** 1 blocker, 1 improve, 1 nit. Merge after fix blocker/improve.