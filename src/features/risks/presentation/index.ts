// Entry publik presentation fitur risks (API lintas-fitur).
// Halaman (pages/) TIDAK di-re-export di sini: dimuat lazy oleh router via path
// langsung (main.tsx) agar tetap ter-split per chunk (NFR-02).
export { useRisks, useRisk } from "./hooks/useRisks";
export { riskKeys } from "./hooks/riskKeys";
export {
  useCreateRisk,
  useAddSuggestedRisks,
  useConfirmAiRisk,
  useAddTreatment,
  useUpdateTreatment,
  useApproveTreatment,
  useRecordReview,
  useAddKri,
  useUpdateKri,
  useRemoveKri,
} from "./hooks/useRiskMutations";
