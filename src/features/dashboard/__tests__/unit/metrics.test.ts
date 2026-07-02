import { describe, it, expect } from "vitest";
import type { Risk, Incident, Assessment, Treatment } from "@/data/types";
import {
  activeAssessment,
  confirmedRisks,
  computeMetrics,
  categoryDistribution,
  topRisks,
  risksNeedingReview,
  buildAgenda,
} from "@/features/dashboard/domain";

const DAY_MS = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY_MS).toISOString();

const assessment = (over: Partial<Assessment> = {}): Assessment => ({
  likelihood: 3,
  impact: 3,
  severity: 9,
  level: "HIGH",
  kind: "inherent",
  at: iso(-10),
  by: "u1",
  ...over,
});

const risk = (over: Partial<Risk> = {}): Risk => ({
  id: "r1",
  code: "R-001",
  companyId: "c1",
  title: "Risiko Uji",
  description: "",
  category: "OPERATIONAL",
  source: "INTERNAL",
  departmentId: "d1",
  ownerId: "u1",
  status: "assessed",
  aiSuggested: false,
  inherent: assessment(),
  reviewFrequency: "quarterly",
  nextReviewDate: iso(30),
  treatments: [],
  kris: [],
  complianceIds: [],
  createdAt: iso(-30),
  ...over,
});

const treatment = (over: Partial<Treatment> = {}): Treatment => ({
  id: "t1",
  riskId: "r1",
  strategy: "REDUCE",
  description: "Mitigasi",
  ownerId: "u1",
  dueDate: iso(5),
  status: "in_progress",
  cost: 0,
  ...over,
});

const incident = (over: Partial<Incident> = {}): Incident => ({
  id: "i1",
  companyId: "c1",
  title: "Insiden",
  description: "",
  occurredAt: iso(-3),
  departmentId: "d1",
  type: "LOSS",
  lossAmount: 1_000_000,
  riskIds: [],
  status: "open",
  ...over,
});

describe("activeAssessment", () => {
  it("mengembalikan residual bila ada, jika tidak inherent", () => {
    const r = risk({ residual: assessment({ kind: "residual", severity: 4, level: "MEDIUM" }) });
    expect(activeAssessment(r).kind).toBe("residual");
    expect(activeAssessment(risk()).kind).toBe("inherent");
  });
});

describe("confirmedRisks", () => {
  it("membuang draft AI yang belum dikonfirmasi", () => {
    const list = [risk({ id: "a" }), risk({ id: "b", aiSuggested: true })];
    expect(confirmedRisks(list).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("computeMetrics", () => {
  it("menghitung distribusi level, ter-mitigasi, jatuh tempo, kerugian & eksposur", () => {
    const risks = [
      risk({ id: "a", inherent: assessment({ level: "EXTREME" }), treatments: [treatment()], residual: assessment({ kind: "residual", level: "EXTREME", financialImpact: 5_000_000 }) }),
      risk({ id: "b", inherent: assessment({ level: "LOW", financialImpact: 2_000_000 }), nextReviewDate: iso(-2) }),
      risk({ id: "c", inherent: assessment({ level: "HIGH" }), status: "closed", nextReviewDate: iso(-5) }),
    ];
    const incidents = [incident({ lossAmount: 1_000_000 }), incident({ id: "i2", type: "NEAR_MISS", lossAmount: 0 })];
    const m = computeMetrics(risks, incidents);

    expect(m.total).toBe(3);
    expect(m.byLevel).toEqual({ LOW: 1, MEDIUM: 0, HIGH: 1, EXTREME: 1 });
    expect(m.highPriority).toBe(2);
    expect(m.treated).toBe(1);
    expect(m.treatedPct).toBe(33);
    expect(m.dueReview).toBe(1); // b overdue & bukan closed; c closed → tak dihitung
    expect(m.totalLoss).toBe(1_000_000); // hanya LOSS
    expect(m.exposure).toBe(7_000_000); // 5jt (residual) + 2jt (inherent)
    expect(m.incidentCount).toBe(2);
  });

  it("treatedPct 0 saat tidak ada risiko (hindari bagi nol)", () => {
    expect(computeMetrics([], []).treatedPct).toBe(0);
  });
});

describe("categoryDistribution", () => {
  it("menghitung jumlah per kategori dengan label Indonesia", () => {
    const data = categoryDistribution([risk({ id: "a", category: "FINANCIAL" }), risk({ id: "b", category: "FINANCIAL" }), risk({ id: "c", category: "LEGAL" })]);
    const financial = data.find((d) => d.key === "FINANCIAL");
    expect(financial?.value).toBe(2);
    expect(typeof financial?.name).toBe("string");
  });
});

describe("topRisks", () => {
  it("mengurutkan menurun by severity penilaian aktif & memotong limit", () => {
    const list = [
      risk({ id: "lo", inherent: assessment({ severity: 4 }) }),
      risk({ id: "hi", inherent: assessment({ severity: 20 }) }),
      risk({ id: "mid", inherent: assessment({ severity: 12 }) }),
    ];
    expect(topRisks(list, 2).map((r) => r.id)).toEqual(["hi", "mid"]);
  });
});

describe("risksNeedingReview", () => {
  it("hanya yang jatuh tempo dalam ambang & belum ditutup, urut terdekat", () => {
    const list = [
      risk({ id: "far", nextReviewDate: iso(30) }),
      risk({ id: "soon", nextReviewDate: iso(1) }),
      risk({ id: "over", nextReviewDate: iso(-4) }),
      risk({ id: "closed", nextReviewDate: iso(-1), status: "closed" }),
    ];
    expect(risksNeedingReview(list, 3).map((r) => r.id)).toEqual(["over", "soon"]);
  });
});

describe("buildAgenda", () => {
  it("menggabungkan review & treatment terbuka, urut tanggal, resolve nama via callback", () => {
    const list = [
      risk({ id: "r1", nextReviewDate: iso(10), treatments: [treatment({ id: "t1", dueDate: iso(2) })] }),
      risk({ id: "r2", status: "closed", nextReviewDate: iso(1), treatments: [treatment({ id: "t2", status: "done", dueDate: iso(3) })] }),
    ];
    const agenda = buildAgenda(list, () => "Keuangan", () => "Budi", 10);
    // r2 closed → tak ada review; t2 done → dilewati. Sisa: t1 (day2) & review r1 (day10).
    expect(agenda.map((a) => a.id)).toEqual(["trt-t1", "rev-r1"]);
    expect(agenda[0].who).toBe("Budi");
    expect(agenda[1].who).toBe("Keuangan");
  });

  it("menandai treatment yang menunggu approval", () => {
    const list = [risk({ id: "r1", treatments: [treatment({ id: "t1", approved: false })] })];
    const agenda = buildAgenda(list, () => "-", () => "-");
    expect(agenda.some((a) => a.icon === "approval")).toBe(true);
  });
});
