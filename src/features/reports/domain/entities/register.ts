import type { Risk } from "@/data/types";

/**
 * Risiko yang layak masuk laporan: buang draft AI yang belum dikonfirmasi (FR-RISK-5) —
 * laporan hanya mencerminkan risiko resmi. Pure function agar dapat diuji & di-reuse.
 */
export const reportableRisks = (risks: Risk[]): Risk[] => risks.filter((r) => !r.aiSuggested);
