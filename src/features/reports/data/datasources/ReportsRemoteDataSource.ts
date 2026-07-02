import type { SupabaseClient } from "@supabase/supabase-js";
import { useStore } from "@/data/store";
import type { Department, User } from "@/data/types";
import type { ReportsReferenceDTO } from "./reports.dto";

interface DepartmentRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  head_user_id: string | null;
}
interface UserRow {
  id: string;
  name: string;
  email: string;
  initials: string;
}

function toDepartment(r: DepartmentRow): Department {
  return {
    id: r.id,
    companyId: r.company_id,
    name: r.name,
    description: r.description ?? undefined,
    headUserId: r.head_user_id ?? undefined,
  };
}

/**
 * Data source referensi reports (Supabase) — signature identik `ReportsMockDataSource`.
 * Scoping tenant sementara via `activeCompanyId` store (auth ditunda); ganti dengan RLS + `auth.uid()`.
 */
export class ReportsRemoteDataSource {
  constructor(private readonly sb: SupabaseClient) {}

  private companyId(): string {
    return useStore.getState().activeCompanyId;
  }

  async getReference(): Promise<ReportsReferenceDTO> {
    const cid = this.companyId();
    const [deptRes, memberRes] = await Promise.all([
      this.sb.from("departments").select("id, company_id, name, description, head_user_id").eq("company_id", cid),
      this.sb.from("memberships").select("users ( id, name, email, initials )").eq("company_id", cid),
    ]);
    if (deptRes.error) throw deptRes.error;
    if (memberRes.error) throw memberRes.error;

    const departments = (deptRes.data as unknown as DepartmentRow[]).map(toDepartment);
    const users: User[] = (memberRes.data as unknown as Array<{ users: UserRow | null }>)
      .map((m) => m.users)
      .filter((u): u is UserRow => u !== null);
    return { departments, users };
  }
}
