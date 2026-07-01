# Konvensi & Guardrail — RiskoFlow

Standar lintas fitur: cache stable, re-render terukur, layer enforce, tenant-safe.
Cross-ref: [frontend-structure.md](frontend-structure.md) + [architecture.md](architecture.md).

---

## 1. Query Key Factory (TanStack Query)

**Pattern:** `['<fitur>', '<resource>', ...deps]` → file per fitur di `hooks/queries.ts`.

```typescript
// features/risks/presentation/hooks/queries.ts
const riskKeys = {
  all: ["risks"] as const,
  list: (q: RiskListQuery) => ["risks", "list", q] as const,  // deps inside
  detail: (id: string) => ["risks", "detail", id] as const,
} as const;
```

**Rule (§9 FRONTEND-STRUCTURE):**
- ALL query params → key (filter, sort, pagination, id).
- RLS scope di DB (NFR-01); client **trust JWT**, jangan hardcode `company_id` di query (§4.2).
- Invalidate: `queryClient.invalidateQueries({ queryKey: riskKeys.all })`.

---

## 2. Store Zustand (§6.3 FRONTEND-STRUCTURE)

**Tier:**
- **Global** (session, activeCompanyId, ui.sidebar) → `src/data/store.ts`.
- **Feature** (risks filter state, table sort) → `features/<f>/presentation/stores/`.
- **Local** (form input, modal open) → `useState`.

**Pattern:**
```typescript
const useRisksFilter = create<State>((set, get) => ({
  filters: {},
  setFilters: (f) => set({ filters: f }),
}));

// ✅ Read via selector + useShallow (re-render saat irisan berubah)
const filters = useRisksFilter(useShallow((s) => s.filters));
```

**Rule:**
- **Zero server state in Zustand.** Server→Query; Zustand→UI-only.
- Saat Supabase live: mock store → repo → Query. Store keep UI state.
- Selectors + `useShallow` agar efficient re-render.

---

## 3. Routing (§7, TanStack Router)

**Register di `src/main.tsx`** (code-based, type-safe).

```typescript
// ✅ Existing paths LOCKED: /dashboard, /risks/:riskId, /compliance/:id
// ✅ Search param typed + validated Zod (FR-RISK-2)
const searchSchema = z.object({ status: z.enum(["open", "closed"]) });
<Link search={searchSchema.parse({ status: "open" })} />
```

**Rule:**
- Programmatic nav → `useNavigate()`; NO `window.location`.
- Filter, sort, page → URL search param (shareable, bookmarkable).

---

## 4. Multi-Tenant + Otorisasi (NFR-01, §4.2 + §6.1)

**Data scope = RLS at DB.** Postgres policy auto-scope via `company_id` + JWT claim.

```typescript
// ✅ RLS enforce; client TRUST DB scope
const { data } = await supabase.from("risks").select("*");
// ❌ NO explicit WHERE company_id = X
// ❌ NO hardcode tenant check in UI
```

**Rule:**
- Client jangan hardcode tenant filter (DB enforce via RLS).
- UI role check (`can()`, `myRoles()`) = UX only (hide button). Real gate = RLS policy.
- Test RLS deny case (D23, §11 FRONTEND-STRUCTURE).

---

## 5. Error Handling (§6.6 Sentry, NFR-11)

**Flow:** API err → map safe msg (ID) → Query `.error` → component render.

```typescript
// ✅ Mapper: DTO err → entity err (safe ID msg)
const mapError = (e: unknown): AppError => ({
  code: "VALIDATION_FAILED",
  message: "Data tidak valid",  // Bahasa Indonesia
  details: undefined,  // NO tech detail / PII
});

// ✅ Component: 3-state (load, empty, error)
const { data, error, isPending } = useQuery({ ... });
if (isPending) return <Skeleton />;
if (error) return <ErrorBoundary error={error} />;
return <RiskList risks={data} />;

// ✅ Sentry tag tenant
Sentry.captureException(err, { tags: { company_id } });
```

**Rule:** 3 UI state = loading (skeleton) + empty + error (FR-DASH-6).

---

## 6. Format (NFR-10: i18n + Locale ID)

**Mata uang:** `idr(123456)` = "Rp 123.456" (integer, tanpa desimal, `id-ID`).  
**Tanggal:** `fmtDate(iso)` = "01 Jul 2026" (ISO string → locale `id-ID`).  
**String:** `t("risk.title")` (hardcoded → i18n key).

```typescript
// @/lib/format — implementasi kanonik pakai Intl native (bukan date-fns)
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
```

---

