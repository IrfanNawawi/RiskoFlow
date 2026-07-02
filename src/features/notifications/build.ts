import type { Incident, Risk } from "@/data/types";

/** Tingkat urgensi notifikasi — memetakan warna & urutan tampil. */
export type NotificationSeverity = "critical" | "warning" | "info";

/** Jenis kejadian in-app yang memicu notifikasi (FR-NOTIF §3.10). */
export type NotificationKind = "review_overdue" | "review_due" | "incident_approved";

export interface AppNotification {
  id: string; // stabil antar-render agar read-state konsisten
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  detail: string;
  at: string; // ISO — acuan urut & tampilan relatif
  href: string; // rute tujuan saat diklik
  icon: string; // Material Symbol
}

/** Ambang "akan jatuh tempo" — review dalam ≤ N hari dianggap mendesak. */
const DUE_SOON_DAYS = 7;
const DAY_MS = 86_400_000;
const SEVERITY_ORDER: Record<NotificationSeverity, number> = { critical: 0, warning: 1, info: 2 };

/**
 * Turunkan notifikasi in-app dari state perusahaan aktif (pure, tanpa side-effect).
 * Sumber: review risiko yang jatuh tempo/terlambat + insiden yang penutupannya disetujui.
 * Urut: paling mendesak dahulu (severity), lalu tanggal paling lampau.
 * ⚠️ Target: kelak dipicu Cron/Queues server (email digest); kini murni derivasi klien.
 */
export function buildNotifications(
  risks: Risk[],
  incidents: Incident[],
  now: number = Date.now(),
): AppNotification[] {
  const out: AppNotification[] = [];

  for (const r of risks) {
    if (r.status === "closed") continue;
    const days = Math.round((new Date(r.nextReviewDate).getTime() - now) / DAY_MS);
    const id = `review:${r.id}:${r.nextReviewDate}`;
    if (days <= 0) {
      out.push({
        id,
        kind: "review_overdue",
        severity: "critical",
        title: `Review terlambat — ${r.code}`,
        detail: days === 0 ? "Jatuh tempo hari ini" : `Terlambat ${Math.abs(days)} hari`,
        at: r.nextReviewDate,
        href: `/risks/${r.id}`,
        icon: "event_busy",
      });
    } else if (days <= DUE_SOON_DAYS) {
      out.push({
        id,
        kind: "review_due",
        severity: "warning",
        title: `Review akan jatuh tempo — ${r.code}`,
        detail: `Dalam ${days} hari`,
        at: r.nextReviewDate,
        href: `/risks/${r.id}`,
        icon: "event_upcoming",
      });
    }
  }

  for (const i of incidents) {
    if (i.approved !== true) continue;
    out.push({
      id: `incident:${i.id}`,
      kind: "incident_approved",
      severity: "info",
      title: "Penutupan insiden disetujui",
      detail: i.title,
      at: i.occurredAt,
      href: "/incidents",
      icon: "task_alt",
    });
  }

  return out.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}
