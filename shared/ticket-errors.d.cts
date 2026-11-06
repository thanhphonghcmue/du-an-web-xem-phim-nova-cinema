export function ticketErrorFields(
  code: string,
  details: { checkedInAt?: string | Date | null } | undefined,
  timestamp?: number,
): Record<string, unknown>;
