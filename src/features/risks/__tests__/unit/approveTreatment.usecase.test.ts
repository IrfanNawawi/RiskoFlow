import { describe, it, expect, vi } from "vitest";
import { approveTreatment } from "@/features/risks/domain";
import type { IRiskRepository } from "@/features/risks/domain";

function makeRepo() {
  return {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    addSuggested: vi.fn(),
    confirmAiSuggested: vi.fn(),
    addTreatment: vi.fn(),
    updateTreatment: vi.fn(),
    approveTreatment: vi.fn().mockResolvedValue(undefined),
    recordReview: vi.fn(),
    addKri: vi.fn(),
    updateKri: vi.fn(),
    removeKri: vi.fn(),
  } satisfies IRiskRepository;
}

describe("approveTreatment use-case (FR-TREAT-3)", () => {
  it("risk_manager dapat menyetujui → repository dipanggil dengan argumen benar", async () => {
    const repo = makeRepo();
    await approveTreatment(repo, ["risk_manager"])("r-1", "t-1");
    expect(repo.approveTreatment).toHaveBeenCalledWith("r-1", "t-1");
  });

  it("admin juga boleh menyetujui", async () => {
    const repo = makeRepo();
    await approveTreatment(repo, ["admin"])("r-1", "t-1");
    expect(repo.approveTreatment).toHaveBeenCalledOnce();
  });

  it("peran lain ditolak; repository TIDAK dipanggil", () => {
    const repo = makeRepo();
    expect(() => approveTreatment(repo, ["executive"])("r-1", "t-1")).toThrow(
      "Hanya risk manager atau admin",
    );
    expect(repo.approveTreatment).not.toHaveBeenCalled();
  });
});
