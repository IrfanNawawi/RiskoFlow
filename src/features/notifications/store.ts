import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Read-state notifikasi — UI/client state (Aturan inti #4).
 * Notifikasi sendiri diturunkan dari data (lihat `build.ts`); di sini hanya dilacak id
 * mana yang sudah dibaca agar badge unread akurat lintas render **dan lintas reload**.
 *
 * Dipersist ke `localStorage` (pengganti mock; target 🎯 = simpan per-user di DB).
 * `Set` bukan JSON-serializable → dikonversi ke array lewat replacer/reviver.
 */
interface NotificationReadState {
  readIds: Set<string>;
  markRead: (ids: string[]) => void;
}

interface SerializedSet {
  __set: string[];
}
const isSerializedSet = (v: unknown): v is SerializedSet =>
  typeof v === "object" && v !== null && Array.isArray((v as SerializedSet).__set);

export const useNotificationReadStore = create<NotificationReadState>()(
  persist(
    (set) => ({
      readIds: new Set(),
      markRead: (ids) =>
        set((s) => {
          if (ids.every((id) => s.readIds.has(id))) return s; // hindari re-render tak perlu
          const next = new Set(s.readIds);
          for (const id of ids) next.add(id);
          return { readIds: next };
        }),
    }),
    {
      name: "riskoflow-notif-read",
      version: 1,
      partialize: (s) => ({ readIds: s.readIds }),
      storage: createJSONStorage(() => localStorage, {
        replacer: (_key, value) => (value instanceof Set ? { __set: [...value] } : value),
        reviver: (_key, value) => (isSerializedSet(value) ? new Set(value.__set) : value),
      }),
    },
  ),
);
