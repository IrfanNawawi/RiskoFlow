import { describe, it, expect, beforeEach } from "vitest";
import { useReportPresetStore } from "@/features/reports/presentation/stores/reportPresetStore";
import { EMPTY_RISK_FILTER, type RiskFilter } from "@/features/reports/domain";

const KEY = "riskoflow-report-presets";
const filter: RiskFilter = { levels: ["HIGH"], categories: [], statuses: [] };

beforeEach(() => {
  localStorage.clear();
  useReportPresetStore.setState({ presets: [] });
});

describe("useReportPresetStore", () => {
  it("savePreset menyimpan kolom + filter (deep copy) & persist ke localStorage", () => {
    useReportPresetStore.getState().savePreset("Bulanan", ["kategori", "status"], { ...filter });
    const [p] = useReportPresetStore.getState().presets;
    expect(p.name).toBe("Bulanan");
    expect(p.columnIds).toEqual(["kategori", "status"]);
    expect(p.filter.levels).toEqual(["HIGH"]);
    expect(JSON.parse(localStorage.getItem(KEY)!).state.presets).toHaveLength(1);
  });

  it("nama sama (case-insensitive) menimpa preset lama", () => {
    const s = useReportPresetStore.getState();
    s.savePreset("Q1", ["kategori"], EMPTY_RISK_FILTER);
    s.savePreset("q1", ["status", "owner"], EMPTY_RISK_FILTER);
    const list = useReportPresetStore.getState().presets;
    expect(list).toHaveLength(1);
    expect(list[0].columnIds).toEqual(["status", "owner"]);
  });

  it("nama kosong diabaikan", () => {
    useReportPresetStore.getState().savePreset("   ", ["kategori"], EMPTY_RISK_FILTER);
    expect(useReportPresetStore.getState().presets).toHaveLength(0);
  });

  it("removePreset menghapus by id", () => {
    useReportPresetStore.getState().savePreset("A", [], EMPTY_RISK_FILTER);
    const id = useReportPresetStore.getState().presets[0].id;
    useReportPresetStore.getState().removePreset(id);
    expect(useReportPresetStore.getState().presets).toHaveLength(0);
  });

  it("mutasi filter setelah simpan tidak mengubah preset (deep copy)", () => {
    const mutable: RiskFilter = { levels: ["LOW"], categories: [], statuses: [] };
    useReportPresetStore.getState().savePreset("X", [], mutable);
    mutable.levels.push("HIGH");
    expect(useReportPresetStore.getState().presets[0].filter.levels).toEqual(["LOW"]);
  });
});
