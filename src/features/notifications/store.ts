import { create } from "zustand";

/**
 * Read-state notifikasi — UI/client state (Aturan inti #4), in-memory.
 * Notifikasi sendiri diturunkan dari data (lihat `build.ts`); di sini hanya
 * dilacak id mana yang sudah dibaca agar badge unread akurat lintas render.
 * Reset saat reload (tak dipersist) — dapat diterima untuk dual-mode mock.
 */
interface NotificationReadState {
  readIds: Set<string>;
  markRead: (ids: string[]) => void;
}

export const useNotificationReadStore = create<NotificationReadState>((set) => ({
  readIds: new Set(),
  markRead: (ids) =>
    set((s) => {
      if (ids.every((id) => s.readIds.has(id))) return s; // hindari re-render tak perlu
      const next = new Set(s.readIds);
      for (const id of ids) next.add(id);
      return { readIds: next };
    }),
}));
