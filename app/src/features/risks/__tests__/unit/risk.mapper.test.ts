import { describe, it, expect } from "vitest";
import { riskToDomain, riskListToDomain } from "@/features/risks/data/mappers/risk.mapper";
import type { RiskDTO } from "@/features/risks/data/datasources/risk.dto";

const validDto: RiskDTO = {
  id: "r-1",
  code: "R-001",
  companyId: "co-1",
  title: "Kegagalan mesin",
  description: "",
  category: "OPERATIONAL",
  source: "INTERNAL",
  departmentId: "d-1",
  ownerId: "u-1",
  status: "assessed",
  aiSuggested: false,
  inherent: { likelihood: 3, impact: 4, severity: 12, level: "HIGH", kind: "inherent", at: "2026-01-01", by: "u-1" },
  reviewFrequency: "quarterly",
  nextReviewDate: "2026-04-01",
  treatments: [],
  kris: [],
  complianceIds: [],
  createdAt: "2026-01-01",
};

describe("risk.mapper", () => {
  it("DTO valid → entity domain", () => {
    expect(riskToDomain(validDto)?.id).toBe("r-1");
  });

  it("DTO rusak (level di luar enum) → null", () => {
    const broken = { ...validDto, inherent: { ...validDto.inherent, level: "CRITICAL" } } as unknown as RiskDTO;
    expect(riskToDomain(broken)).toBeNull();
  });

  it("list memfilter item rusak diam-diam", () => {
    const broken = { ...validDto, id: "" } as RiskDTO;
    expect(riskListToDomain([validDto, broken])).toHaveLength(1);
  });
});
