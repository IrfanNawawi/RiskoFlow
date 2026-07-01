# Testing — Panduan (NFR-12)

**Status:** Runner **sudah terpasang** — Vitest + React Testing Library (unit/component) & Playwright
(E2E) ada di `package.json`. `bun run test` (`vitest run`) aktif; script `e2e` Playwright **belum**
didaftarkan, dan pgTAP/`supabase test db` (RLS/RPC) masih **🎯 target**. Gate wajib sebelum selesai:
`bun run typecheck` + `bun run build` + `bun run lint` + `bun run test` hijau.

> Tulis skenario test **saat membangun fitur**, jangan ditunda — layer `domain`/`data` murni dan
> `@/lib` (pure function) sudah siap diuji sekarang.

---

## 1. Arsitektur test

Tiga layer per §2 [frontend-structure.md](frontend-structure.md); uji tiap layer mengikuti dependency
rule (§1):

| Layer | Dipanggil oleh | Jenis test | Tool | Fokus |
|-------|----------------|------------|------|-------|
| **Domain** | data + presentation | Unit | Vitest | Type entity + pure function; tanpa React/Supabase |
| **Data** | presentation via DI | Unit + Integration | Vitest | DTO → entity via mapper + validasi Zod |
| **Presentation** | user | Component + E2E | Vitest + RTL / Playwright | Render, state (loading/empty/error), submit form |

Arsitektur target sangat _testable_: `domain`/`data` murni dan `@/lib` berisi pure function
(`computeRiskLevel`, `idrCompact`) yang ideal untuk unit test tanpa mock.

---

## 2. Unit test (domain + data)

### 2.1 Domain: entity & pure function

File: `src/lib/*.test.ts` (logika kanonik) atau `src/features/<f>/domain/**/*.test.ts` (🎯 saat fitur
punya folder `domain/entities`).

Uji type entity + pure function saja, tanpa mock. Sumber kebenaran severity → level adalah
`computeRiskLevel` di `@/lib/risk` (D4).

```typescript
// src/lib/risk.test.ts
import { describe, it, expect } from "vitest";
import { computeRiskLevel, severityScore } from "@/lib/risk";

describe("computeRiskLevel", () => {
  it("mengembalikan EXTREME saat skor >= 16", () => {
    expect(computeRiskLevel(4, 4)).toBe("EXTREME"); // 16
    expect(computeRiskLevel(5, 5)).toBe("EXTREME"); // 25
  });

  it("mengembalikan HIGH saat 10 <= skor <= 15", () => {
    expect(computeRiskLevel(5, 2)).toBe("HIGH"); // 10
    expect(computeRiskLevel(5, 3)).toBe("HIGH"); // 15
  });

  it("mengembalikan MEDIUM saat 5 <= skor < 10", () => {
    expect(computeRiskLevel(3, 2)).toBe("MEDIUM"); // 6
  });

  it("mengembalikan LOW saat skor < 5", () => {
    expect(computeRiskLevel(1, 1)).toBe("LOW"); // 1
  });
});

describe("severityScore", () => {
  it("mengembalikan likelihood * impact", () => {
    expect(severityScore(4, 3)).toBe(12);
  });
});
```

Cakupan:
- ✅ Happy path + nilai batas (boundary 5, 10, 16)
- ✅ Input invalid → perilaku jelas (null / throw), diuji eksplisit
- ✅ Pesan error Bahasa Indonesia (yang tampil ke user)

### 2.2 Data: mapper & validasi Zod

File: `src/features/<f>/data/mappers/*.test.ts`

Uji transformasi DTO (snake_case) → entity (camelCase) via mapper, dan penanganan data rusak. Mapper
kanonik fitur risks adalah `riskToDomain` / `riskListToDomain`; DTO yang gagal validasi Zod
dikembalikan sebagai `null` (bukan throw) agar baris rusak difilter, bukan menjatuhkan seluruh list.

