/** Query-key factory compliance — selalu sertakan `companyId` (multi-tenant). */
export const complianceKeys = {
  all: (companyId: string) => ["compliance", companyId] as const,
  list: (companyId: string) => [...complianceKeys.all(companyId), "list"] as const,
};
