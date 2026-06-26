import { z } from "zod";

// Validasi wizard onboarding (FR-ONB-1..4). Dipakai per-langkah lewat `.pick()` agar
// pesan error muncul tepat saat user menekan "Lanjut".
export const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Nama perusahaan wajib diisi"),
  industryType: z.enum(["JASA", "DAGANG", "MANUFACTURE"], { message: "Pilih tipe industri" }),
  employeeCount: z.number().int().positive("Jumlah karyawan harus > 0"),
  departments: z.array(z.string().trim().min(1)).min(1, "Tambahkan minimal satu departemen"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
