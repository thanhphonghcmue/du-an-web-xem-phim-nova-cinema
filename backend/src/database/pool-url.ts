// Prisma's CPU-based default can exceed PostgreSQL's connection budget on large
// cloud hosts. Keep one bounded pool per Nest application; never share it across
// unrelated application/test databases through globalThis.
export function boundedPoolUrl(value: string): string {
  const url = new URL(value);
  if (!url.searchParams.has("connection_limit"))
    url.searchParams.set("connection_limit", "10");
  for (const [key, maximum] of [
    ["pool_timeout", 2],
    ["connect_timeout", 3],
  ] as const) {
    const configured = Number(url.searchParams.get(key));
    url.searchParams.set(
      key,
      String(
        Number.isFinite(configured) && configured > 0
          ? Math.min(configured, maximum)
          : maximum,
      ),
    );
  }
  return url.toString();
}
