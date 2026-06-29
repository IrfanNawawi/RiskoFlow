import { describe, it, expect } from "vitest";
import { complianceToDomain, complianceListToDomain } from "@/features/compliance/data/mappers/compliance.mapper";
import type { ComplianceDTO } from "@/features/compliance/data/datasources/compliance.dto";

const validDto: ComplianceDTO = {
  id: "c-1",
  companyId: "co-1",
  industryType: "GENERAL",
  regulationName: "ISO 31000:2018",
  description: "Kerangka manajemen risiko.",
  authority: "ISO",
  isSystem: true,
  status: "partial",
  progress: 40,
  linkedRiskIds: [],
};

describe("compliance.mapper", () => {
  it("DTO valid → entity domain", () => {
    expect(complianceToDomain(validDto)?.id).toBe("c-1");
  });

  it("progress di luar 0..100 → null", () => {
    const broken = { ...validDto, progress: 140 } as ComplianceDTO;
    expect(complianceToDomain(broken)).toBeNull();
  });

  it("list memfilter item rusak diam-diam", () => {
    const broken = { ...validDto, status: "unknown" } as unknown as ComplianceDTO;
    expect(complianceListToDomain([validDto, broken])).toHaveLength(1);
  });
});
