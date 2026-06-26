import type { Incident } from "@/data/types";

/**
 * ⚠️ Mock phase: sumber data = Zustand store yang sudah berbentuk domain, jadi
 * `IncidentDTO` identik `Incident`. Target Supabase: baris snake_case (`company_id`,
 * `occurred_at`, `loss_amount`) — pemetaan dipusatkan di mapper.
 */
export type IncidentDTO = Incident;
