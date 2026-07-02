import { useMutation } from "@tanstack/react-query";
import type { AiSuggestMonitoringInput } from "@/features/ai/domain";
import { useAiSuggestionService } from "./useAiSuggestionService";

/**
 * Usulkan rencana pemantauan AI (FR-AI-4): frekuensi review + kandidat KRI & ambangnya. Tidak
 * mempersist — keluaran dipakai untuk mem-prefill form review/KRI yang tetap dikonfirmasi manusia (D6).
 */
export const useSuggestMonitoring = () => {
  const service = useAiSuggestionService();
  return useMutation({
    mutationFn: (input: AiSuggestMonitoringInput) => service.suggestMonitoring(input),
  });
};
