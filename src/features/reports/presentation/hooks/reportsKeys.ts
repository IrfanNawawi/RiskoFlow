/**
 * Query-key factory reports. **Selalu** sertakan `companyId` (perusahaan aktif) agar
 * cache ter-scope per tenant — ganti perusahaan otomatis memisah cache (aturan inti #4/#5).
 */
export const reportsKeys = {
  all: (companyId: string) => ["reports", companyId] as const,
  register: (companyId: string) => [...reportsKeys.all(companyId), "register"] as const,
};
