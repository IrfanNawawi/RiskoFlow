/** Query-key factory incidents — selalu sertakan `companyId` (multi-tenant). */
export const incidentKeys = {
  all: (companyId: string) => ["incidents", companyId] as const,
  list: (companyId: string) => [...incidentKeys.all(companyId), "list"] as const,
};
