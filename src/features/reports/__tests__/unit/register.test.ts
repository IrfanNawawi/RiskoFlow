import { describe, it, expect } from "vitest";
import type { Risk } from "@/data/types";
import { reportableRisks } from "@/features/reports/domain";

const baseRisk = (over: Partial<Risk>): Risk =>
  ({
    id: "r",
    aiSuggested: false,
    treatments: [],
    kris: [],
    complianceIds: [],
    ...over,
  } as Risk);

describe("reportableRisks", () => {
  it("hanya menyertakan risiko terkonfirmasi (buang draft AI, FR-RISK-5)", () => {
    const list = [baseRisk({ id: "a" }), baseRisk({ id: "b", aiSuggested: true }), baseRisk({ id: "c" })];
    expect(reportableRisks(list).map((r) => r.id)).toEqual(["a", "c"]);
  });
});
