import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
  Navigate,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./index.css";
import { AppShell } from "@/components/AppShell";
import { riskSearchSchema } from "@/features/risks/validation/search.schema";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SNAPSHOT_KEY } from "@/data/remote";
import { RemoteHydrationGate } from "@/data/RemoteHydrationGate";

// Tiap mutasi sukses → re-hidrasi store dari Supabase agar halaman berbasis store
// (dashboard, audit) ikut segar, selain invalidasi query fitur masing-masing.
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      if (isSupabaseConfigured) queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY });
    },
  }),
});

// Tiap page di-`lazyRouteComponent` → di-split jadi chunk terpisah (dimuat saat rute diakses).
// AppShell (layout) tetap eager karena selalu dipakai. Named export jadi argumen ke-2.
const lazyPage = <T extends Record<string, unknown>>(
  importer: () => Promise<T>,
  name: keyof T & string,
) => lazyRouteComponent(importer, name);

// Fallback saat chunk rute sedang dimuat.
function RoutePending() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-[14px] text-text-secondary">
      Memuat…
    </div>
  );
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => <Navigate to="/dashboard" />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: lazyPage(() => import("@/features/onboarding/OnboardingPage"), "OnboardingPage"),
});

// Layout pathless: AppShell membungkus seluruh halaman di belakang auth.
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppShell,
});

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/dashboard",
  component: lazyPage(() => import("@/features/dashboard/DashboardPage"), "DashboardPage"),
});
const risksRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/risks",
  component: lazyPage(() => import("@/features/risks/presentation/pages/RiskRegisterPage"), "RiskRegisterPage"),
  validateSearch: (search) => riskSearchSchema.parse(search),
});
const riskDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/risks/$riskId",
  component: lazyPage(() => import("@/features/risks/presentation/pages/RiskDetailPage"), "RiskDetailPage"),
});
const incidentsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/incidents",
  component: lazyPage(() => import("@/features/incidents/presentation/pages/IncidentsPage"), "IncidentsPage"),
});
const complianceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/compliance",
  component: lazyPage(() => import("@/features/compliance/presentation/pages/CompliancePage"), "CompliancePage"),
});
const reportsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/reports",
  component: lazyPage(() => import("@/features/reports/ReportsPage"), "ReportsPage"),
});
const auditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/audit",
  component: lazyPage(() => import("@/features/audit/AuditPage"), "AuditPage"),
});
const orgRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/organisasi",
  component: lazyPage(() => import("@/features/org/presentation/pages/OrgPage"), "OrgPage"),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  onboardingRoute,
  appRoute.addChildren([
    dashboardRoute,
    risksRoute,
    riskDetailRoute,
    incidentsRoute,
    complianceRoute,
    reportsRoute,
    auditRoute,
    orgRoute,
  ]),
]);

const router = createRouter({ routeTree, defaultPendingComponent: RoutePending });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RemoteHydrationGate>
        <RouterProvider router={router} />
      </RemoteHydrationGate>
    </QueryClientProvider>
    <SpeedInsights />
  </StrictMode>,
);
