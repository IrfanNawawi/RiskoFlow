import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/data/store";

// FR-MON-4: KRI per risiko + status terlampaui (breach) dihitung dari angka ter-parse.
describe("KRI store (FR-MON-4)", () => {
  beforeEach(() => {
    useStore.setState({ activeCompanyId: useStore.getState().companies[0].id });
  });

  it("addKri menghitung breach=true saat current ≥ threshold", () => {
    const risk = useStore.getState().activeRisks()[0];
    const id = useStore.getState().addKri(risk.id, { name: "Downtime", current: "95%", threshold: "90%" });
    const kri = useStore.getState().risks.find((r) => r.id === risk.id)!.kris.find((k) => k.id === id)!;
    expect(kri.breached).toBe(true);
    expect(kri.ratio).toBe(1);
  });

  it("addKri breach=false saat di bawah ambang", () => {
    const risk = useStore.getState().activeRisks()[0];
    const id = useStore.getState().addKri(risk.id, { name: "Utilisasi", current: "40", threshold: "80" });
    const kri = useStore.getState().risks.find((r) => r.id === risk.id)!.kris.find((k) => k.id === id)!;
    expect(kri.breached).toBe(false);
    expect(kri.ratio).toBeCloseTo(0.5);
  });

  it("updateKri & removeKri bekerja", () => {
    const risk = useStore.getState().activeRisks()[0];
    const id = useStore.getState().addKri(risk.id, { name: "X", current: "1", threshold: "10" });
    useStore.getState().updateKri(risk.id, id, { name: "X2", current: "10", threshold: "10" });
    let kri = useStore.getState().risks.find((r) => r.id === risk.id)!.kris.find((k) => k.id === id);
    expect(kri?.name).toBe("X2");
    expect(kri?.breached).toBe(true);

    useStore.getState().removeKri(risk.id, id);
    kri = useStore.getState().risks.find((r) => r.id === risk.id)!.kris.find((k) => k.id === id);
    expect(kri).toBeUndefined();
  });
});
