import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "./authStore";

/**
 * Gerbang auth: inisialisasi sesi sekali saat boot, tahan render hingga status resolve
 * (loading → authenticated/unauthenticated). Ditempatkan di atas RouterProvider agar
 * guard rute (AppShell/Login) membaca status yang sudah pasti.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => initialize(), [initialize]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-[14px] text-text-secondary">
        Memeriksa sesi…
      </div>
    );
  }
  return <>{children}</>;
}
