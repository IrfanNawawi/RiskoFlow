import { useMutation } from "@tanstack/react-query";
import type { AiSuggestAssessmentInput } from "@/features/ai/domain";
import { useAiSuggestionService } from "./useAiSuggestionService";

/**
 * Usulkan penilaian awal AI (FR-AI-2): likelihood & impact skala 1..5 + rationale. Tidak
 * mempersist — keluaran dipakai untuk mem-prefill form penilaian yang tetap diedit &
 * dikonfirmasi manusia (D6).
 */
export const useSuggestAssessment = () => {
  const service = useAiSuggestionService();
  return useMutation({
    mutationFn: (input: AiSuggestAssessmentInput) => service.suggestAssessment(input),
  });
};
