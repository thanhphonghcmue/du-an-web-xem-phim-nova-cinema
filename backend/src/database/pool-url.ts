// Prisma's CPU-based default can exceed PostgreSQL's connection budget on large
// cloud hosts. Keep one bounded pool per Nest application; never share it across
// unrelated application/test databases through globalThis.
export function boundedPoolUrl(value: string): string {
  const url = new URL(value);
  if (!url.searchParams.has("connection_limit"))
    url.searchParams.set("connection_limit", "10");
  const isLocal =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1";
  for (const [key, maximum] of [
    ["pool_timeout", isLocal ? 2 : 10],
    ["connect_timeout", isLocal ? 3 : 15],
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
