import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@/data/store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fetchSnapshot } from "@/data/remote";
import { Button, Icon } from "@/components/ui";
import { cn } from "@/lib/format";
import { onboardingSchema } from "@/features/onboarding/validation/onboarding.schema";
import type { IndustryType } from "@/data/types";

const INDUSTRIES: { value: IndustryType; label: string; icon: string; desc: string }[] = [
  { value: "JASA", label: "Jasa", icon: "handshake", desc: "Layanan, konsultasi, keuangan" },
  { value: "DAGANG", label: "Dagang", icon: "storefront", desc: "Ritel, distribusi, e-commerce" },
  { value: "MANUFACTURE", label: "Manufaktur", icon: "precision_manufacturing", desc: "Produksi & pabrikasi" },
];

const PRESETS: Record<IndustryType, string[]> = {
  JASA: ["Operasional", "Keuangan", "SDM", "Layanan Pelanggan", "IT & Data"],
  DAGANG: ["Penjualan", "Pengadaan", "Gudang", "Keuangan", "Pemasaran"],
  MANUFACTURE: ["Produksi", "Keuangan", "HSE", "Logistik", "Quality Control"],
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const createCompany = useStore((s) => s.createCompanyWithAdmin);
  const hydrate = useStore((s) => s.hydrate);
  const setActiveCompany = useStore((s) => s.setActiveCompany);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<IndustryType | null>(null);
  const [employeeCount, setEmployeeCount] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [deptInput, setDeptInput] = useState("");
  const [error, setError] = useState("");

  function addDept(value: string) {
    const v = value.trim();
    if (!v) return;
    if (departments.some((d) => d.toLowerCase() === v.toLowerCase())) return;
    setDepartments((d) => [...d, v]);
    setDeptInput("");
  }

  function next() {
    setError("");
    const draft = { name, industryType: industry, employeeCount: Number(employeeCount), departments };
    if (step === 0) {
      const r = onboardingSchema.pick({ name: true, industryType: true }).safeParse(draft);
      if (!r.success) return setError(r.error.issues[0].message);
    }
    if (step === 1) {
      const r = onboardingSchema.pick({ employeeCount: true, departments: true }).safeParse(draft);
      if (!r.success) return setError(r.error.issues[0].message);
    }
    setStep((s) => s + 1);
  }

  async function finish() {
    const r = onboardingSchema.safeParse({ name, industryType: industry, employeeCount: Number(employeeCount), departments });
    if (!r.success) return setError(r.error.issues[0].message);
    if (isSupabaseConfigured) {
      // RPC atomik (D25/D27) → re-hidrasi store agar tenant baru muncul di switcher.
      const { data, error: rpcErr } = await supabase.rpc("create_company_with_admin", {
        p_user_id: useStore.getState().currentUserId,
        p_name: r.data.name,
        p_industry_type: r.data.industryType,
        p_employee_count: r.data.employeeCount,
        p_departments: r.data.departments,
      });
      if (rpcErr) return setError(rpcErr.message);
      hydrate(await fetchSnapshot());
      if (typeof data === "string") setActiveCompany(data);
    } else {
      createCompany(r.data);
    }
    navigate({ to: "/dashboard" });
  }

  const field = "w-full rounded-[14px] border border-border-hairline bg-surface px-4 py-3 text-[15px] focus:border-primary";
  const steps = ["Data Perusahaan", "Struktur & Skala", "Konfirmasi"];

  return (
    <div className="min-h-screen bg-background-canvas p-4 md:p-xl">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-3xl flex-col rounded-[24px] border border-border-hairline bg-background-mint p-6 shadow-sm md:p-10">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary text-on-primary">
            <Icon name="shield" fill size={22} />
          </div>
          <div>
            <p className="font-display text-[18px] font-bold text-primary">RiskoFlow</p>
            <p className="text-[11px] uppercase tracking-wide text-text-secondary">Setup perusahaan</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center">
          {steps.map((label, i) => (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold transition-colors",
                  i < step ? "bg-primary text-on-primary" : i === step ? "border-2 border-primary bg-surface text-primary" : "border-2 border-border-hairline bg-surface text-outline",
                )}>
                  {i < step ? <Icon name="check" size={18} fill /> : i + 1}
                </div>
                <span className={cn("text-[11px] font-medium", i === step ? "text-primary" : "text-text-secondary")}>{label}</span>
              </div>
              {i < steps.length - 1 && <div className={cn("mx-2 h-0.5 flex-1", i < step ? "bg-primary" : "bg-border-hairline")} />}
            </div>
          ))}
        </div>

        <div className="flex-1">
          {step === 0 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="font-display text-[26px] font-bold text-on-surface">Identifikasi perusahaan</h1>
                <p className="text-[14px] text-text-secondary">Konteks ini memandu saran AI & library kepatuhan.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-on-surface-variant">Nama perusahaan *</label>
                <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="PT Maju Jaya" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-on-surface-variant">Tipe industri *</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {INDUSTRIES.map((ind) => (
                    <button
                      key={ind.value}
                      onClick={() => setIndustry(ind.value)}
                      className={cn(
                        "flex flex-col items-start gap-2 rounded-[16px] border-2 bg-surface p-4 text-left transition-all",
                        industry === ind.value ? "border-primary ring-2 ring-primary/15" : "border-border-hairline hover:border-primary-fixed-dim",
                      )}
                    >
                      <Icon name={ind.icon} size={28} className="text-primary" fill />
                      <p className="font-display text-[15px] font-semibold">{ind.label}</p>
                      <p className="text-[12px] text-text-secondary">{ind.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="font-display text-[26px] font-bold text-on-surface">Struktur & skala</h1>
                <p className="text-[14px] text-text-secondary">Jumlah karyawan & departemen yang akan memetakan risiko.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-on-surface-variant">Jumlah karyawan *</label>
                <input type="number" min={1} className={field} value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} placeholder="120" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-on-surface-variant">Departemen *</label>
                {industry && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[12px] text-text-secondary">Preset {industry}:</span>
                    {PRESETS[industry].filter((p) => !departments.some((d) => d.toLowerCase() === p.toLowerCase())).map((p) => (
                      <button key={p} onClick={() => addDept(p)} className="rounded-full border border-dashed border-outline-variant px-3 py-1 text-[12px] text-on-surface-variant hover:border-primary hover:text-primary">
                        + {p}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    className={field}
                    value={deptInput}
                    onChange={(e) => setDeptInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDept(deptInput); } }}
                    placeholder="Ketik nama departemen & Enter"
                  />
                  <Button variant="outline" icon="add" onClick={() => addDept(deptInput)}>Tambah</Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {departments.map((d) => (
                    <span key={d} className="flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1.5 text-[13px] font-medium text-primary">
                      {d}
                      <button onClick={() => setDepartments((arr) => arr.filter((x) => x !== d))} className="hover:text-error">
                        <Icon name="close" size={14} />
                      </button>
                    </span>
                  ))}
                  {departments.length === 0 && <span className="text-[13px] text-text-secondary">Belum ada departemen.</span>}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-display text-[26px] font-bold text-on-surface">Konfirmasi</h1>
                <p className="text-[14px] text-text-secondary">Satu transaksi atomik akan membuat tenant, membership & seed regulasi.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-[16px] border border-border-hairline bg-surface p-5">
                <Summary label="Perusahaan" value={name} />
                <Summary label="Industri" value={industry ?? "-"} />
                <Summary label="Karyawan" value={employeeCount} />
                <Summary label="Departemen" value={`${departments.length} unit`} />
                <div className="col-span-2 flex flex-wrap gap-1.5">
                  {departments.map((d) => <span key={d} className="rounded-full bg-surface-muted px-2.5 py-1 text-[12px] text-on-surface-variant">{d}</span>)}
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-[14px] border border-primary-fixed bg-surface p-4 text-[13px] text-on-surface-variant">
                <Icon name="auto_awesome" size={18} className="mt-0.5 text-primary" fill />
                <p>Pembuat akan memperoleh peran <b>admin + risk_manager</b> (D27), dan library regulasi <b>{industry}</b> + GENERAL (ISO 31000, GCG) di-seed otomatis.</p>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 flex items-center gap-1.5 rounded-[12px] bg-error-container px-3 py-2 text-[13px] font-medium text-on-error-container">
              <Icon name="error" size={16} /> {error}
            </p>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" icon="arrow_back" onClick={() => (step === 0 ? navigate({ to: "/dashboard" }) : setStep((s) => s - 1))}>
            {step === 0 ? "Lewati" : "Kembali"}
          </Button>
          {step < 2 ? (
            <Button icon="arrow_forward" onClick={next}>Lanjut</Button>
          ) : (
            <Button icon="rocket_launch" onClick={finish}>Buat perusahaan</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="font-display text-[16px] font-semibold text-on-surface">{value}</p>
    </div>
  );
}
