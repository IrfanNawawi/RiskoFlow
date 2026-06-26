import type { Risk } from "@/data/types";

/**
 * DTO = bentuk mentah dari sumber data sebelum dipetakan ke entity domain.
 *
 * ⚠️ Mock phase: sumber data adalah Zustand store yang **sudah** menyimpan objek
 * berbentuk domain, sehingga `RiskDTO` untuk sekarang identik dengan `Risk`.
 * Saat Supabase masuk, ganti tipe ini dengan bentuk baris Postgres (kolom snake_case:
 * `company_id`, `next_review_date`, …) dan pemetaannya dipusatkan di mapper — tanpa
 * menyentuh `presentation`.
 */
export type RiskDTO = Risk;
