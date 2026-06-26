import { useMemo } from "react";
import { RISK_LEVEL_META, cellLevel } from "@/lib/risk";
import type { Risk } from "@/data/types";
import { cn } from "@/lib/format";

/**
 * 5×5 risk matrix (FR-ASSESS-4). Rows = impact (5 at top), cols = likelihood.
 * Each cell shows the count of active risks at (likelihood, impact); click → filter.
 */
export function Heatmap({
  risks,
  onCellClick,
  selected,
  compact = false,
}: {
  risks: Risk[];
  onCellClick?: (likelihood: number, impact: number) => void;
  selected?: { likelihood: number; impact: number } | null;
  compact?: boolean;
}) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of risks) {
      const a = r.residual ?? r.inherent;
      const key = `${a.likelihood}-${a.impact}`;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [risks]);

  const impacts = [5, 4, 3, 2, 1];
  const likelihoods = [1, 2, 3, 4, 5];
  const gap = compact ? "gap-1.5" : "gap-2.5";

  return (
    <div className="flex gap-3">
      {/* Y axis label */}
      <div className="flex items-stretch">
        <span className="rotate-180 self-center text-[11px] font-semibold uppercase tracking-wide text-text-secondary [writing-mode:vertical-rl]">
          Impact →
        </span>
      </div>

      {/* Impact tick numbers, aligned to each row */}
      <div className={cn("grid grid-rows-5", gap)}>
        {impacts.map((im) => (
          <span key={im} className="flex items-center text-[11px] font-semibold text-text-secondary tabular-nums">
            {im}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className={cn("grid grid-cols-5", gap)}>
          {impacts.map((impact) =>
            likelihoods.map((likelihood) => {
              const level = cellLevel(likelihood, impact);
              const count = counts.get(`${likelihood}-${impact}`) ?? 0;
              const isSel = selected?.likelihood === likelihood && selected?.impact === impact;
              return (
                <button
                  key={`${likelihood}-${impact}`}
                  onClick={() => onCellClick?.(likelihood, impact)}
                  disabled={!onCellClick}
                  title={`Likelihood ${likelihood} × Impact ${impact} — ${count} risiko`}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-[6px] font-bold tabular-nums transition-all",
                    compact ? "min-h-[34px] text-[13px]" : "min-h-[54px] text-[18px]",
                    onCellClick && "cursor-pointer hover:scale-[1.06] hover:shadow-md",
                    isSel && "ring-2 ring-on-surface ring-offset-2",
                  )}
                  style={{
                    backgroundColor: RISK_LEVEL_META[level].color,
                    color: RISK_LEVEL_META[level].onColor,
                    opacity: count === 0 ? 0.4 : 1,
                  }}
                >
                  {count > 0 ? count : ""}
                </button>
              );
            }),
          )}
        </div>
        {/* X axis */}
        <div className={cn("mt-2 grid grid-cols-5", gap)}>
          {likelihoods.map((l) => (
            <span key={l} className="text-center text-[11px] font-semibold text-text-secondary tabular-nums">
              {l}
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          Likelihood →
        </p>
      </div>
    </div>
  );
}

export function HeatmapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {(["LOW", "MEDIUM", "HIGH", "EXTREME"] as const).map((lvl) => (
        <div key={lvl} className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: RISK_LEVEL_META[lvl].color }} />
          <span className="text-[11px] font-medium text-text-secondary">{RISK_LEVEL_META[lvl].label}</span>
        </div>
      ))}
    </div>
  );
}
