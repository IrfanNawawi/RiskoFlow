import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Icon } from "./ui";
import { cn, relativeDays } from "@/lib/format";
import { useNotifications } from "@/features/notifications/useNotifications";
import { useNotificationReadStore } from "@/features/notifications/store";
import type { AppNotification, NotificationSeverity } from "@/features/notifications/build";

const SEVERITY_STYLE: Record<NotificationSeverity, string> = {
  critical: "bg-risk-extreme/10 text-risk-extreme",
  warning: "bg-risk-high/15 text-risk-high",
  info: "bg-primary-fixed text-primary",
};

/** Tanggal relatif ringkas untuk baris notifikasi ("hari ini" / "3 hari lagi" / "5 hari lalu"). */
function relativeLabel(iso: string): string {
  const d = relativeDays(iso);
  if (d === 0) return "hari ini";
  return d > 0 ? `${d} hari lagi` : `${Math.abs(d)} hari lalu`;
}

/**
 * Pusat notifikasi in-app (FR-NOTIF §3.10) — lonceng + badge unread + dropdown.
 * Notifikasi diturunkan dari state perusahaan aktif; membuka panel menandai
 * semua sebagai terbaca. ⚠️ Target: email/digest via Cron + Queues.
 */
export function NotificationCenter() {
  const navigate = useNavigate();
  const { notifications, unreadCount } = useNotifications();
  const markRead = useNotificationReadStore((s) => s.markRead);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar / tekan Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next && notifications.length > 0) markRead(notifications.map((n) => n.id));
      return next;
    });
  };

  const goTo = (n: AppNotification) => {
    markRead([n.id]);
    setOpen(false);
    navigate({ to: n.href });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-muted hover:text-primary"
        aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : "Notifikasi"}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon name="notifications" size={22} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-risk-extreme px-1 text-[10px] font-bold text-on-primary">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-[16px] border border-border-hairline bg-surface shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border-hairline px-4 py-3">
            <p className="text-[13px] font-semibold text-on-surface">Notifikasi</p>
            {notifications.length > 0 && (
              <span className="text-[11px] text-text-secondary">{notifications.length} item</span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
              <Icon name="notifications_off" size={28} className="text-outline" />
              <p className="text-[13px] text-text-secondary">Tidak ada notifikasi</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    role="menuitem"
                    onClick={() => goTo(n)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-muted"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        SEVERITY_STYLE[n.severity],
                      )}
                    >
                      <Icon name={n.icon} size={18} />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[13px] font-medium text-on-surface">
                        {n.title}
                      </span>
                      <span className="block truncate text-[12px] text-text-secondary">{n.detail}</span>
                      <span className="mt-0.5 block text-[10px] text-text-secondary">
                        {relativeLabel(n.at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
