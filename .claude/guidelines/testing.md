# Testing — Panduan

> **Status:** runner test **belum dikonfigurasi**. Target PRD (NFR-12): **Vitest + React
> Testing Library** (unit/integration), **Playwright** (E2E flow kritis), **pgTAP /
> `supabase test db`** (RLS policy & RPC). Gate yang tersedia sekarang: `npm run typecheck` +
> `npm run build`. **Skenario testing tetap ditulis** saat membangun fitur, agar siap dieksekusi
> begitu runner masuk.

Lapis test target:

| Lapis | Tool (target) | Peran |
|---|---|---|
| **Unit/logika** | Vitest | layer `domain`/`data` murni (entity/use-case/mapper/Zod) |
| **Component** | Vitest + RTL | render + interaksi kritis (form, state loading/empty/error) |
| **E2E** | Playwright | flow kritis end-to-end (onboarding, buat risiko, approval) |
| **RLS/RPC** | pgTAP | isolasi tenant, gate approval, atomicity RPC (PRD D23) |

Arsitektur target sangat _testable_: `domain`/`data` murni & `@/lib` berisi pure function
(`computeRiskLevel`, `idrCompact`) yang ideal untuk unit test.

## Skenario wajib per fitur

Saat membangun/merapikan fitur, tulis skenario testing konkret (di doc fitur bila ada,
atau di PR), dikelompokkan:

| Jenis | Target | Fokus |
|---|---|---|
| **Unit** | `@/lib` & `domain` pure fn | `computeRiskLevel`, `severityScore`, `idrCompact` — happy + batas |
| **Unit** | `data/mappers` | DTO valid → entity; data rusak → `null`/difilter; validasi Zod |
| **Unit** | `domain/use-cases` | aturan bisnis (mis. tolak approve non-risk_manager); repo di-mock |
| **Unit** | `validation/*.schema` | Zod valid & invalid (pesan error benar) |
| **Component** | `presentation` | smoke render + state loading/empty/error + submit form |
| **RLS** | Postgres policy | data perusahaan A tak terlihat oleh user perusahaan B |

Format skenario (Given/When/Then atau bullet jelas):

```
- ✅ computeRiskLevel: severity 15 → "EXTREME"; 9 → "MEDIUM"; 1 → "LOW"
- ✅ idrCompact: 2_400_000_000 → "Rp 2,4 M"
- ✅ newRiskSchema: title < 3 char → invalid (pesan Bahasa Indonesia)
- ✅ approveTreatment: throw saat peran bukan risk_manager/admin; repo tak dipanggil
- ✅ RLS: user tenant A query risks tenant B → 0 baris
```

## Lokasi & penamaan (saat runner ada)

- Unit/component: co-located `*.test.ts(x)` di sebelah subjek, atau `src/features/<f>/__tests__/`.
- Nama: `<Subject>.test.ts` (mis. `risk.mapper.test.ts`, `risk.spec.ts`).
- E2E Playwright: `e2e/<flow>.spec.ts`. RLS pgTAP: `supabase/tests/*.sql`.

## Pola

- **AAA**: Arrange, Act, Assert. Satu perilaku per `it()`.
- Deskripsi Bahasa Indonesia: `it("mengembalikan EXTREME saat severity >= 15")`.
- Factory untuk mock & fixture (`makeMockRepo()`, `riskFixture`). Reset mock di `beforeEach`.
- Test perilaku publik, bukan implementasi privat. Mock semua I/O (deterministik).

```typescript
// ilustrasi (Vitest) — target, runner belum terpasang
import { describe, it, expect } from "vitest";
import { computeRiskLevel } from "@/lib/risk";

describe("computeRiskLevel", () => {
  it("memetakan severity tinggi ke EXTREME", () => {
    expect(computeRiskLevel(5, 5)).toBe("EXTREME"); // 25
    expect(computeRiskLevel(3, 3)).toBe("MEDIUM");  // 9
  });
});
```

## Verifikasi manual (sebelum runner ada)

Selama test otomatis belum jalan, verifikasi tiap perubahan secara manual:

```bash
npm run typecheck      # wajib hijau
npm run build          # wajib hijau
npm run dev            # cek alur di browser
```

Yang dicek di browser:
- State **loading / empty / error** tampil benar (FR-DASH-6).
- Submit form + validasi Zod (pesan error Bahasa Indonesia).
- **Responsif** di lebar mobile & desktop; tak ada overflow.
- Angka konsisten dengan data (abaikan risiko `deletedAt` & draft AI — PRD §3.11).
