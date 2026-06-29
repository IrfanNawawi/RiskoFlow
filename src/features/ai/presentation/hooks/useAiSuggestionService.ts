import { useMemo } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { AiBrowserGeminiService, AiEdgeSuggestionService, MockAiSuggestionService } from "@/features/ai/data";
import type { IAiSuggestionService } from "@/features/ai/domain";

/**
 * DI factory layanan AI (pola dual-mode sejajar `use<Name>Repository`). Prioritas:
 *
 * 1. `VITE_GEMINI_API_KEY` terisi → `AiBrowserGeminiService` — ⚠️ **DEV-ONLY**: panggil Gemini
 *    langsung dari browser agar bisa dites lokal tanpa Supabase CLI/Docker (key terekspos).
 * 2. Supabase dikonfigurasi → `AiEdgeSuggestionService` (Edge Function `ai-suggest` + Gemini, key di
 *    server — NFR-08/D6). Bila Edge/Gemini gagal, service **melempar error** → UI menampilkan pesan.
 * 3. Selain itu → `MockAiSuggestionService` (dev tanpa backend).
 *
 * Presentation tetap memakai tipe `IAiSuggestionService` tanpa tahu implementasinya.
 */
export const useAiSuggestionService = (): IAiSuggestionService =>
  useMemo(() => {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim() ?? "";
    if (geminiKey) return new AiBrowserGeminiService(geminiKey);
    if (isSupabaseConfigured) return new AiEdgeSuggestionService(supabase);
    return new MockAiSuggestionService();
  }, []);
