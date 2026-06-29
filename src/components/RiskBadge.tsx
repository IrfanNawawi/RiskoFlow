import { RISK_LEVEL_META } from "@/lib/risk";
import type { RiskLevel } from "@/data/types";
import { cn } from "@/lib/format";

/**
 * Risk badge (DESIGN.md §Components): pill-shaped, three identifiers —
 * level color + text label + numeric score. Never color-only (NFR-09).
 */
export function RiskBadge({
  level,
  score,
  size = "md",
}: {
  level: RiskLevel;
  score: number;
  size?: "sm" | "md";
}) {
  const meta = RISK_LEVEL_META[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold leading-none",
        size === "sm" ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-[12px]",
      )}
      style={{ backgroundColor: meta.color, color: meta.onColor }}
    >
      <span className="uppercase tracking-wide">{meta.label}</span>
      <span
        className="tnum rounded-full px-1.5 py-0.5 text-[11px] font-bold"
        style={{ backgroundColor: "rgba(0,0,0,0.18)" }}
      >
        {score}
      </span>
    </span>
  );
}
