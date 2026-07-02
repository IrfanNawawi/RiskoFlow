/**
 * Query-key factory dashboard. **Selalu** sertakan `companyId` (perusahaan aktif) agar
 * cache ter-scope per tenant — ganti perusahaan otomatis memisah cache (aturan inti #4/#5).
 */
export const dashboardKeys = {
  all: (companyId: string) => ["dashboard", companyId] as const,
  overview: (companyId: string) => [...dashboardKeys.all(companyId), "overview"] as const,
};
