import type { ComplianceRequirement } from "@/data/types";

/**
 * ⚠️ Mock phase: `ComplianceDTO` identik `ComplianceRequirement` (store sudah domain-shaped).
 * Target Supabase: baris snake_case (`company_id`, `is_system`, `linked_risk_ids`).
 */
export type ComplianceDTO = ComplianceRequirement;
