import { useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { Card, Icon, Button } from "@/components/ui";
import { RiskBadge } from "@/components/RiskBadge";
import {
  CATEGORY_META, SOURCE_META, STATUS_META, RISK_LEVEL_META,
  LIKELIHOOD_LABELS, IMPACT_LABELS, cellLevel,
} from "@/lib/risk";
import { fmtDate, idr, relativeDays, cn } from "@/lib/format";
import { useRisk } from "./presentation/hooks/useRisks";
import { useApproveTreatment, useRemoveKri } from "./presentation/hooks/useRiskMutations";
import { TreatmentFormModal } from "./presentation/components/TreatmentFormModal";
import { ReviewModal } from "./presentation/components/ReviewModal";
import { KriFormModal } from "./presentation/components/KriFormModal";
import { useSuggestTreatment } from "@/features/ai";
import type { TreatmentInput } from "./validation/treatment.schema";
import type { Treatment, Kri } from "@/data/types";

const STRATEGY_META: Record<string, { label: string; icon: string }> = {
  AVOID: { label: "Hindari", icon: "block" },
  REDUCE: { label: "Kurangi", icon: "trending_down" },
  TRANSFER: { label: "Transfer", icon: "swap_horiz" },
  ACCEPT: { label: "Terima", icon: "verified" },
};
const TSTATUS: Record<string, string> = { planned: "Not Started", in_progress: "In Progress", done: "Done" };

const routeApi = getRouteApi("/app/risks/$riskId");

export function RiskDetailPage() {
  const { riskId } = routeApi.useParams();
  const { data: risk } = useRisk(riskId);
  const userById = useStore((s) => s.userById);
  const deptById = useStore((s) => s.deptById);
  const compliance = useStore(useShallow((s) => s.activeCompliance()));
  const canApprove = useStore((s) => s.can("approve"));
  const aiEnabled = useStore((s) => s.activeCompany().aiEnabled);
  const approve = useApproveTreatment();
  const canEdit = useStore((s) => s.can("edit"));
  const [treatmentModal, setTreatmentModal] = useState<{ open: boolean; edit?: Treatment; prefill?: Partial<TreatmentInput> }>({ open: false });
  const suggestTreatment = useSuggestTreatment();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [kriModal, setKriModal] = useState<{ open: boolean; edit?: Kri }>({ open: false });
  const removeKri = useRemoveKri();

  if (!risk) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <Icon name="search_off" size={40} className="text-outline" />
        <p className="text-[15px] text-text-secondary">Risiko tidak ditemukan.</p>
        <Link to="/risks"><Button variant="outline" icon="arrow_back">Kembali ke Register</Button></Link>
      </div>
    );
  }

  const inh = risk.inherent;
  const res = risk.residual;
  const active = res ?? inh;
  const linkedCompliance = compliance.filter((c) => risk.complianceIds.includes(c.id));
  const currentStep = STATUS_META[risk.status].step;
  const incidents = useStore.getState().activeIncidents().filter((i) => i.riskIds.includes(risk.id));

  return (
    <div className="flex flex-col gap-4">
      <Link to="/risks" className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-on-surface-variant hover:text-primary">
        <Icon name="arrow_back" size={18} /> Back to Risk Registry
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Left column */}
        <section className="flex min-w-0 flex-1 flex-col gap-5">
          {/* Header */}
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display text-[28px] font-bold leading-tight text-on-surface">{risk.title}</h1>
              <div className="shrink-0"><RiskBadge level={active.level} score={active.severity} /></div>
            </div>
            <div className="flex flex-wrap gap-2 text-[12px]">
              <Tag icon={CATEGORY_META[risk.category].icon}>{CATEGORY_META[risk.category].label}</Tag>
              <Tag icon="public">{SOURCE_META[risk.source]}</Tag>
              <Tag icon="apartment">{deptById(risk.departmentId)?.name}</Tag>
              <Tag icon="person">{userById(risk.ownerId)?.name}</Tag>
            </div>
            <p className="text-[14px] leading-relaxed text-on-surface-variant">{risk.description}</p>
          </div>

          {/* Status stepper */}
          <Card className="bg-surface-muted p-4">
            <div className="relative flex items-center justify-between">
              <div className="absolute left-0 top-4 -z-0 h-0.5 w-full bg-border-hairline" />
              <div className="absolute left-0 top-4 -z-0 h-0.5 bg-primary" style={{ width: `${(currentStep / 4) * 100}%` }} />
              {["identified", "assessed", "treated", "monitored", "closed"].map((st, i) => {
                const done = i < currentStep;
                const cur = i === currentStep;
                const icons = ["flag", "analytics", "build", "monitoring", "check_circle"];
                return (
                  <div key={st} className="z-10 flex flex-col items-center gap-1.5 bg-surface-muted px-1">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      done ? "bg-primary text-on-primary" : cur ? "border-2 border-primary bg-surface text-primary shadow-[0_0_0_4px_rgba(31,77,69,0.1)]" : "border-2 border-border-hairline bg-surface text-outline",
                    )}>
                      <Icon name={done ? "check" : icons[i]} size={16} fill={done || cur} />
                    </div>
                    <span className={cn("text-[11px] font-medium", cur ? "font-bold text-primary" : done ? "text-on-surface" : "text-outline")}>
                      {STATUS_META[st].label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Bento: matrix position + shift */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="flex flex-col gap-3 p-4">
              <h3 className="font-display text-[16px] font-semibold">Posisi Matriks Risiko</h3>
              <div className="flex items-center gap-4">
                <MiniMatrix likelihood={active.likelihood} impact={active.impact} />
                <div className="flex flex-col gap-2 text-[13px]">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[12px] font-semibold text-on-surface-variant">Likelihood</span>
                    <span className="font-semibold">{active.likelihood} ({LIKELIHOOD_LABELS[active.likelihood]})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[12px] font-semibold text-on-surface-variant">Impact</span>
                    <span className="font-semibold">{active.impact} ({IMPACT_LABELS[active.impact]})</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="flex flex-col justify-between gap-3 p-4">
              <h3 className="font-display text-[16px] font-semibold">Risk Shift (Inherent → Residual)</h3>
              <div className="flex items-center justify-between rounded-[12px] bg-surface-muted px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Inherent</span>
                  <span className="font-display text-[28px] font-bold tabular-nums" style={{ color: RISK_LEVEL_META[inh.level].color }}>{inh.severity}</span>
                </div>
                <Icon name="arrow_forward" size={22} className="text-outline" />
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{res ? "Residual" : "Target Residual"}</span>
                  <span className="font-display text-[28px] font-bold tabular-nums" style={{ color: RISK_LEVEL_META[(res ?? inh).level].color }}>{res ? res.severity : Math.max(1, inh.severity - 8)}</span>
                </div>
              </div>
              {!res &&
                (canEdit && risk.treatments.some((t) => t.status === "done") ? (
                  <button
                    type="button"
                    onClick={() => setReviewOpen(true)}
                    className="flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[12px] font-semibold text-on-primary hover:bg-primary-container"
                  >
                    <Icon name="rate_review" size={15} /> Input penilaian residual
                  </button>
                ) : (
                  <p className="text-[12px] text-text-secondary">Penilaian residual tersedia setelah ≥1 mitigasi selesai.</p>
                ))}
            </Card>
          </div>

          {/* Mitigation list */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border-hairline pb-2">
              <h3 className="font-display text-[18px] font-semibold">Rencana Mitigasi</h3>
              {canEdit && <Button variant="ghost" size="sm" icon="add" onClick={() => setTreatmentModal({ open: true })}>Tambah</Button>}
            </div>
            {risk.treatments.length === 0 && <p className="py-4 text-[13px] text-text-secondary">Belum ada rencana mitigasi.</p>}
            {risk.treatments.map((t) => (
              <TreatmentItem
                key={t.id}
                t={t}
                ownerName={userById(t.ownerId)?.name ?? ""}
                canApprove={canApprove}
                canEdit={canEdit}
                onApprove={() => approve.mutate({ riskId: risk.id, treatmentId: t.id })}
                onEdit={() => setTreatmentModal({ open: true, edit: t })}
              />
            ))}
          </div>

          {/* Incidents */}
          {incidents.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="font-display text-[18px] font-semibold border-b border-border-hairline pb-2">Insiden Terkait</h3>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-border-hairline bg-surface-muted text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    <tr><th className="px-4 py-2.5">Tanggal</th><th className="px-4 py-2.5">Deskripsi</th><th className="px-4 py-2.5 text-right">Kerugian</th></tr>
                  </thead>
                  <tbody className="text-[13px]">
                    {incidents.map((i) => (
                      <tr key={i.id} className="border-b border-border-hairline last:border-0 hover:bg-surface-muted">
                        <td className="px-4 py-2.5 tabular-nums text-on-surface-variant">{fmtDate(i.occurredAt)}</td>
                        <td className="px-4 py-2.5">{i.title}</td>
                        <td className={cn("px-4 py-2.5 text-right font-medium tabular-nums", i.lossAmount > 0 ? "text-error" : "text-risk-low")}>{i.lossAmount > 0 ? idr(i.lossAmount) : "Near-miss"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </Card>
            </div>
          )}
        </section>

        {/* Right column */}
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[340px]">
          {/* AI Suggestion */}
          <div className="relative isolate overflow-hidden rounded-[20px] border border-primary-fixed bg-surface p-4 shadow-sm">
            <div className="absolute -right-10 -top-10 -z-10 h-32 w-32 rounded-full bg-primary-fixed opacity-30 blur-[40px]" />
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Icon name="auto_awesome" size={20} fill />
              <h3 className="font-display text-[16px] font-bold">AI Suggestion</h3>
            </div>
            {aiEnabled ? (
              <>
                {suggestTreatment.data ? (
                  <div className="rounded-[12px] border border-border-hairline bg-surface-muted/60 p-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <Icon name={STRATEGY_META[suggestTreatment.data.strategy].icon} size={13} /> {STRATEGY_META[suggestTreatment.data.strategy].label}
                      </span>
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-success">{suggestTreatment.data.confidence}%</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-on-surface-variant">{suggestTreatment.data.description}</p>
                    {canEdit && (
                      <Button
                        className="mt-2 w-full"
                        size="sm"
                        icon="playlist_add"
                        onClick={() =>
                          setTreatmentModal({
                            open: true,
                            prefill: { strategy: suggestTreatment.data!.strategy, description: suggestTreatment.data!.description },
                          })
                        }
                      >
                        Gunakan & edit
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="mb-1 text-[13px] leading-relaxed text-text-secondary">
                    Minta AI menyarankan strategi mitigasi untuk risiko ini. Usulan tetap perlu Anda konfirmasi.
                  </p>
                )}
                <Button
                  className="mt-3 w-full"
                  size="sm"
                  variant={suggestTreatment.data ? "outline" : "primary"}
                  icon="auto_awesome"
                  onClick={() => suggestTreatment.mutate({ riskTitle: risk.title, category: risk.category, level: active.level })}
                  disabled={suggestTreatment.isPending}
                >
                  {suggestTreatment.isPending ? "Menganalisis…" : suggestTreatment.data ? "Sarankan ulang" : "Sarankan Mitigasi"}
                </Button>
              </>
            ) : (
              <p className="rounded-[12px] bg-surface-muted p-3 text-[13px] text-text-secondary">Fitur AI dinonaktifkan untuk perusahaan ini (opt-out). Alur manual tetap berjalan.</p>
            )}
          </div>

          {/* KRI Monitoring */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-[16px] font-bold">
                <Icon name="timeline" size={18} className="text-outline" /> Pemantauan (KRI)
              </h3>
              {canEdit && (
                <button onClick={() => setKriModal({ open: true })} aria-label="Tambah KRI" className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-primary-fixed">
                  <Icon name="add" size={18} />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2.5">
              {risk.kris.length === 0 && <p className="text-[13px] text-text-secondary">Belum ada indikator (KRI).</p>}
              {risk.kris.map((k) => (
                <div key={k.id} className={cn("rounded-[12px] border p-3", k.breached ? "border-error/30 bg-error-container/40" : "border-border-hairline bg-surface-muted")}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[12px] font-medium text-on-surface-variant">
                      {k.name}
                      {k.breached && <span className="rounded-full bg-error-container px-1.5 py-0.5 text-[9px] font-bold uppercase text-on-error-container">Terlampaui</span>}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("font-display text-[16px] font-bold tabular-nums", k.breached ? "text-error" : "text-risk-medium")}>{k.current}</span>
                      {canEdit && (
                        <>
                          <button onClick={() => setKriModal({ open: true, edit: k })} aria-label="Ubah KRI" className="flex h-6 w-6 items-center justify-center rounded-full text-outline hover:bg-surface hover:text-primary">
                            <Icon name="edit" size={14} />
                          </button>
                          <button onClick={() => { if (window.confirm(`Hapus KRI "${k.name}"?`)) removeKri.mutate({ riskId: risk.id, kriId: k.id }); }} aria-label="Hapus KRI" className="flex h-6 w-6 items-center justify-center rounded-full text-outline hover:bg-error-container hover:text-error">
                            <Icon name="delete" size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-variant">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, k.ratio * 100)}%`, backgroundColor: k.breached ? "var(--color-error)" : "var(--color-risk-medium)" }} />
                  </div>
                  <p className="mt-1 text-[10px] text-outline">Threshold: {k.threshold}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Compliance chips */}
          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-display text-[16px] font-bold">
              <Icon name="gavel" size={18} className="text-outline" /> Kepatuhan Terkait
            </h3>
            <div className="flex flex-wrap gap-2">
              {linkedCompliance.length === 0 && <p className="text-[13px] text-text-secondary">Belum dipetakan ke regulasi.</p>}
              {linkedCompliance.map((c) => (
                <span key={c.id} className={cn(
                  "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  c.status === "non_compliant" ? "border-error/30 bg-error-container text-on-error-container" : "border-outline-variant bg-surface-muted text-on-surface-variant",
                )}>
                  <Icon name={c.status === "non_compliant" ? "warning" : "description"} size={13} />
                  {c.regulationName}
                </span>
              ))}
            </div>
          </Card>

          {/* Review schedule */}
          <Card className="p-4">
            <h3 className="mb-2 flex items-center gap-2 font-display text-[16px] font-bold">
              <Icon name="event" size={18} className="text-outline" /> Jadwal Review
            </h3>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-on-surface-variant">Frekuensi</span>
              <span className="font-semibold capitalize">{risk.reviewFrequency}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[13px]">
              <span className="text-on-surface-variant">Review berikutnya</span>
              <span className={cn("font-semibold tabular-nums", relativeDays(risk.nextReviewDate) <= 0 ? "text-error" : "text-on-surface")}>{fmtDate(risk.nextReviewDate)}</span>
            </div>
            {canEdit && (
              <Button variant="outline" size="sm" icon="rate_review" className="mt-3 w-full" onClick={() => setReviewOpen(true)}>
                Catat Review
              </Button>
            )}
          </Card>
        </aside>
      </div>

      <TreatmentFormModal
        open={treatmentModal.open}
        onClose={() => setTreatmentModal({ open: false })}
        riskId={risk.id}
        treatment={treatmentModal.edit}
        prefill={treatmentModal.prefill}
      />
      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} risk={risk} />
      <KriFormModal open={kriModal.open} onClose={() => setKriModal({ open: false })} riskId={risk.id} kri={kriModal.edit} />
    </div>
  );
}

function Tag({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border-hairline bg-surface px-2.5 py-1 font-medium text-on-surface-variant">
      <Icon name={icon} size={14} className="text-outline" /> {children}
    </span>
  );
}

function MiniMatrix({ likelihood, impact }: { likelihood: number; impact: number }) {
  const impacts = [5, 4, 3, 2, 1];
  const likelihoods = [1, 2, 3, 4, 5];
  return (
    <div className="grid h-28 w-28 shrink-0 grid-cols-5 gap-1">
      {impacts.map((im) =>
        likelihoods.map((lk) => {
          const here = lk === likelihood && im === impact;
          return (
            <div
              key={`${lk}-${im}`}
              className={cn("rounded-[3px]", here && "border-2 border-on-surface shadow-[0_0_8px_rgba(209,75,61,0.6)]")}
              style={{ backgroundColor: RISK_LEVEL_META[cellLevel(lk, im)].color }}
            />
          );
        }),
      )}
    </div>
  );
}

function TreatmentItem({ t, ownerName, canApprove, canEdit, onApprove, onEdit }: { t: Treatment; ownerName: string; canApprove: boolean; canEdit: boolean; onApprove: () => void; onEdit: () => void }) {
  const meta = STRATEGY_META[t.strategy];
  const needsApproval = t.strategy === "ACCEPT" && !t.approved;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", needsApproval ? "bg-error-container text-on-error-container" : "bg-primary-container text-on-primary")}>
            <Icon name={meta.icon} size={20} fill />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-on-surface">{t.description}</p>
            <p className="text-[12px] text-text-secondary">{meta.label} · Due {fmtDate(t.dueDate)} · {ownerName}{t.cost > 0 ? ` · ${idr(t.cost)}` : ""}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium",
            t.status === "done" ? "bg-risk-low/15 text-risk-low" : t.status === "in_progress" ? "bg-surface-container-high text-on-surface-variant" : "bg-surface-variant text-on-surface",
          )}>{TSTATUS[t.status]}</span>
          {canEdit && (
            <button onClick={onEdit} aria-label="Ubah mitigasi" className="flex h-7 w-7 items-center justify-center rounded-full text-outline hover:bg-surface-muted hover:text-primary">
              <Icon name="edit" size={16} />
            </button>
          )}
        </div>
      </div>

      {t.strategy === "ACCEPT" && (
        <div className={cn("rounded-[12px] border p-3 text-[12px]", needsApproval ? "border-error/30 bg-error-container/40" : "border-risk-low/30 bg-risk-low/10")}>
          <p className="mb-2 text-on-surface-variant"><b>Justifikasi:</b> {t.justification}</p>
          {needsApproval ? (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 font-semibold text-on-error-container"><Icon name="pending" size={14} /> Menunggu approval risk_manager</span>
              {canApprove ? (
                <button onClick={onApprove} className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-on-primary hover:bg-primary-container">Approve</button>
              ) : (
                <span className="text-[11px] text-text-secondary">Hanya risk_manager/admin</span>
              )}
            </div>
          ) : (
            <span className="flex items-center gap-1 font-semibold text-risk-low"><Icon name="check_circle" size={14} fill /> Disetujui</span>
          )}
        </div>
      )}

      {t.strategy === "TRANSFER" && t.transferProvider && (
        <div className="rounded-[12px] bg-surface-muted p-3 text-[12px] text-on-surface-variant">
          <b>Transfer:</b> {t.transferProvider}{t.transferPremium ? ` · Premi ${idr(t.transferPremium)}` : ""}
        </div>
      )}
    </Card>
  );
}