```typescript
// src/features/risks/data/mappers/risk.mapper.test.ts
import { describe, it, expect } from "vitest";
import { riskToDomain } from "./risk.mapper";

describe("riskToDomain", () => {
  it("mengubah DTO valid menjadi entity", () => {
    const dto = {
      id: "r1",
      code: "R-001",
      company_id: "co1",
      title: "Serangan siber",
      category: "OPERATIONAL",
      // ...field wajib lain
    };
    const entity = riskToDomain(dto as never);
    expect(entity?.companyId).toBe("co1");
    expect(entity?.title).toBe("Serangan siber");
  });

  it("mengembalikan null saat DTO tidak lolos validasi Zod", () => {
    const rusak = { id: "r1", title: "" }; // field wajib hilang
    expect(riskToDomain(rusak as never)).toBeNull();
  });
});
```

Cakupan:
- ✅ DTO valid → entity (snake_case → camelCase, parse tanggal)
- ✅ Field wajib hilang / tipe salah → `null` (difilter, siap RLS)
- ✅ Pesan error Zod Bahasa Indonesia

### 2.3 Use-case (kondisional)

File: `src/features/<f>/domain/use-cases/*.test.ts`

Buat **hanya saat** ada pemicu §13 (gate izin / multi-langkah). Contoh nyata: `approveTreatment`
(FR-TREAT-3) yang menolak approve ACCEPT bila peran bukan `risk_manager`/`admin`. Repo di-mock via
interface.

```typescript
// src/features/risks/domain/use-cases/approveTreatment.usecase.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { approveTreatment } from "./approveTreatment.usecase";
import type { IRiskRepository } from "../repositories/IRiskRepository";

describe("approveTreatment", () => {
  let mockRepo: IRiskRepository;

  beforeEach(() => {
    mockRepo = { approveTreatment: vi.fn() } as unknown as IRiskRepository;
  });

  it("melempar error saat peran bukan risk_manager/admin", async () => {
    const jalankan = approveTreatment(mockRepo, ["viewer"]);
    await expect(jalankan("t1")).rejects.toThrow();
    expect(mockRepo.approveTreatment).not.toHaveBeenCalled();
  });

  it("memanggil repo saat peran risk_manager", async () => {
    const jalankan = approveTreatment(mockRepo, ["risk_manager"]);
    await jalankan("t1");
    expect(mockRepo.approveTreatment).toHaveBeenCalledWith("t1");
  });
});
```

Cakupan:
- ✅ Gate izin (cek peran)
- ✅ Aturan bisnis (transisi status, atomicity)
- ✅ Repo dipanggil / dilewati sesuai kondisi

---

## 3. Component test (presentation)

File: `src/features/<f>/presentation/components/*.test.tsx`

Render + interaksi user (RTL + Vitest). Mock hook data (`useQuery`, `useMutation`, store Zustand)
agar deterministik.

### 3.1 Komponen form

```typescript
// src/features/risks/presentation/components/RiskForm.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RiskForm } from "./RiskForm";

describe("RiskForm", () => {
  it("menampilkan field form", () => {
    render(<RiskForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Judul Risiko")).toBeInTheDocument();
    expect(screen.getByLabelText("Kategori")).toBeInTheDocument();
  });

  it("menampilkan error Zod saat submit invalid", async () => {
    const user = userEvent.setup();
    render(<RiskForm onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    expect(screen.getByText(/minimal 3 karakter/i)).toBeInTheDocument();
  });

  it("memanggil onSubmit saat form valid", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RiskForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Judul Risiko"), "Serangan siber");
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Serangan siber" }),
    );
  });
});
```

Cakupan:
- ✅ Render field
- ✅ Validasi form (pesan Zod)
- ✅ Interaksi user (type, click)
- ✅ State (loading, error, success)

### 3.2 Komponen terikat data

Mock `useQuery`; uji state loading / error / empty / data.

```typescript
// src/features/risks/presentation/components/RiskList.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as ReactQuery from "@tanstack/react-query";
import { RiskList } from "./RiskList";

vi.mock("@tanstack/react-query");

describe("RiskList", () => {
  it("menampilkan spinner saat loading", () => {
    vi.mocked(ReactQuery.useQuery).mockReturnValue({
      isLoading: true,
      data: undefined,
    } as never);
    render(<RiskList />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("menampilkan empty state saat data kosong", () => {
    vi.mocked(ReactQuery.useQuery).mockReturnValue({
      isLoading: false,
      data: [],
    } as never);
    render(<RiskList />);
    expect(screen.getByText(/belum ada risiko/i)).toBeInTheDocument();
  });

  it("menampilkan pesan error saat query gagal", () => {
    vi.mocked(ReactQuery.useQuery).mockReturnValue({
      isLoading: false,
      error: new Error("Server error"),
    } as never);
    render(<RiskList />);
    expect(screen.getByText(/gagal memuat/i)).toBeInTheDocument();
  });
});
```

