import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createReportPreset, type ReportPreset, type RiskFilter } from "@/features/reports/domain";

/**
 * Preset laporan tersimpan — UI/client state (Aturan inti #4), dipersist ke `localStorage`
 * agar konfigurasi Custom Report Builder bertahan lintas sesi. Array preset JSON-serializable
 * sehingga tak butuh replacer khusus.
 *
 * ⚠️ target: simpan preset per-user di DB (kini global per-browser).
 */
interface ReportPresetState {
  presets: ReportPreset[];
  savePreset: (name: string, columnIds: string[], filter: RiskFilter) => void;
  removePreset: (id: string) => void;
}

export const useReportPresetStore = create<ReportPresetState>()(
  persist(
    (set) => ({
      presets: [],
      savePreset: (name, columnIds, filter) =>
        set((s) => {
          const trimmed = name.trim();
          if (!trimmed) return s;
          const preset = createReportPreset(trimmed, columnIds, filter);
          // Nama sama (case-insensitive) menimpa preset lama.
          const rest = s.presets.filter((p) => p.name.toLowerCase() !== trimmed.toLowerCase());
          return { presets: [...rest, preset] };
        }),
      removePreset: (id) => set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
    }),
    { name: "riskoflow-report-presets", version: 1 },
  ),
);
