import { describe, it, expect } from "vitest";
import { treatmentSchema } from "@/features/risks/validation/treatment.schema";

const base = {
  strategy: "REDUCE" as const,
  description: "Pasang sensor getaran",
  ownerId: "u-1",
  dueDate: "2026-03-01",
  status: "planned" as const,
  cost: 1_000_000,
};

describe("treatmentSchema (FR-TREAT)", () => {
  it("REDUCE valid → lolos", () => {
    expect(treatmentSchema.safeParse(base).success).toBe(true);
  });

  it("deskripsi < 3 → pesan Bahasa Indonesia", () => {
    const r = treatmentSchema.safeParse({ ...base, description: "ab" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Deskripsi minimal 3 karakter");
  });

  it("ACCEPT tanpa justifikasi ditolak", () => {
    const r = treatmentSchema.safeParse({ ...base, strategy: "ACCEPT" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path.includes("justification"))).toBe(true);
  });

  it("ACCEPT dengan justifikasi lolos", () => {
    expect(treatmentSchema.safeParse({ ...base, strategy: "ACCEPT", justification: "Biaya mitigasi > dampak" }).success).toBe(true);
  });

  it("TRANSFER tanpa penyedia ditolak", () => {
    const r = treatmentSchema.safeParse({ ...base, strategy: "TRANSFER" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path.includes("transferProvider"))).toBe(true);
  });

  it("cost negatif ditolak", () => {
    expect(treatmentSchema.safeParse({ ...base, cost: -5 }).success).toBe(false);
  });
});
