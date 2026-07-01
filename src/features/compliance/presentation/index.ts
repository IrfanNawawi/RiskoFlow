// Entry publik presentation fitur compliance (API lintas-fitur).
// Halaman (pages/) dimuat lazy oleh router via path langsung (main.tsx) — lihat catatan di risks.
export { useCompliances } from "./hooks/useCompliances";
export {
  useSetComplianceMapping,
  useCreateCompliance,
  useUpdateCompliance,
  useRemoveCompliance,
  useDuplicateCompliance,
} from "./hooks/useComplianceMutations";
