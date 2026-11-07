export interface BootstrapConfig {
  port: number;
  host: string;
  corsOrigins: string[];
}

export function readBootstrapConfig(
  environment: NodeJS.ProcessEnv,
): BootstrapConfig {
  const rawPort = environment.PORT ?? "4000";
  if (!/^\d+$/.test(rawPort)) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  const host = environment.HOST?.trim() ?? "0.0.0.0";
  if (host.length === 0) {
    throw new Error("HOST must not be empty.");
  }
  const rawOrigins = [
    ...(
      environment.CORS_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000"
    ).split(","),
    ...(environment.FRONTEND_URL ? environment.FRONTEND_URL.split(",") : []),
    ...(environment.NEXT_PUBLIC_SITE_URL
      ? environment.NEXT_PUBLIC_SITE_URL.split(",")
      : []),
  ]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const corsOrigins: string[] = [];
  for (const origin of rawOrigins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error("CORS_ORIGINS must contain valid HTTP(S) origins.");
    }
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username !== "" ||
      parsed.password !== ""
    ) {
      throw new Error(
        "CORS_ORIGINS must contain HTTP(S) origins without paths or credentials.",
      );
    }
    corsOrigins.push(parsed.origin);
  }
  return { port, host, corsOrigins: [...new Set(corsOrigins)] };
}
