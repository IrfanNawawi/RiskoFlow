// Entry publik presentation fitur incidents (API lintas-fitur).
// Halaman (pages/) dimuat lazy oleh router via path langsung (main.tsx) — lihat catatan di risks.
export { useIncidents } from "./hooks/useIncidents";
export { useCreateIncident, useLinkIncidentRisk, useApproveIncidentClose } from "./hooks/useIncidentMutations";