## 7. Dependency Rule (§1 FRONTEND-STRUCTURE, **WAJIB**)

```
presentation  →  domain  ←  data
```

- **domain:** type + pure fn. Zero React/Supabase/UI lib.
- **data:** DTO (snake_case) → mapper → entity (camelCase). Repository implement I*Repository.  
  DTO TIDAK ke presentation (§4.3).
- **presentation:** import domain + components. **Never** import data direct (DI via hook).

---

## 8. Folder Structure (§2 FRONTEND-STRUCTURE)

```
features/<f>/
├── domain/
│   ├── entities/         # Type, interface, I*Repository
│   └── use-cases/        # Business logic (gate, multi-step only)
├── data/
│   ├── datasources/      # *.dto.ts + RemoteDataSource
│   ├── mappers/          # *.mapper.ts (DTO → entity + Zod)
│   └── repositories/     # *.repository.ts
├── validation/           # Zod schema (form, search param)
├── presentation/
│   ├── pages/            # *Page.tsx (thin)
│   ├── components/       # Feature-local UI
│   ├── hooks/            # DI factory + Query key factory
│   └── stores/           # Zustand (if needed)
└── index.ts              # Export page
```

**Rule:** Layer saat dibutuhkan; no empty folder. Simple feature = page + hook cukup.

---

## 9. Database & Types (NFR-13, §4.0)

**Gen types:** `supabase gen types typescript --linked > src/database.types.ts`.

**Boundary:**
- `database.types.*` = DTO (snake_case, auto-gen).
- `@/data/types` = entity (camelCase, manual).
- Presentation import entity ONLY.

---

## 10. When to Create Use-Case (§13 FRONTEND-STRUCTURE)

**Create saat:**
- Permission gate (hanya `risk_manager` approve).
- Multi-step transaction (update risk + auto-trigger review).
- Cross-aggregate logic (incident → update severity).

**Skip saat:**
- Passthrough fetch → map → display (hook→repo direct).
- Form validasi single (Zod cukup).
- UI state toggle (Zustand cukup).

---

## ✅ Checklist (§14 FRONTEND-STRUCTURE)

- [ ] **Folder:** §2 structure, no empty.
- [ ] **Dependency:** §1 enforced; `presentation` never import `data` direct.
- [ ] **Query key:** factory, all deps in (§9).
- [ ] **Store:** granular, selector-read, `useShallow` (§6.3).
- [ ] **State:** server→Query, UI-global→Zustand, form→RHF+Zod, local→useState.
- [ ] **Multi-tenant:** RLS DB-enforce (NFR-01); NO client tenant filter.
- [ ] **Security:** Zero secret in client; otorisasi=RLS, NOT UI.
- [ ] **Validation:** Input (form, resp, param) via Zod.
- [ ] **Token design:** Tailwind `@theme`; NO hardcode color/spacing/font.
- [ ] **i18n:** `t("key")`; date/currency=locale ID (NFR-10).
- [ ] **a11y:** Risk level=label+score (not color-only); AA contrast; Radix primitives (NFR-09).
- [ ] **Sentry:** Init main.tsx; tag company_id (NFR-11).
- [ ] **Offline:** Query `staleTime`/`gcTime`; offline badge (NFR-14).
- [ ] **Pagination:** Keyset/cursor (NFR-06); SELECT field-specific.
- [ ] **Test:** Vitest+RTL unit; Playwright E2E critical; RLS deny test (NFR-12).
- [ ] **CI:** `typecheck`, `lint` MUST pass. (`test`, migration dry-run saat available).

---

## 📌 NFR Traceability

| ID | Topic | §FRONTEND | Status |
|----|-------|-----------|--------|
| NFR-01 | Multi-tenant RLS | §4.2, §6.1 | ✓ |
| NFR-02 | Performance | §9 | ✓ |
| NFR-04 | Secrets in Vault | §4.1 | ✓ |
| NFR-06 | Keyset pagination | §9 | ✓ |
| NFR-09 | WCAG AA a11y | §10 | ✓ |
| NFR-10 | i18n locale ID | §6.5 | ✓ |
| NFR-11 | Sentry monitoring | §6.6 | ✓ |
| NFR-12 | Test CI gates | §11 | ✓ |
| NFR-13 | DB types + boundary | §4.0, §4.3 | ✓ |
| NFR-14 | Offline cache | §12 | ✓ |
| FR-RISK-2 | Typed search params | §5.2 | ✓ |

---

## 🔗 See Also

- [frontend-structure.md](frontend-structure.md) — full guide
- [design-system.md](design-system.md) — token, palette
- [architecture.md](architecture.md) — clean arch rationale