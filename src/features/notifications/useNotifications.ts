import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { buildNotifications, type AppNotification } from "./build";
import { useNotificationReadStore } from "./store";

export interface NotificationsView {
  notifications: AppNotification[];
  unreadCount: number;
  readIds: Set<string>;
}

/**
 * Notifikasi in-app untuk perusahaan aktif + jumlah yang belum dibaca.
 * Data di-scope tenant aktif via selector store (`activeRisks`/`activeIncidents`).
 */
export function useNotifications(): NotificationsView {
  const risks = useStore(useShallow((s) => s.activeRisks()));
  const incidents = useStore(useShallow((s) => s.activeIncidents()));
  const readIds = useNotificationReadStore((s) => s.readIds);

  const notifications = useMemo(() => buildNotifications(risks, incidents), [risks, incidents]);
  const unreadCount = useMemo(
    () => notifications.reduce((n, item) => (readIds.has(item.id) ? n : n + 1), 0),
    [notifications, readIds],
  );

  return { notifications, unreadCount, readIds };
}
