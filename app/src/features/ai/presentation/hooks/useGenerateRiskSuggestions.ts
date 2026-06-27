import { useMutation } from "@tanstack/react-query";
import type { AiSuggestRisksInput } from "@/features/ai/domain";
import { useAiSuggestionService } from "./useAiSuggestionService";

/**
 * Hasilkan usulan risiko AI (FR-AI-1). Tidak mempersist apa pun — keluaran adalah draft
 * kandidat yang ditampilkan untuk dikonfirmasi manusia sebelum masuk register (D6).
 */
export const useGenerateRiskSuggestions = () => {
  const service = useAiSuggestionService();
  return useMutation({
    mutationFn: (input: AiSuggestRisksInput) => service.suggestRisks(input),
  });
};
