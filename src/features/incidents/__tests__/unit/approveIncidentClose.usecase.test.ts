import { describe, it, expect, vi } from "vitest";
import { approveIncidentClose } from "@/features/incidents/domain";
import type { IIncidentRepository } from "@/features/incidents/domain";

function makeRepo() {
  return {
    list: vi.fn(),
    create: vi.fn(),
    linkRisk: vi.fn(),
    approveClose: vi.fn().mockResolvedValue(undefined),
  } satisfies IIncidentRepository;
}

describe("approveIncidentClose use-case (FR-INC-6)", () => {
  it("risk_manager menyetujui → repository dipanggil dengan id benar", async () => {
    const repo = makeRepo();
    await approveIncidentClose(repo, ["risk_manager"])("inc-1");
    expect(repo.approveClose).toHaveBeenCalledWith("inc-1");
  });

  it("peran lain ditolak; repository TIDAK dipanggil", () => {
    const repo = makeRepo();
    expect(() => approveIncidentClose(repo, ["dept_head"])("inc-1")).toThrow(
      "Hanya risk manager atau admin",
    );
    expect(repo.approveClose).not.toHaveBeenCalled();
  });
});
