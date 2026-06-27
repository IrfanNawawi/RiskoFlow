import type { IndustryType } from "@/data/types";
import type { AiRiskSuggestion } from "@/features/ai/domain";

/**
 * Pustaka kandidat risiko per industri — sumber untuk `MockAiSuggestionService`.
 *
 * ⚠️ Ini **bukan** keluaran LLM; hanya seed deterministik agar alur "Generate AI" bisa
 * diuji tanpa backend. Saat Edge Function + Gemini aktif (D6), library ini diganti hasil
 * model. Bukan nasihat risiko resmi.
 */
export const AI_RISK_LIBRARY: Record<IndustryType, AiRiskSuggestion[]> = {
  MANUFACTURE: [
    { title: "Kegagalan mesin produksi tak terjadwal", category: "OPERATIONAL", source: "INTERNAL", likelihood: 3, impact: 4, rationale: "Downtime lini berdampak langsung ke output & biaya.", confidence: 88 },
    { title: "Kecelakaan kerja di area produksi", category: "OPERATIONAL", source: "INTERNAL", likelihood: 2, impact: 5, rationale: "Kewajiban K3 (UU 1/1970, SMK3); dampak korban & sanksi.", confidence: 84 },
    { title: "Pencemaran limbah B3 melebihi baku mutu", category: "LEGAL", source: "INTERNAL", likelihood: 2, impact: 4, rationale: "Sanksi PP 22/2021 & risiko reputasi lingkungan.", confidence: 79 },
    { title: "Keterlambatan pasokan bahan baku kritis", category: "OPERATIONAL", source: "EXTERNAL", likelihood: 3, impact: 3, rationale: "Ketergantungan pemasok tunggal mengganggu jadwal.", confidence: 76 },
    { title: "Cacat mutu produk lolos QC", category: "REPUTATIONAL", source: "INTERNAL", likelihood: 2, impact: 4, rationale: "Recall & klaim pelanggan menggerus kepercayaan.", confidence: 74 },
  ],
  DAGANG: [
    { title: "Kehabisan stok barang laris (stockout)", category: "OPERATIONAL", source: "INTERNAL", likelihood: 3, impact: 3, rationale: "Hilang penjualan & beralihnya pelanggan ke kompetitor.", confidence: 85 },
    { title: "Penipuan pembayaran / chargeback", category: "FINANCIAL", source: "EXTERNAL", likelihood: 3, impact: 3, rationale: "Transaksi online rawan fraud & sengketa kartu.", confidence: 80 },
    { title: "Kebocoran data pelanggan", category: "LEGAL", source: "INTERNAL", likelihood: 2, impact: 4, rationale: "Kewajiban UU 27/2022 (PDP); denda & hilang kepercayaan.", confidence: 78 },
    { title: "Fluktuasi harga & nilai tukar pemasok impor", category: "FINANCIAL", source: "EXTERNAL", likelihood: 3, impact: 3, rationale: "Margin tergerus oleh volatilitas kurs.", confidence: 72 },
    { title: "Klaim perlindungan konsumen atas produk", category: "LEGAL", source: "EXTERNAL", likelihood: 2, impact: 3, rationale: "UU 8/1999; sengketa kualitas/garansi.", confidence: 70 },
  ],
  JASA: [
    { title: "Kebocoran data atau insiden siber", category: "OPERATIONAL", source: "EXTERNAL", likelihood: 3, impact: 4, rationale: "Layanan digital jadi target; dampak PDP & SLA.", confidence: 86 },
    { title: "Ketergantungan pada karyawan kunci", category: "STRATEGIC", source: "INTERNAL", likelihood: 3, impact: 3, rationale: "Hilangnya talenta inti mengganggu kontinuitas layanan.", confidence: 79 },
    { title: "Pelanggaran SLA ke pelanggan", category: "REPUTATIONAL", source: "INTERNAL", likelihood: 2, impact: 3, rationale: "Penalti kontrak & churn pelanggan.", confidence: 77 },
    { title: "Ketidakpatuhan regulasi sektoral", category: "LEGAL", source: "EXTERNAL", likelihood: 2, impact: 4, rationale: "Sanksi regulator (mis. OJK untuk jasa keuangan).", confidence: 73 },
    { title: "Gangguan layanan pihak ketiga (vendor)", category: "OPERATIONAL", source: "EXTERNAL", likelihood: 3, impact: 3, rationale: "Outage penyedia cloud/pembayaran menghentikan operasi.", confidence: 71 },
  ],
};
