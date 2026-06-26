import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { Icon } from "./ui";
import { cn } from "@/lib/format";
import type { MembershipRole } from "@/data/types";

const ROLE_LABELS: Record<MembershipRole, string> = {
  admin: "Admin",
  risk_manager: "Risk Manager",
  dept_head: "Dept Head",
  executive: "Executive",
  compliance: "Compliance",
};

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const company = useStore((s) => s.activeCompany());
  const myCompanies = useStore(useShallow((s) => s.myCompanies()));
  const setActiveCompany = useStore((s) => s.setActiveCompany);
  const user = useStore((s) => s.userById(s.currentUserId));
  const myRoles = useStore(useShallow((s) => s.myRoles()));
  const demoRole = useStore((s) => s.demoRole);
  const setRole = useStore((s) => s.setRole);
  const allRoles = useStore(useShallow((s) => s.memberships.find((m) => m.userId === s.currentUserId && m.companyId === s.activeCompanyId)?.roles ?? []));

  const [companyOpen, setCompanyOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
      <div className="flex items-center gap-2">
        {/* Hamburger — buka drawer di mobile/tablet */}
        <button
          onClick={onMenu}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-muted hover:text-primary lg:hidden"
          aria-label="Buka menu"
        >
          <Icon name="menu" size={22} />
        </button>

        {/* Company switcher (FR-ORG-6) */}
        <div className="relative">
        <button
          onClick={() => { setCompanyOpen((v) => !v); setRoleOpen(false); }}
          className="flex items-center gap-2.5 rounded-full border border-border-hairline bg-surface px-3 py-2 text-left hover:bg-surface-muted"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-[12px] font-bold text-primary">
            {company.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-on-surface">{company.name}</p>
            <p className="text-[10px] text-text-secondary">{company.industryType}</p>
          </div>
          <Icon name="unfold_more" size={18} className="text-outline" />
        </button>
        {companyOpen && (
          <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-[16px] border border-border-hairline bg-surface p-1.5 shadow-lg">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Perusahaan saya</p>
            {myCompanies.map((c) => (
              <button
                key={c.id}
                onClick={() => { setActiveCompany(c.id); setCompanyOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[13px] hover:bg-surface-muted",
                  c.id === company.id && "bg-background-mint",
                )}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-fixed text-[11px] font-bold text-primary">
                  {c.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                </div>
                <span className="flex-1 font-medium">{c.name}</span>
                {c.id === company.id && <Icon name="check" size={16} className="text-primary" />}
              </button>
            ))}
          </div>
        )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Demo role impersonation (RBAC visibility) */}
        <div className="relative">
          <button
            onClick={() => { setRoleOpen((v) => !v); setCompanyOpen(false); }}
            className="flex items-center gap-1.5 rounded-full border border-border-hairline bg-surface px-2.5 py-2 text-[12px] font-medium text-on-surface-variant hover:bg-surface-muted sm:px-3"
            title="Simulasikan peran (RBAC)"
          >
            <Icon name="visibility" size={16} />
            <span className="hidden sm:inline">{demoRole === "all" ? "Semua peran" : ROLE_LABELS[demoRole]}</span>
            <Icon name="expand_more" size={16} className="hidden sm:inline" />
          </button>
          {roleOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-48 rounded-[16px] border border-border-hairline bg-surface p-1.5 shadow-lg">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Lihat sebagai</p>
              <button onClick={() => { setRole("all"); setRoleOpen(false); }} className={cn("flex w-full rounded-[10px] px-3 py-2 text-left text-[13px] hover:bg-surface-muted", demoRole === "all" && "bg-background-mint")}>
                Semua peran ({allRoles.map((r) => ROLE_LABELS[r]).join(", ")})
              </button>
              {(["admin", "risk_manager", "dept_head", "executive", "compliance"] as MembershipRole[]).map((r) => (
                <button key={r} onClick={() => { setRole(r); setRoleOpen(false); }} className={cn("flex w-full rounded-[10px] px-3 py-2 text-left text-[13px] hover:bg-surface-muted", demoRole === r && "bg-background-mint")}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="relative flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-muted hover:text-primary">
          <Icon name="notifications" size={22} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-risk-extreme" />
        </button>
        <div className="flex items-center gap-2 rounded-full border border-border-hairline bg-surface py-1 pl-1 pr-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-on-primary">
            {user?.initials}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-[12px] font-semibold text-on-surface">{user?.name}</p>
            <p className="text-[10px] text-text-secondary">{myRoles.map((r) => ROLE_LABELS[r]).join(" · ") || "—"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
