import type { Risk } from "@/data/types";
import type { NewRiskInput } from "@/features/risks/validation/newRisk.schema";
import type { TreatmentInput } from "@/features/risks/validation/treatment.schema";
import type { ReviewInput } from "@/features/risks/validation/review.schema";
import type { KriInput } from "@/features/risks/validation/kri.schema";

/**
 * Kontrak akses data Risk milik `domain`. Diimplementasikan oleh layer `data`
 * (sementara membaca mock store; target Supabase). `presentation` hanya menyentuh
 * interface ini lewat DI hook — tidak pernah memanggil store/Supabase langsung.
 *
 * Semua operasi di-scope ke perusahaan aktif oleh implementasi (multi-tenant).
 */
export interface IRiskRepository {
  /** Risiko aktif (non-soft-deleted) milik perusahaan aktif. */
  list(): Promise<Risk[]>;
  /** Satu risiko by id, atau `undefined` bila tidak ada / beda tenant. */
  getById(id: string): Promise<Risk | undefined>;
  /** Buat risiko baru; kembalikan id-nya. */
  create(input: NewRiskInput): Promise<string>;
  /** Tambah beberapa draft risiko hasil AI (FR-AI-1) — `aiSuggested=true`; kembalikan id. */
  addSuggested(inputs: NewRiskInput[]): Promise<string[]>;
  /** Konfirmasi draft AI menjadi risiko aktif (FR-RISK-5). */
  confirmAiSuggested(id: string): Promise<void>;
  /** Tambah rencana mitigasi ke risiko (FR-TREAT-1); kembalikan id treatment. */
  addTreatment(riskId: string, input: TreatmentInput): Promise<string>;
  /** Ubah rencana mitigasi (FR-TREAT-4). */
  updateTreatment(riskId: string, treatmentId: string, input: TreatmentInput): Promise<void>;
  /** Setujui treatment ACCEPT (FR-TREAT-3). Gate peran ada di use-case domain. */
  approveTreatment(riskId: string, treatmentId: string): Promise<void>;
  /** Catat review berkala (FR-MON-2): perbarui penilaian aktif + jadwal review. */
  recordReview(riskId: string, input: ReviewInput): Promise<void>;
  /** KRI per risiko (FR-MON-4): tambah/ubah/hapus indikator. */
  addKri(riskId: string, input: KriInput): Promise<string>;
  updateKri(riskId: string, kriId: string, input: KriInput): Promise<void>;
  removeKri(riskId: string, kriId: string): Promise<void>;
}
