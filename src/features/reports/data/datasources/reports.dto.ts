import type { Department, User } from "@/data/types";

/**
 * DTO data referensi reports (departemen/user) untuk resolusi nama baris ekspor.
 * ⚠️ Mock phase: sumbernya store yang sudah berbentuk domain, jadi DTO ≈ entity.
 * Daftar risiko di-compose dari repository fitur risks (reuse SELECT/mapper-nya).
 */
export interface ReportsReferenceDTO {
  departments: Department[];
  users: User[];
}
