import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { isAuthEnabled } from "@/lib/supabase";
import { useStore } from "@/data/store";
import { Button, Icon } from "@/components/ui";
import { ROLE_META } from "@/features/org/roles";
import { useAuthStore } from "./authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);
  const signInWithPassword = useAuthStore((s) => s.signInWithPassword);
  const signUpWithPassword = useAuthStore((s) => s.signUpWithPassword);
  const signInAsMockUser = useAuthStore((s) => s.signInAsMockUser);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Slice mentah (referensi stabil dari Zustand) → derivasi via useMemo.
  // Membangun objek di dalam selector + useShallow = referensi baru tiap render → infinite loop.
  const users = useStore((s) => s.users);
  const memberships = useStore((s) => s.memberships);
  const companies = useStore((s) => s.companies);

  // Daftar user demo (mode mock): user yang punya minimal satu keanggotaan.
  const demoUsers = useMemo(
    () =>
      users
        .map((u) => {
          const m = memberships.find((x) => x.userId === u.id);
          const company = companies.find((c) => c.id === m?.companyId);
          return m ? { user: u, roles: m.roles, companyName: company?.name ?? "" } : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [users, memberships, companies],
  );

  if (status === "authenticated") return <Navigate to="/dashboard" />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    if (mode === "signup") {
      const result = await signUpWithPassword(email, password, name);
      setBusy(false);
      if (!result.ok) return setError(result.reason);
      if (result.needsConfirmation) {
        return setNotice("Akun dibuat. Cek email untuk konfirmasi, lalu masuk.");
      }
      // Sesi langsung terbit → guard AppShell mengarahkan ke onboarding (belum ada perusahaan).
      return navigate({ to: "/dashboard" });
    }
    const result = await signInWithPassword(email, password);
    setBusy(false);
    if (!result.ok) return setError(result.reason);
    navigate({ to: "/dashboard" });
  };

  const toggleMode = () => {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError("");
    setNotice("");
  };

  const onMockLogin = (userId: string) => {
    signInAsMockUser(userId);
    navigate({ to: "/dashboard" });
  };

  const field = "w-full rounded-[14px] border border-border-hairline bg-surface px-4 py-3 text-[15px] focus:border-primary";

  return (
    <div className="min-h-screen bg-background-canvas p-4 md:p-xl">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[440px] flex-col justify-center">
        <div className="rounded-[24px] border border-border-hairline bg-background-mint p-6 shadow-sm md:p-8">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary text-on-primary">
              <Icon name="shield" fill size={22} />
            </div>
            <div>
              <p className="font-display text-[18px] font-bold text-primary">RiskoFlow</p>
              <p className="text-[11px] uppercase tracking-wide text-text-secondary">
                {mode === "signup" ? "Daftar akun baru" : "Masuk ke akun"}
              </p>
            </div>
          </div>

          {isAuthEnabled ? (
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              {mode === "signup" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-on-surface-variant">Nama lengkap</label>
                  <input type="text" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Anda" autoComplete="name" required />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-on-surface-variant">Email</label>
                <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@perusahaan.id" autoComplete="email" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-on-surface-variant">Kata sandi</label>
                <input type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} required />
              </div>
              <Button type="submit" icon={mode === "signup" ? "person_add" : "login"} disabled={busy}>
                {busy ? "Memproses…" : mode === "signup" ? "Daftar" : "Masuk"}
              </Button>
              <button type="button" onClick={toggleMode} className="text-[13px] font-medium text-primary hover:underline">
                {mode === "signup" ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-text-secondary">
                Mode demo (tanpa Supabase). Pilih akun untuk masuk:
              </p>
              <div className="flex flex-col gap-2">
                {demoUsers.map(({ user, roles, companyName }) => (
                  <button
                    key={user.id}
                    onClick={() => onMockLogin(user.id)}
                    className="flex items-center gap-3 rounded-[14px] border border-border-hairline bg-surface px-4 py-3 text-left transition-colors hover:border-primary"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-[13px] font-bold text-on-primary-container">
                      {user.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-on-surface">{user.name}</span>
                      <span className="block truncate text-[12px] text-text-secondary">
                        {companyName} · {roles.map((r) => ROLE_META[r].label).join(", ")}
                      </span>
                    </span>
                    <Icon name="arrow_forward" size={18} className="text-outline" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 flex items-center gap-1.5 rounded-[12px] bg-error-container px-3 py-2 text-[13px] font-medium text-on-error-container">
              <Icon name="error" size={16} /> {error}
            </p>
          )}
          {notice && (
            <p className="mt-4 flex items-center gap-1.5 rounded-[12px] bg-primary-container px-3 py-2 text-[13px] font-medium text-on-primary-container">
              <Icon name="check_circle" size={16} /> {notice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