Cakupan:
- ✅ Spinner loading
- ✅ Empty state
- ✅ Data ter-render
- ✅ Pesan error

---

## 4. E2E test (Playwright)

File: `e2e/<flow>.spec.ts`. **Catatan:** Playwright sudah terpasang, tetapi script `e2e` **belum**
ada di `package.json` — tambahkan (mis. `"e2e": "playwright test"`) sebelum menjalankan.

Hanya critical path (§11): auth → onboarding → risk register → review/treat.

```typescript
// e2e/risk-workflow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Alur Risiko", () => {
  test("buat lalu setujui treatment risiko", async ({ page }) => {
    await page.goto("/app/risks");
    await page.click("button:has-text('Risiko Baru')");
    await page.fill('input[name="title"]', "Serangan siber");
    await page.click("button:has-text('Simpan')");

    await expect(page.locator("text=Serangan siber")).toBeVisible();
    await page.click("text=Serangan siber");
    await page.click("button:has-text('Tambah Tindakan')");
    await page.fill('textarea[name="description"]', "Pasang firewall");
    await page.click("button:has-text('Simpan')");

    // Approve hanya bila peran risk_manager/admin
    if (await page.locator("button:has-text('Setujui')").isVisible()) {
      await page.click("button:has-text('Setujui')");
      await expect(page.locator("text=Disetujui")).toBeVisible();
    }
  });
});
```

Cakupan:
- ✅ Happy path (onboarding → buat → approve)
- ✅ Isolasi multi-tenant (data user A ≠ user B; RLS)
- ✅ Error handling (input invalid, retry)
- ✅ Responsif (jalankan di mobile + desktop)

---

## 5. Test RLS & Auth (database) — 🎯 target

File: `supabase/tests/*.sql` (pgTAP / `supabase test db`). Menguji policy Postgres + atomicity RPC
(§4.2, D23). **Target** — belum aktif sampai Auth di-provision.

```sql
-- supabase/tests/rls_policy.test.sql
BEGIN;
-- Setup: 2 perusahaan, 2 user, masing-masing punya 1 risiko
-- ... insert companies, users, memberships, risks ...

SET request.jwt.claim.sub = 'user1';
SELECT COUNT(*) FROM public.risks; -- harap 1 (hanya risiko co1)

SET request.jwt.claim.sub = 'user2';
SELECT COUNT(*) FROM public.risks; -- harap 1 (hanya risiko co2)
ROLLBACK;
```

Cakupan:
- ✅ RLS isolasi per `company_id`
- ✅ Tenant A ≠ tenant B
- ✅ Akses anonim ditolak (0 baris)

---

## 6. Format skenario test

Saat membangun fitur (§2), tulis skenario konkret di doc fitur atau PR. Anchor contoh ke API nyata
(`computeRiskLevel`, `riskToDomain`, `newRiskSchema`).

### Format checklist

```markdown
## Test Fitur Risiko

### Unit — Domain (@/lib)
- ✅ computeRiskLevel: skor 16 → "EXTREME"; 15 → "HIGH"; 6 → "MEDIUM"; 1 → "LOW"
- ✅ severityScore: (4, 3) → 12
- ✅ idrCompact: 2_400_000_000 → "Rp 2,4 M"

### Unit — Data
- ✅ riskToDomain: DTO valid → entity (snake → camel)
- ✅ riskToDomain: field wajib hilang → null
- ✅ newRiskSchema: title < 3 → invalid; pesan Bahasa Indonesia

### Unit — Use-case (bila approveTreatment ada)
- ✅ throw saat peran ≠ risk_manager/admin
- ✅ panggil repo saat peran valid; verifikasi argumen

### Component
- ✅ RiskForm: render + error Zod saat invalid
- ✅ RiskList: spinner, empty, data, error
- ✅ Responsif: tanpa overflow di mobile + desktop

### E2E (critical)
- ✅ Buat risiko → tampil di list
- ✅ Buka risiko → tambah treatment → approve
- ✅ Multi-tenant: data user A ≠ user B
```

