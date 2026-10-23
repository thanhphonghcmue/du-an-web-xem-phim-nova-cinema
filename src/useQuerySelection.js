import { useState } from "react";
import { useSearchParams } from "next/navigation";

// Navigation may retain App and the timeline. A changed URL must take precedence
// over their previous selection, while manual changes still work on that URL.
export function useQuerySelection(key) {
  const params = useSearchParams();
  const incoming = params.get(key) || "";
  const [choice, setChoice] = useState({ source: incoming, value: incoming });
  const value = choice.source === incoming ? choice.value : incoming;
  return [value, (next) => setChoice({ source: incoming, value: next })];
}
