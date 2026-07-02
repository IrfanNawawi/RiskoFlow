import { describe, it, expect } from "vitest";
import type { Risk, Assessment } from "@/data/types";
import { applyRiskFilter, isRiskFilterActive, EMPTY_RISK_FILTER } from "@/features/reports/domain";

const assessment = (over: Partial<Assessment> = {}): Assessment => ({
  likelihood: 3,
  impact: 3,
  severity: 9,
  level: "HIGH",
  kind: "inherent",
  at: "2026-01-01",
  by: "u1",
  ...over,
});

const risk = (over: Partial<Risk>): Risk =>
  ({
    id: "r",
    category: "OPERATIONAL",
    status: "assessed",
    aiSuggested: false,
    inherent: assessment(),
    treatments: [],
    kris: [],
    complianceIds: [],
    ...over,
  } as Risk);

const sample: Risk[] = [
  risk({ id: "a", category: "FINANCIAL", status: "assessed", inherent: assessment({ level: "EXTREME" }) }),
  risk({ id: "b", category: "OPERATIONAL", status: "closed", inherent: assessment({ level: "LOW" }) }),
  risk({ id: "c", category: "FINANCIAL", status: "monitored", inherent: assessment({ level: "HIGH" }) }),
];

describe("applyRiskFilter", () => {
  it("filter kosong meloloskan semua risiko", () => {
    expect(applyRiskFilter(sample, EMPTY_RISK_FILTER)).toHaveLength(3);
  });

  it("filter level memakai penilaian aktif (residual ?? inherent)", () => {
    const withResidual = risk({ id: "d", inherent: assessment({ level: "EXTREME" }), residual: assessment({ kind: "residual", level: "LOW" }) });
    const out = applyRiskFilter([withResidual], { levels: ["LOW"], categories: [], statuses: [] });
    expect(out.map((r) => r.id)).toEqual(["d"]); // residual LOW menang, bukan inherent EXTREME
  });

  it("menggabungkan dimensi dengan AND", () => {
    const out = applyRiskFilter(sample, { levels: ["EXTREME", "HIGH"], categories: ["FINANCIAL"], statuses: [] });
    expect(out.map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("filter status menyaring tepat", () => {
    expect(applyRiskFilter(sample, { levels: [], categories: [], statuses: ["closed"] }).map((r) => r.id)).toEqual(["b"]);
  });
});

describe("isRiskFilterActive", () => {
  it("false hanya saat semua dimensi kosong", () => {
    expect(isRiskFilterActive(EMPTY_RISK_FILTER)).toBe(false);
    expect(isRiskFilterActive({ levels: ["LOW"], categories: [], statuses: [] })).toBe(true);
  });
});
