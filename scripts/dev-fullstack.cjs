const { spawn } = require("node:child_process");
const { resolve } = require("node:path");
const root = resolve(__dirname, "..");
const apiPort = Number(process.env.NOVA_API_PORT || 4000),
  webPort = Number(process.env.NOVA_WEB_PORT || 3000);
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => stop());
function start(args, cwd, env) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: "inherit" });
  children.push(child);
  child.once("error", () => stop(1));
  child.once("exit", (code) => {
    if (!stopping) stop(code || 1);
  });
  return child;
}
async function main() {
  start(["dist/main.js"], resolve(root, "backend"), {
    ...process.env,
    PORT: String(apiPort),
    PAYMENT_RETURN_ORIGINS:
      process.env.PAYMENT_RETURN_ORIGINS ||
      `http://localhost:${webPort},http://127.0.0.1:${webPort}`,
  });
  let ready = false;
  for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
    try {
      const r = await fetch(`http://127.0.0.1:${apiPort}/api/v1/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Backend may still be connecting to required services. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) {
    console.error(
      "Backend readiness failed. Run npm run setup:local and check PostgreSQL/Redis.",
    );
    stop(1);
    return;
  }
  start(
    [
      resolve(root, "node_modules/next/dist/bin/next"),
      "dev",
      "--hostname",
      "0.0.0.0",
      "--port",
      String(webPort),
    ],
    root,
    { ...process.env, BACKEND_API_URL: `http://127.0.0.1:${apiPort}/api/v1` },
  );
}
main().catch(() => stop(1));
