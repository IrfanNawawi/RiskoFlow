import type { Department, User, Company } from "@/data/types";

/**
 * DTO data referensi dashboard (departemen/user/perusahaan aktif).
 *
 * ⚠️ Mock phase: sumbernya store yang sudah berbentuk domain, jadi DTO ≈ entity.
 * Remote: `DashboardRemoteDataSource` memetakan baris Postgres snake_case ke bentuk ini.
 * Daftar risiko/insiden TIDAK di sini — di-compose dari repository fitur risks/incidents.
 */
export interface DashboardReferenceDTO {
  departments: Department[];
  users: User[];
  company: Company;
}
