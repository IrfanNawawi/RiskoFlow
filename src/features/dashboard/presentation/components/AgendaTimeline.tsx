import { Link } from "@tanstack/react-router";
import { Card, Icon, Button, SectionTitle } from "@/components/ui";
import { relativeDays, fmtDate } from "@/lib/format";
import type { AgendaItem } from "@/features/dashboard/domain";

function agendaDateLabel(iso: string): string {
  const days = relativeDays(iso);
  if (days === 0) return "Hari ini";
  if (days === 1) return "Besok";
  if (days === -1) return "Kemarin";
  if (days < 0) return `${Math.abs(days)} hari lalu`;
  if (days <= 7) return `${days} hari lagi`;
  return fmtDate(iso);
}

/** Sidebar agenda & timeline: review risiko & due date mitigasi mendatang. */
export function AgendaTimeline({ items }: { items: AgendaItem[] }) {
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-1 flex items-center justify-between">
        <SectionTitle>Agenda & Timeline</SectionTitle>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <Icon name="calendar_month" size={18} />
        </span>
      </div>
      <p className="mb-4 text-[12px] text-text-secondary">{today}</p>

      {items.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-text-secondary">Belum ada agenda mendatang.</p>
      ) : (
        <ol className="relative flex flex-col gap-4 border-l border-border-hairline pl-5">
          {items.map((it) => {
            const overdue = relativeDays(it.date) < 0;
            return (
              <li key={it.id} className="relative">
                <span
                  className={`absolute -left-[26px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-surface ${overdue ? "bg-error" : "bg-primary"}`}
                />
                <Link to="/risks/$riskId" params={{ riskId: it.riskId }} className="block rounded-[12px] -mx-2 px-2 py-1 hover:bg-surface-muted">
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${overdue ? "text-error" : "text-primary"}`}>
                    {agendaDateLabel(it.date)}
                  </p>
                  <p className="mt-0.5 truncate text-[14px] font-medium text-on-surface">{it.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[12px] text-text-secondary">
                    <Icon name={it.icon} size={14} /> {it.who}
                  </p>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      <Link to="/risks" className="mt-auto pt-5">
        <Button variant="outline" icon="add" className="w-full">Tambah Agenda</Button>
      </Link>
    </Card>
  );
}
