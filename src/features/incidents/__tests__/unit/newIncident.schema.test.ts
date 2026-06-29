import { describe, it, expect } from "vitest";
import { newIncidentSchema } from "@/features/incidents/validation/newIncident.schema";

const base = {
  title: "Kebocoran pipa",
  occurredAt: "2026-01-10",
  departmentId: "d-1",
  type: "LOSS" as const,
  lossAmount: 5_000_000,
};

describe("newIncidentSchema (FR-INC-1)", () => {
  it("input LOSS valid → lolos", () => {
    expect(newIncidentSchema.safeParse(base).success).toBe(true);
  });

  it("judul < 3 char → pesan Bahasa Indonesia", () => {
    const r = newIncidentSchema.safeParse({ ...base, title: "ab" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Judul minimal 3 karakter");
  });

  it("tanggal di masa depan ditolak", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    expect(newIncidentSchema.safeParse({ ...base, occurredAt: future }).success).toBe(false);
  });

  it("NEAR_MISS dengan lossAmount > 0 ditolak", () => {
    const r = newIncidentSchema.safeParse({ ...base, type: "NEAR_MISS", lossAmount: 1000 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toContain("lossAmount");
  });

  it("NEAR_MISS dengan lossAmount 0 lolos", () => {
    expect(newIncidentSchema.safeParse({ ...base, type: "NEAR_MISS", lossAmount: 0 }).success).toBe(true);
  });
});
