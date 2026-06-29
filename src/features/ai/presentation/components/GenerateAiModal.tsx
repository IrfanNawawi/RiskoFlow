import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/data/store";
import { Button, Icon } from "@/components/ui";
import { RiskBadge } from "@/components/RiskBadge";
import { cn } from "@/lib/format";
import { computeRiskLevel, severityScore, CATEGORY_META } from "@/lib/risk";
import { useAddSuggestedRisks } from "@/features/risks";
import { useGenerateRiskSuggestions } from "@/features/ai/presentation/hooks/useGenerateRiskSuggestions";
import type { AiRiskSuggestion } from "@/features/ai/domain";

export function GenerateAiModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const company = useStore((s) => s.activeCompany());
  const departments = useStore(useShallow((s) => s.activeDepartments()));
  const existingTitles = useStore(useShallow((s) => s.activeRisks().map((r) => r.title)));
  const currentUserId = useStore((s) => s.currentUserId);

  const generate = useGenerateRiskSuggestions();
  const addSuggested = useAddSuggestedRisks();

  const [departmentId, setDepartmentId] = useState("");
  const [candidates, setCandidates] = useState<AiRiskSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // `onClose` selalu terbaru tanpa menjadi dependency efek (lihat di bawah).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Reset & pasang listener HANYA saat modal dibuka (transisi `open`). Jangan sertakan `onClose`
  // di deps: identitasnya berubah tiap parent re-render, dan bila dijadikan dependency, efek ini
  // jalan ulang lalu menghapus kandidat hasil AI (setCandidates([]) + generate.reset()) — bug
  // "hasil muncul lalu hilang/menutup".
  useEffect(() => {
    if (!open) return;
    setDepartmentId("");
    setCandidates([]);
    setSelected(new Set());
    generate.reset();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const deptName = departments.find((d) => d.id === departmentId)?.name ?? "";

  const onGenerate = async () => {
    if (!departmentId) return;
    try {
      const result = await generate.mutateAsync({
        industryType: company.industryType,
        departmentName: deptName,
        existingTitles,
      });
      setCandidates(result);
      setSelected(new Set(result.map((_, i) => i))); // default semua terpilih
    } catch {
      // Kegagalan ditampilkan via `generate.isError` di bawah; cegah unhandled rejection.
      setCandidates([]);
    }
  };

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const onAdd = async () => {
    const picked = candidates.filter((_, i) => selected.has(i));
    if (picked.length === 0) return;
    await addSuggested.mutateAsync(
      picked.map((c) => ({
        title: c.title,
        description: c.rationale,
        category: c.category,
        source: c.source,
        departmentId,
        ownerId: currentUserId,
        likelihood: c.likelihood,
        impact: c.impact,
      })),
    );
    onClose();
  };

  const field = "w-full rounded-[14px] border border-border-hairline bg-surface px-4 py-2.5 text-[14px] focus:border-primary";

  return createPortal(
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="animate-modal-pop flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[24px] border border-border-hairline bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-hairline p-6">
          <div className="flex items-center gap-2">
            <Icon name="auto_awesome" size={22} className="text-primary" fill />
            <div>
              <h2 className="font-display text-[20px] font-bold text-on-surface">Generate Risiko (AI)</h2>
              <p className="text-[13px] text-text-secondary">Usulan berbasis industri {company.industryType} — wajib dikonfirmasi.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-outline hover:bg-surface-muted">
            <Icon name="close" size={22} />
          </button>
        </div>

        {!company.aiEnabled ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Icon name="block" size={36} className="text-outline" />
            <p className="text-[14px] font-medium text-on-surface">Fitur AI dinonaktifkan (opt-out).</p>
            <p className="text-[13px] text-text-secondary">Aktifkan di Setting perusahaan; alur manual tetap berjalan.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
              <div className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-on-surface-variant">Departemen *</label>
                  <select className={field} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                    <option value="">Pilih departemen…</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <Button icon="auto_awesome" onClick={onGenerate} disabled={!departmentId || generate.isPending}>
                  {generate.isPending ? "Menghasilkan…" : "Generate"}
                </Button>
              </div>

              {generate.isError && (
                <p className="flex items-center gap-1.5 rounded-[12px] bg-error-container px-3 py-2 text-[13px] text-on-error-container">
                  <Icon name="error" size={16} />
                  {generate.error instanceof Error ? generate.error.message : "Gagal menghasilkan usulan."} Coba lagi.
                </p>
              )}

              {candidates.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[12px] font-semibold text-on-surface-variant">{selected.size} dari {candidates.length} usulan terpilih</p>
                  {candidates.map((c, i) => {
                    const checked = selected.has(i);
                    return (
                      <label
                        key={c.title}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-[14px] border p-3",
                          checked ? "border-primary bg-primary-fixed/30" : "border-border-hairline hover:bg-surface-muted",
                        )}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggle(i)} className="mt-1 accent-[var(--color-primary)]" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[14px] font-semibold text-on-surface">{c.title}</p>
                            <RiskBadge level={computeRiskLevel(c.likelihood, c.impact)} score={severityScore(c.likelihood, c.impact)} size="sm" />
                          </div>
                          <p className="mt-0.5 text-[12px] text-text-secondary">{c.rationale}</p>
                          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-text-secondary">
                            <span className="inline-flex items-center gap-1"><Icon name={CATEGORY_META[c.category].icon} size={13} /> {CATEGORY_META[c.category].label}</span>
                            <span className="rounded-full bg-success/10 px-2 py-0.5 font-semibold text-success">Confidence {c.confidence}%</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {generate.isSuccess && candidates.length === 0 && (
                <p className="py-6 text-center text-[13px] text-text-secondary">Tidak ada usulan baru (semua sudah ada di register).</p>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border-hairline p-6">
              <p className="text-[11px] text-text-secondary">Masuk sebagai <b>draft</b> — konfirmasi di register sebelum aktif.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Batal</Button>
                <Button icon="add" onClick={onAdd} disabled={selected.size === 0 || addSuggested.isPending}>
                  Tambahkan {selected.size} draft
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
