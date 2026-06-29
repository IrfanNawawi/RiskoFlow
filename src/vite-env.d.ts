/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL project Supabase (publik). Kosong → fallback mock. */
  readonly VITE_SUPABASE_URL?: string;
  /** Anon key Supabase (publik). Kosong → fallback mock. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /**
   * ⚠️ DEV-ONLY. Bila diisi, fitur AI memanggil Gemini **langsung dari browser**
   * (tanpa Edge Function) agar bisa dites lokal tanpa Supabase CLI/Docker. Key akan
   * **terekspos di bundle browser** — JANGAN dipakai di produksi (langgar Aturan inti #10).
   * Kosongkan untuk memakai Edge Function (`ai-suggest`) yang aman.
   */
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
