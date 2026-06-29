import { useMutation } from "@tanstack/react-query";
import type { AiSuggestTreatmentInput } from "@/features/ai/domain";
import { useAiSuggestionService } from "./useAiSuggestionService";

/**
 * Usulkan rencana mitigasi AI (FR-AI-3). Tidak mempersist — keluaran dipakai untuk
 * mem-prefill form mitigasi yang tetap diedit & dikonfirmasi manusia (D6).
 */
export const useSuggestTreatment = () => {
  const service = useAiSuggestionService();
  return useMutation({
    mutationFn: (input: AiSuggestTreatmentInput) => service.suggestTreatment(input),
  });
};
