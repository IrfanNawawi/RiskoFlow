import { describe, it, expect } from "vitest";
import { buildNotifications } from "@/features/notifications/build";
import type { Assessment, Incident, Risk } from "@/data/types";

const NOW = new Date("2026-07-02T00:00:00.000Z").getTime();
const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString();

const assessment: Assessment = {
  likelihood: 3,
  impact: 3,
  severity: 9,
  level: "MEDIUM",
  kind: "inherent",
  at: iso(-30),
  by: "u1",
};

function makeRisk(over: Partial<Risk> = {}): Risk {
  return {
    id: "r1",
    code: "R-001",
    companyId: "c1",
    title: "Risiko uji",
    description: "",
    category: "OPERATIONAL",
    source: "INTERNAL",
    departmentId: "d1",
    ownerId: "u1",
    status: "monitored",
    aiSuggested: false,
    inherent: assessment,
    reviewFrequency: "quarterly",
    nextReviewDate: iso(90),
    treatments: [],
    kris: [],
    complianceIds: [],
    createdAt: iso(-90),
    ...over,
  };
}

function makeIncident(over: Partial<Incident> = {}): Incident {
  return {
    id: "i1",
    companyId: "c1",
    title: "Insiden uji",
    description: "",
    occurredAt: iso(-5),
    departmentId: "d1",
    type: "LOSS",
    lossAmount: 100_000_000,
    riskIds: [],
    status: "open",
    ...over,
  };
}

describe("buildNotifications (FR-NOTIF)", () => {
  it("menandai review terlambat sebagai critical", () => {
    const out = buildNotifications([makeRisk({ nextReviewDate: iso(-3) })], [], NOW);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "review_overdue", severity: "critical", href: "/risks/r1" });
    expect(out[0].detail).toContain("3 hari");
  });

  it("jatuh tempo hari ini tetap dihitung terlambat", () => {
    const out = buildNotifications([makeRisk({ nextReviewDate: iso(0) })], [], NOW);
    expect(out[0].kind).toBe("review_overdue");
    expect(out[0].detail).toBe("Jatuh tempo hari ini");
  });

  it("review dalam ≤7 hari = warning, di luar itu diabaikan", () => {
    const soon = buildNotifications([makeRisk({ nextReviewDate: iso(5) })], [], NOW);
    expect(soon[0]).toMatchObject({ kind: "review_due", severity: "warning" });

    const later = buildNotifications([makeRisk({ nextReviewDate: iso(20) })], [], NOW);
    expect(later).toHaveLength(0);
  });

  it("mengabaikan risiko berstatus closed", () => {
    const out = buildNotifications([makeRisk({ status: "closed", nextReviewDate: iso(-10) })], [], NOW);
    expect(out).toHaveLength(0);
  });

  it("hanya insiden approved yang jadi notifikasi info", () => {
    const out = buildNotifications(
      [],
      [makeIncident({ id: "i1", approved: true }), makeIncident({ id: "i2", approved: false })],
      NOW,
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "incident_approved", severity: "info", href: "/incidents" });
  });

  it("mengurutkan critical → warning → info", () => {
    const out = buildNotifications(
      [
        makeRisk({ id: "r1", nextReviewDate: iso(5) }), // warning
        makeRisk({ id: "r2", code: "R-002", nextReviewDate: iso(-2) }), // critical
      ],
      [makeIncident({ id: "i1", approved: true })], // info
      NOW,
    );
    expect(out.map((n) => n.severity)).toEqual(["critical", "warning", "info"]);
  });

  it("id review stabil dari riskId + tanggal review", () => {
    const risk = makeRisk({ nextReviewDate: iso(-1) });
    const a = buildNotifications([risk], [], NOW)[0].id;
    const b = buildNotifications([risk], [], NOW)[0].id;
    expect(a).toBe(b);
    expect(a).toBe(`review:r1:${risk.nextReviewDate}`);
  });
});
