import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "dotenv";

// Next loads frontend/.env* before evaluating next.config. Preserve a previous
// root frontend configuration only when that key has not already been set.
// Deliberately allowlist public origin and server upstream, never DB/JWT secrets.
export function legacyFrontendEnv(root, current, mode) {
  const values = {};
  const manifest = join(root, "package.json");
  if (!existsSync(manifest)) return values;
  const workspaces = JSON.parse(readFileSync(manifest, "utf8")).workspaces;
  if (!Array.isArray(workspaces) || !workspaces.includes("frontend"))
    return values;
  const names = [
    `.env.${mode}.local`,
    ...(mode === "test" ? [] : [".env.local"]),
    `.env.${mode}`,
    ".env",
  ];
  for (const name of names) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    const parsed = parse(readFileSync(path));
    for (const key of ["BACKEND_API_URL", "NEXT_PUBLIC_SITE_URL"]) {
      if (
        current[key] === undefined &&
        values[key] === undefined &&
        parsed[key] !== undefined
      )
        values[key] = parsed[key];
    }
  }
  return values;
}
