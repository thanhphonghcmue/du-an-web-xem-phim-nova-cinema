export function holdSeconds(expiresAt, offset = 0, now = Date.now()) {
  const deadline = new Date(expiresAt).getTime();
  return Number.isFinite(deadline)
    ? Math.max(0, Math.ceil((deadline - now - offset) / 1000))
    : 0;
}
