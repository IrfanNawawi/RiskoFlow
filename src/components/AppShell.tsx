import { useEffect, useState } from "react";
import { Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuthStore } from "@/features/auth";
import { useStore } from "@/data/store";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { NewRiskModal } from "./NewRiskModal";

export function AppShell() {
  const [modalOpen, setModalOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const authStatus = useAuthStore((s) => s.status);
  // Punya minimal satu keanggotaan perusahaan? (store sudah ter-hidrasi saat shell render.)
  const hasCompany = useStore((s) => s.myCompanies().length > 0);

  // Tutup drawer setiap kali pindah route (mobile/tablet).
  useEffect(() => setNavOpen(false), [pathname]);

  // Guard: hanya user terautentikasi yang boleh masuk shell (NFR-01; RLS = otoritas sesungguhnya).
  if (authStatus === "unauthenticated") return <Navigate to="/login" />;

  // User terautentikasi tapi belum punya perusahaan (mis. hasil signup mandiri) → onboarding.
  // Tanpa ini Topbar membaca activeCompany() yang undefined dan crash (reading 'name').
  if (authStatus === "authenticated" && !hasCompany) return <Navigate to="/onboarding" />;

  return (
    <div className="min-h-screen bg-background-canvas p-2 md:p-3">
      <div className="flex min-h-[calc(100vh-1rem)] gap-2 md:min-h-[calc(100vh-1.5rem)]">
        {/* Backdrop drawer — hanya <lg */}
        {navOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-hidden
          />
        )}
        <Sidebar onNewRisk={() => setModalOpen(true)} open={navOpen} onClose={() => setNavOpen(false)} />
        <main className="min-w-0 flex-1 rounded-[24px] border border-border-hairline bg-background-mint p-5 shadow-sm md:p-xl">
          <Topbar onMenu={() => setNavOpen(true)} />
          <div className="animate-fade-up" key={pathname}>
            <Outlet />
          </div>
        </main>
      </div>
      <NewRiskModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
