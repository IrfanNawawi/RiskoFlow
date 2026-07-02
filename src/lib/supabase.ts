import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Singleton klien Supabase + flag konfigurasi.
 *
 * Sumber kredensial: env publik `VITE_*` (Aturan inti #10) — aman di browser.
 * Bila `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` belum diisi, `isSupabaseConfigured`
 * bernilai `false` dan DI hook tiap fitur fallback ke `*MockDataSource` (dev tanpa
 * backend). Begitu env terisi, datasource Supabase otomatis dipakai — tanpa sentuh
 * presentation.
 *
 * ⚠️ Auth masih ditunda: scoping multi-tenant sementara dilakukan client-side via
 * `company_id` (lihat `*RemoteDataSource`). Target: Supabase Auth + RLS `auth.uid()`.
 */
const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

/** `true` bila kredensial Supabase tersedia; dipakai DI hook untuk memilih datasource. */
export const isSupabaseConfigured = url.length > 0 && anonKey.length > 0;

/**
 * `true` bila **Supabase Auth** diaktifkan secara eksplisit (`VITE_SUPABASE_AUTH=true`).
 *
 * ⚠️ Sengaja terpisah dari `isSupabaseConfigured`: PostgREST/DB bisa aktif sementara
 * Auth masih ditunda (belum ada user Auth). Selama flag ini `false`, fitur auth memakai
 * login demo (pilih user) agar app tetap dapat dipakai; scoping tetap client-side.
 * Butuh `isSupabaseConfigured` juga (Auth mustahil tanpa klien terkonfigurasi).
 */
export const isAuthEnabled =
  isSupabaseConfigured && import.meta.env.VITE_SUPABASE_AUTH?.trim() === "true";

/**
 * Klien Supabase. Saat tipe DB sudah di-generate (`supabase gen types typescript`),
 * ganti menjadi `createClient<Database>(...)` dari `@/lib/database.types` agar query
 * type-safe. Kini dibiarkan generik-lepas; hasil query di-cast ke DTO di datasource.
 *
 * Bila belum dikonfigurasi, klien tetap dibuat dengan placeholder agar import tidak
 * gagal — tetapi datasource Supabase tidak akan dipanggil (lihat `isSupabaseConfigured`).
 */
export const supabase: SupabaseClient = createClient(
  url || "http://localhost",
  anonKey || "public-anon-key-placeholder",
);
