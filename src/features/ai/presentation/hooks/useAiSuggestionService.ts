import { useMemo } from "react";
import { MockAiSuggestionService } from "@/features/ai/data";
import type { IAiSuggestionService } from "@/features/ai/domain";

/**
 * DI factory layanan AI. Kini selalu mock (lokal). Target: pilih `AiEdgeSuggestionService`
 * (Edge Function) saat tersedia — presentation tetap memakai tipe `IAiSuggestionService`.
 */
export const useAiSuggestionService = (): IAiSuggestionService =>
  useMemo(() => new MockAiSuggestionService(), []);
