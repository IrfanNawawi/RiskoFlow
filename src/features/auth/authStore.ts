import { create } from "zustand";
import { isAuthEnabled, supabase } from "@/lib/supabase";
import { useStore } from "@/data/store";
import * as seed from "@/data/seed";

/**
 * State autentikasi (dual-mode):
 * - **Supabase** (`isAuthEnabled`): sesi nyata via Supabase Auth
 *   (`getSession` + `onAuthStateChange`); `user.id` → `currentUserId` store.
 * - **Mock** (env kosong): "login" disimulasikan — pilih user demo; sesi dipersist
 *   di `localStorage`. Kunjungan pertama auto-login sebagai user seed agar app langsung
 *   dapat dipakai (perilaku lama dipertahankan); setelah logout wajib pilih ulang.
 *
 * ⚠️ Otorisasi sebenarnya = RLS Postgres berbasis `auth.uid()` (target, NFR-01).
 * `currentUserId` di store hanya untuk scoping UI/mock.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  /** Panggil sekali saat boot (lihat `AuthGate`). Mengembalikan fungsi cleanup. */
  initialize: () => void | (() => void);
  signInWithPassword: (email: string, password: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  /** Login mock sebagai user demo tertentu (mode env kosong). */
  signInAsMockUser: (userId: string) => void;
  signOut: () => Promise<void>;
}

const MOCK_KEY = "riskoflow-auth";
const MOCK_SIGNED_OUT = "signed-out";

const applyUser = (userId: string) => useStore.getState().setCurrentUser(userId);

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  userId: null,
  email: null,

  initialize: () => {
    if (isAuthEnabled) {
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user;
        if (u) {
          applyUser(u.id);
          set({ status: "authenticated", userId: u.id, email: u.email ?? null });
        } else {
          set({ status: "unauthenticated", userId: null, email: null });
        }
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        const u = session?.user;
        if (u) {
          applyUser(u.id);
          set({ status: "authenticated", userId: u.id, email: u.email ?? null });
        } else {
          set({ status: "unauthenticated", userId: null, email: null });
        }
      });
      return () => sub.subscription.unsubscribe();
    }

    // Mode mock.
    const stored = localStorage.getItem(MOCK_KEY);
    if (stored === MOCK_SIGNED_OUT) {
      set({ status: "unauthenticated", userId: null, email: null });
      return;
    }
    const userId = stored ?? seed.currentUserId; // kunjungan pertama → user seed
    if (!stored) localStorage.setItem(MOCK_KEY, userId);
    applyUser(userId);
    set({ status: "authenticated", userId, email: null });
  },

  signInWithPassword: async (email, password) => {
    if (!isAuthEnabled) {
      return { ok: false, reason: "Login email/password memerlukan Supabase aktif. Gunakan pilihan user demo." };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, reason: error.message };
    const u = data.user;
    if (u) {
      applyUser(u.id);
      set({ status: "authenticated", userId: u.id, email: u.email ?? null });
    }
    return { ok: true };
  },

  signInAsMockUser: (userId) => {
    localStorage.setItem(MOCK_KEY, userId);
    applyUser(userId);
    set({ status: "authenticated", userId, email: null });
  },

  signOut: async () => {
    if (isAuthEnabled) {
      await supabase.auth.signOut();
    } else {
      localStorage.setItem(MOCK_KEY, MOCK_SIGNED_OUT);
    }
    set({ status: "unauthenticated", userId: null, email: null });
  },
}));