### Given/When/Then (opsional)

```markdown
**Skenario: approve treatment sebagai risk_manager**
- Given peran user = risk_manager
- When klik tombol "Setujui"
- Then panggil use-case approveTreatment
- And UI menampilkan "Status: Disetujui"
```

---

## 7. Verifikasi manual

Gate cepat sebelum menganggap fitur selesai:

```bash
bun run typecheck   # zero error
bun run build       # zero error
bun run lint        # zero error
bun run test        # vitest run — semua hijau
bun run dev         # cek manual di browser
```

Checklist browser per fitur:
- [ ] State (spinner loading, pesan empty, pesan error) ter-render benar
- [ ] Submit form + error Zod (Bahasa Indonesia)
- [ ] Responsif: mobile (375px) + desktop (1440px); tanpa overflow
- [ ] Data sesuai DB (abaikan draft AI, filter `deletedAt` per PRD §3.11)
- [ ] Multi-tenant: login user A → risiko; ganti ke user B (sesi lain) → risiko berbeda

---

## 8. Penamaan & lokasi

**Unit/component (co-located):**
```
src/features/risks/
├── domain/use-cases/approveTreatment.usecase.test.ts
├── data/mappers/risk.mapper.test.ts
└── presentation/components/RiskForm.test.tsx
```
Atau dikelompokkan di `src/features/risks/__tests__/`.

**E2E:** `e2e/risk-workflow.spec.ts` · **RLS (🎯):** `supabase/tests/rls_policy.test.sql`

Penamaan:
- `<Subject>.test.ts(x)` — mis. `risk.mapper.test.ts`, `RiskForm.test.tsx`
- Blok describe: `describe("<Subject>", ...)`
- Deskripsi test Bahasa Indonesia: `it("mengembalikan EXTREME saat skor >= 16")`

---

## 9. Pola & factory

- **AAA** (Arrange, Act, Assert), satu perilaku per `it()`.
- Factory untuk mock & fixture; reset di `beforeEach`.
- Uji perilaku publik, bukan implementasi privat; mock semua I/O agar deterministik.

```typescript
const makeMockRepo = (override = {}): IRiskRepository =>
  ({
    list: vi.fn().mockResolvedValue([]),
    getById: vi.fn(),
    create: vi.fn(),
    ...override,
  }) as unknown as IRiskRepository;

beforeEach(() => {
  vi.clearAllMocks(); // reset semua pemanggilan mock
});
```

---

## 10. CI Gate

**Wajib hijau** (NFR-12): lint + typecheck + build + test (+ migration dry-run saat Supabase live).

```yaml
# .github/workflows/test.yml (contoh)
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
    - run: bun install
    - run: bun run lint
    - run: bun run typecheck
    - run: bun run build
    - run: bun run test        # Vitest
    # - run: bun run e2e       # Playwright (setelah script e2e ditambahkan)
    # - run: supabase test db  # pgTAP (🎯 setelah Auth live)
```

---

## Checklist — per fitur

- [ ] Skenario ditulis (unit, component, E2E, RLS)
- [ ] Unit: pure function domain + mapper data
- [ ] Use-case (bila ada pemicu §13: izin/multi-langkah)
- [ ] Component: render, state, form
- [ ] E2E: critical path saja (buat, approve, review)
- [ ] RLS: data user A ≠ user B (🎯 level database)
- [ ] Verifikasi manual: typecheck ✅ + build ✅ + test ✅ + browser ✅
- [ ] Penamaan `*.test.ts(x)`, describe + `it()` Bahasa Indonesia
- [ ] Factory mock repo + reset `beforeEach`

---

## 🔗 Dokumen terkait

- [frontend-structure.md](frontend-structure.md) — §11 Testing, §13 kapan use-case
- [PRD.md](../../docs/PRD.md) — D23 RLS, NFR-12 cakupan test
- [conventions.md](conventions.md) — penamaan
