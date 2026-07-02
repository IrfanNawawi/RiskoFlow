import type { SupabaseClient } from "@supabase/supabase-js";
import { useStore } from "@/data/store";
import type { Company, Department, User } from "@/data/types";
import type { DashboardReferenceDTO } from "./dashboard.dto";

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
interface CompanyRow {
  id: string;
  name: string;
  industry_type: Company["industryType"];
  employee_count: number;
  close_approval_threshold: number;
  ai_enabled: boolean;
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
function toCompany(r: CompanyRow): Company {
  return {
    id: r.id,
    name: r.name,
    industryType: r.industry_type,
    employeeCount: r.employee_count,
    closeApprovalThreshold: r.close_approval_threshold,
    aiEnabled: r.ai_enabled,
  };
}

/**
 * Data source referensi dashboard (Supabase) — signature identik `DashboardMockDataSource`.
 * Scoping tenant sementara via `activeCompanyId` store (auth ditunda); ganti dengan RLS + `auth.uid()`.
 */
export class DashboardRemoteDataSource {
  constructor(private readonly sb: SupabaseClient) {}

  private companyId(): string {
    return useStore.getState().activeCompanyId;
  }

  async getReference(): Promise<DashboardReferenceDTO> {
    const cid = this.companyId();
    const [deptRes, memberRes, companyRes] = await Promise.all([
      this.sb.from("departments").select("id, company_id, name, description, head_user_id").eq("company_id", cid),
      this.sb.from("memberships").select("users ( id, name, email, initials )").eq("company_id", cid),
      this.sb.from("companies").select("id, name, industry_type, employee_count, close_approval_threshold, ai_enabled").eq("id", cid).maybeSingle(),
    ]);
    if (deptRes.error) throw deptRes.error;
    if (memberRes.error) throw memberRes.error;
    if (companyRes.error) throw companyRes.error;

    const departments = (deptRes.data as unknown as DepartmentRow[]).map(toDepartment);
    const users: User[] = (memberRes.data as unknown as Array<{ users: UserRow | null }>)
      .map((m) => m.users)
      .filter((u): u is UserRow => u !== null);
    const company = toCompany(companyRes.data as unknown as CompanyRow);
    return { departments, users, company };
  }
}
