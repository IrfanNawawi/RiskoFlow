import type { RiskLevel, RiskCategory, RiskSource } from "@/data/types";

/**
 * Canonical severity → level mapping (PRD D4). In production this is a DB
 * generated column + IMMUTABLE function; the client mirror keeps UI in sync.
 */
export function computeRiskLevel(likelihood: number, impact: number): RiskLevel {
  const score = likelihood * impact;
  if (score >= 15) return "EXTREME";
  if (score >= 10) return "HIGH";
  if (score >= 5) return "MEDIUM";
  return "LOW";
}

export function severityScore(likelihood: number, impact: number): number {
  return likelihood * impact;
}

export const RISK_LEVEL_META: Record<
  RiskLevel,
  { label: string; color: string; onColor: string; bg: string; text: string }
> = {
  LOW: { label: "Low", color: "var(--color-risk-low)", onColor: "#fff", bg: "bg-risk-low", text: "text-risk-low" },
  MEDIUM: { label: "Medium", color: "var(--color-risk-medium)", onColor: "#3d2c00", bg: "bg-risk-medium", text: "text-risk-medium" },
  HIGH: { label: "High", color: "var(--color-risk-high)", onColor: "#fff", bg: "bg-risk-high", text: "text-risk-high" },
  EXTREME: { label: "Extreme", color: "var(--color-risk-extreme)", onColor: "#fff", bg: "bg-risk-extreme", text: "text-risk-extreme" },
};

export const CATEGORY_META: Record<RiskCategory, { label: string; icon: string }> = {
  FINANCIAL: { label: "Keuangan", icon: "payments" },
  OPERATIONAL: { label: "Operasional", icon: "settings_suggest" },
  LEGAL: { label: "Hukum", icon: "gavel" },
  REPUTATIONAL: { label: "Reputasi", icon: "campaign" },
  STRATEGIC: { label: "Strategis", icon: "strategy" },
};

export const SOURCE_META: Record<RiskSource, string> = {
  INTERNAL: "Internal",
  EXTERNAL: "Eksternal",
};

export const STATUS_META: Record<
  string,
  { label: string; step: number }
> = {
  identified: { label: "Identified", step: 0 },
  assessed: { label: "Assessed", step: 1 },
  treated: { label: "Mitigating", step: 2 },
  monitored: { label: "Monitoring", step: 3 },
  closed: { label: "Closed", step: 4 },
};

export const LIKELIHOOD_LABELS = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
export const IMPACT_LABELS = ["", "Insignificant", "Minor", "Moderate", "Major", "Catastrophic"];

/** Cell color for the 5×5 matrix at (likelihood, impact). */
export function cellLevel(likelihood: number, impact: number): RiskLevel {
  return computeRiskLevel(likelihood, impact);
}
