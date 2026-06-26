import { Link } from "@tanstack/react-router";
import { Icon } from "./ui";
import { cn } from "@/lib/format";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/risks", label: "Risk Registry", icon: "table_chart" },
  { to: "/incidents", label: "Insiden", icon: "report" },
  { to: "/compliance", label: "Compliance", icon: "verified_user" },
  { to: "/reports", label: "Reports", icon: "bar_chart" },
  { to: "/audit", label: "Audit Trail", icon: "history" },
] as const;

export function Sidebar({ onNewRisk, open, onClose }: { onNewRisk: () => void; open: boolean; onClose: () => void }) {
  return (
    <aside
      className={cn(
        "flex w-[230px] shrink-0 flex-col gap-6 px-3 py-2",
        // <lg: off-canvas drawer; >=lg: kolom statis dalam flow
        "fixed inset-y-0 left-0 z-50 bg-surface transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 lg:bg-transparent lg:transition-none",
        open ? "translate-x-0 shadow-xl" : "-translate-x-full",
      )}
    >
      <div className="flex items-center justify-between gap-2.5 px-3 pt-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary text-on-primary">
            <Icon name="shield" fill size={22} />
          </div>
          <div className="leading-tight">
            <p className="font-display text-[18px] font-bold text-primary">RiskoFlow</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">Enterprise ERM</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-background-mint lg:hidden"
          aria-label="Tutup menu"
        >
          <Icon name="close" size={20} />
        </button>
      </div>

      <button
        onClick={() => { onNewRisk(); onClose(); }}
        className="mx-1 flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
      >
        <Icon name="add" size={20} />
        Risiko Baru
      </button>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClose}
            className="flex items-center gap-3 rounded-full px-4 py-2.5 text-[14px] font-medium transition-colors"
            activeProps={{ className: "bg-primary text-on-primary shadow-sm" }}
            inactiveProps={{ className: "text-on-surface-variant hover:bg-background-mint hover:text-primary" }}
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border-hairline pt-3">
        <button className="flex items-center gap-3 rounded-full px-4 py-2.5 text-[14px] font-medium text-on-surface-variant hover:bg-background-mint hover:text-primary">
          <Icon name="help" size={20} /> Help
        </button>
        <button className="flex items-center gap-3 rounded-full px-4 py-2.5 text-[14px] font-medium text-on-surface-variant hover:bg-background-mint hover:text-primary">
          <Icon name="logout" size={20} /> Logout
        </button>
      </div>
    </aside>
  );
}
