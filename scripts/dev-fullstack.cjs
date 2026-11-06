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
function start(args, cwd, env, fatal = true) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: "inherit" });
  children.push(child);
  child.once("error", () => stop(1));
  child.once("exit", (code) => {
    if (!stopping && fatal) stop(code || 1);
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

async function waitForBackend(port, child) {
  for (let attempt = 0; attempt < 20 && !stopping; attempt++) {
    if (child.exitCode !== null || child.signalCode !== null) return false;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) return true;
    } catch {
      /* Chưa bind cổng hoặc dịch vụ chưa sẵn sàng. */
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  return false;
}
async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((done) => {
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    child.once("exit", () => {
      clearTimeout(timer);
      done();
    });
    child.kill("SIGTERM");
  });
}

async function main() {
  if (
    ![apiPort, webPort].every(
      (port) => Number.isInteger(port) && port > 0 && port <= 65535,
    ) ||
    apiPort === webPort
  ) {
    console.error(
      "[NOVA] NOVA_API_PORT and NOVA_WEB_PORT must be distinct valid ports.",
    );
    stop(1);
    return;
  }
  for (const [name, port] of [
    ["API", apiPort],
    ["Frontend", webPort],
  ]) {
    if (await checkPort(port)) {
      console.error(
        `[NOVA] ${name} port ${port} is already in use. Stop the old NOVA process or choose a free NOVA_API_PORT/NOVA_WEB_PORT, then run npm run dev:full again.`,
      );
      stop(1);
      return;
    }
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
  const hasRedis =
    hasDb &&
    (await checkPort(
      Number(process.env.REDIS_PORT || 6380),
      process.env.REDIS_HOST || "127.0.0.1",
    ));
  let useStandaloneBackend = !hasDb || !hasRedis;
  if (useStandaloneBackend)
    console.log(
      "[NOVA] PostgreSQL/Redis unavailable/unconfigured; automatic native RAM fallback (data resets on restart).",
    );

  if (!useStandaloneBackend && process.env.NODE_ENV !== "production") {
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
      ...(process.env.NOVA_REFRESH_PROGRAMME !== "false"
        ? ["seed:admission:data"]
        : []),
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

  if (stopping) return; // Ctrl+C trong seed/build không được khởi động thêm process.
  const backendEnv = {
    ...process.env,
    PORT: String(apiPort),
    NOVA_API_PORT: String(apiPort),
    PAYMENT_RETURN_ORIGINS:
      process.env.PAYMENT_RETURN_ORIGINS ||
      `http://localhost:${webPort},http://127.0.0.1:${webPort}`,
  };
  const launchBackend = () => {
    if (useStandaloneBackend)
      console.log(
        `[NOVA] Khởi động máy chủ backend độc lập trên cổng ${apiPort}...`,
      );
    return start(
      useStandaloneBackend
        ? ["backend/standalone-server.cjs"]
        : ["dist/main.js"],
      useStandaloneBackend ? root : resolve(root, "backend"),
      backendEnv,
      false,
    );
  };
  let backend = launchBackend();
  let ready = await waitForBackend(apiPort, backend);
  // Chỉ fallback lúc khởi động; không thay dữ liệu SQL bằng RAM giữa phiên đặt vé.
  if (!ready && !useStandaloneBackend && !stopping) {
    console.error(
      "[NOVA] Native backend failed readiness (PostgreSQL/Redis/config). Switching to disposable RAM; SQL data is unchanged.",
    );
    await stopChild(backend);
    useStandaloneBackend = true;
    backend = launchBackend();
    ready = await waitForBackend(apiPort, backend);
  }
  if (stopping) return;
  if (!ready) {
    console.error(
      "Backend readiness failed. Check backend/.env and the API port.",
    );
    stop(1);
    return;
  }
  backend.once("exit", (code) => {
    if (!stopping) stop(code || 1);
  });
  console.log(`[NOVA] Backend sẵn sàng tại http://127.0.0.1:${apiPort}/api/v1`);
  console.log(
    `[NOVA] Khởi động Next.js Frontend tại http://localhost:${webPort}...`,
  );

  const frontendDir = resolve(root, "frontend");
  const feCwd = require("node:fs").existsSync(frontendDir) ? frontendDir : root;

  const frontend = start(
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
  // Làm nóng catch-all BFF trong Next dev trước khi báo sẵn sàng; không chờ người dùng
  // mở lịch mới biên dịch route API rồi chạm deadline 8 giây của trình duyệt.
  if (!(await waitForBackend(webPort, frontend))) {
    if (!stopping)
      console.error(
        "[NOVA] Frontend/API warmup failed. Check the Next.js error above.",
      );
    stop(1);
    return;
  }
  console.log(
    `[NOVA] Frontend và API đã sẵn sàng: http://localhost:${webPort}`,
  );
}
main().catch(() => stop(1));
