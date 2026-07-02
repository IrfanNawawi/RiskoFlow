import { Card, Icon } from "@/components/ui";

const TONE_MAP = {
  primary: "bg-primary-fixed text-primary",
  success: "bg-risk-low/15 text-risk-low",
  warning: "bg-risk-medium/20 text-secondary",
  error: "bg-error-container text-on-error-container",
} as const;

/** Kartu KPI ringkas: label + nilai + sub-teks + ikon bertema. */
export function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  tone: keyof typeof TONE_MAP;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${TONE_MAP[tone]}`}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      <p className="font-display text-[28px] font-bold tabular-nums text-on-surface">{value}</p>
      <p className="text-[12px] text-text-secondary">{sub}</p>
    </Card>
  );
}
