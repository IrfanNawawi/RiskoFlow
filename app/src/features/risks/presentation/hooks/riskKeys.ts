/**
 * Query-key factory untuk fitur risks. **Selalu** sertakan `companyId` (perusahaan
 * aktif) agar cache ter-scope per tenant dan ganti perusahaan otomatis memisah cache
 * (multi-tenant, aturan inti #4/#5).
 */
export const riskKeys = {
  all: (companyId: string) => ["risks", companyId] as const,
  list: (companyId: string) => [...riskKeys.all(companyId), "list"] as const,
  detail: (companyId: string, id: string) => [...riskKeys.all(companyId), "detail", id] as const,
};
