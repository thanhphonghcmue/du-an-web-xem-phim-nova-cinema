const { spawn } = require("node:child_process");
const { resolve } = require("node:path");
const net = require("node:net");
const root = resolve(__dirname, "..");
require("node:module")
  .createRequire(resolve(root, "backend/package.json"))("dotenv")
  .config({ path: resolve(root, "backend/.env"), quiet: true });
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

function checkPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function main() {
  if (
    process.env.DATABASE_URL &&
    process.env.DATABASE_URL.includes("offline:offline")
  ) {
    console.error("Configured database is unavailable.");
    stop(1);
    return;
  }

  let target;
  try {
    if (process.env.DATABASE_URL) target = new URL(process.env.DATABASE_URL);
  } catch {
    /* An invalid connection cannot select a working persisted backend. */
  }
  const hasDb =
    process.env.NOVA_BACKEND_MODE !== "memory" &&
    target &&
    ["postgresql:", "postgres:"].includes(target.protocol) &&
    (await checkPort(Number(target.port || 5432), target.hostname));
  let useStandaloneBackend = !hasDb;
  if (!hasDb)
    console.log(
      "[NOVA] PostgreSQL unavailable/unconfigured; automatic native RAM fallback (data resets on restart).",
    );

  if (hasDb && process.env.NODE_ENV !== "production") {
    const npmCli = process.env.npm_execpath;
    if (!npmCli) {
      console.error(
        "Use npm run dev to prepare the native PostgreSQL backend.",
      );
      stop(1);
      return;
    }
    // Pull mới không được chạy dist cũ hoặc seed trước khi có schema/Prisma Client.
    const tasks = [
      ...(process.env.NOVA_REFRESH_PROGRAMME !== "false" ? ["seed"] : []),
      "build:backend",
    ];
    for (const task of tasks) {
      console.log("[NOVA] Preparing native backend:", task);
      const code = await new Promise((resolveCode, reject) => {
        const seed = spawn(process.execPath, [npmCli, "run", task], {
          cwd: root,
          env: process.env,
          stdio: "inherit",
        });
        children.push(seed);
        seed.once("error", reject);
        seed.once("exit", (code) => resolveCode(code));
      });
      if (code !== 0 || stopping) {
        if (!stopping)
          console.error(
            "[NOVA] Native preparation failed; using the approved disposable RAM fallback.",
          );
        useStandaloneBackend = true;
        break;
      }
    }
  }

  if (useStandaloneBackend) {
    console.log(
      `[NOVA] Khởi động máy chủ backend độc lập trên cổng ${apiPort}...`,
    );
    start(["backend/standalone-server.cjs"], root, {
      ...process.env,
      PORT: String(apiPort),
      NOVA_API_PORT: String(apiPort),
    });
  } else {
    start(["dist/main.js"], resolve(root, "backend"), {
      ...process.env,
      PORT: String(apiPort),
      PAYMENT_RETURN_ORIGINS:
        process.env.PAYMENT_RETURN_ORIGINS ||
        `http://localhost:${webPort},http://127.0.0.1:${webPort}`,
    });
  }

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
      "Backend readiness failed. Check the configured PostgreSQL/Redis connection and backend/.env.",
    );
    stop(1);
    return;
  }

  console.log(`[NOVA] Backend sẵn sàng tại http://127.0.0.1:${apiPort}/api/v1`);
  console.log(
    `[NOVA] Khởi động Next.js Frontend tại http://localhost:${webPort}...`,
  );

  const frontendDir = resolve(root, "frontend");
  const feCwd = require("node:fs").existsSync(frontendDir) ? frontendDir : root;

  start(
    [
      require.resolve("next/dist/bin/next", {
        paths: [resolve(root, "frontend")],
      }),
      "dev",
      "--webpack",
      "--hostname",
      "0.0.0.0",
      "--port",
      String(webPort),
    ],
    feCwd,
    {
      ...process.env,
      BACKEND_API_URL: `http://127.0.0.1:${apiPort}/api/v1`,
    },
  );
}
main().catch(() => stop(1));
