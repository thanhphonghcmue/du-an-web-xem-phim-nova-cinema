// Chạy tuần tự: HTTP/DB/browser cùng database không được tranh outbox của nhau.
const { createRequire } = require("node:module");
const { resolve, join } = require("node:path");
const {
  mkdirSync,
  openSync,
  closeSync,
  writeFileSync,
  readFileSync,
  existsSync,
} = require("node:fs");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const root = resolve(__dirname, "..");
const req = createRequire(join(root, "backend/package.json"));
req("dotenv").config({ path: join(root, "backend/.env"), quiet: true });
const {
  testDatabaseTarget,
} = require("../backend/scripts/test-database-target.cjs");

async function main() {
  const args = process.argv.slice(2);
  if (
    args.some((arg) => !["--api-only", "--lab04"].includes(arg)) ||
    (args.includes("--api-only") && args.includes("--lab04"))
  )
    throw new Error(
      "Use npm run qa:native [-- --api-only] or npm run qa:lab04.",
    );
  const core = args.includes("--lab04");
  testDatabaseTarget(); // Từ chối database ứng dụng trước mọi migration/test.
  if (!process.env.npm_execpath || !existsSync(process.env.npm_execpath))
    throw new Error("Run this script through npm run qa:native.");
  const directory = join(
    root,
    ".runtime/qa-native",
    `${Date.now()}-${randomUUID().slice(0, 8)}`,
  );
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const report = {
    startedAt: new Date().toISOString(),
    nativeOnly: true,
    scope: core ? "lab04-core" : "full",
    steps: [],
    functionalStatus: "RUNNING",
    performanceBudgets: "NOT_MEASURED",
    optimizedPathBudgets: "NOT_MEASURED",
  };
  const metricsPath = join(directory, "performance.json");
  const env = {
    ...process.env,
    NOVA_QA_PRODUCTION: "1",
    NOVA_QA_METRICS_FILE: metricsPath,
    NOVA_QA_SMTP_METRICS_FILE: join(directory, "smtp-performance.json"),
    NOVA_QA_JOURNEY_METRICS_FILE: join(directory, "journey-performance.json"),
    NOVA_QA_OPTIMIZATION_METRICS_FILE: join(
      directory,
      "optimization-performance.json",
    ),
  };
  // Thư mục log riêng có thể chứa thông tin test thất bại; không commit hoặc in QR/token.
  async function run(name, args, direct = false) {
    const file = join(directory, `${name}.log`);
    const fd = openSync(file, "w", 0o600);
    const started = Date.now();
    const child = spawn(
      process.execPath,
      direct ? args : [process.env.npm_execpath, ...args],
      { cwd: root, env, stdio: ["ignore", fd, fd] },
    );
    const stop = () => child.kill("SIGTERM");
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    let code;
    try {
      code = await new Promise((done, fail) => {
        child.once("error", fail);
        child.once("exit", (exitCode) => done(exitCode ?? 1));
      });
    } finally {
      closeSync(fd);
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
    }
    report.steps.push({
      name,
      passed: code === 0,
      durationMs: Date.now() - started,
      log: `${name}.log`,
    });
    console.log(`[QA native] ${name}: ${code === 0 ? "PASS" : "FAIL"}`);
    if (code !== 0)
      throw new Error(`Step ${name} failed; inspect its private log.`);
  }
  console.log(`[QA native] Report/log directory: ${directory}`);
  try {
    await run("generate", ["run", "prisma:generate", "--workspace", "backend"]);
    await run("migrate-test", [
      "run",
      "db:migrate:test",
      "--workspace",
      "backend",
    ]);
    if (core) {
      await run("backend-core", ["run", "test:business"]);
    } else {
      await run("backend", ["run", "test:backend"]);
      await run("schema", ["run", "test:db"]);
      await run("node-ram", ["run", "test:unit"]);
    }
    await run("lint", ["run", "lint"]);
    if (!process.argv.includes("--api-only")) {
      await run("build", ["run", "build"]);
      if (!core)
        await run(
          "ram-startup",
          [join(root, "scripts/check-fullstack-startup.cjs")],
          true,
        );
      if (!core)
        await run(
          "upstream-failure",
          [join(root, "scripts/check-backend-only.cjs")],
          true,
        );
      if (core) {
        await run("browser-core", [
          "exec",
          "--",
          "playwright",
          "test",
          "tests/business-audit.spec.mjs",
          "tests/booking.spec.mjs",
          "tests/creative.spec.mjs",
          "tests/frontend-booking-resilience.spec.mjs",
          "--grep",
          "E2E-01|Sandbox success issues|duplicate catalogue/seat|a late HOLDING",
        ]);
      } else await run("browser", ["test"]);
    }
    report.functionalStatus = "PASSED";
    if (existsSync(metricsPath)) {
      const metrics = JSON.parse(readFileSync(metricsPath, "utf8"));
      report.performanceBudgets = metrics.measurements.every((entry) =>
        Object.values(entry.budgets).every((value) => value === true),
      )
        ? "MET"
        : "NOT_MET";
    }
    const optimizedPath = join(directory, "optimization-performance.json");
    if (existsSync(optimizedPath))
      report.optimizedPathBudgets =
        JSON.parse(readFileSync(optimizedPath, "utf8")).structuredTransport
          ?.budgets || "NOT_MEASURED";
  } catch (error) {
    report.functionalStatus = "FAILED";
    throw error;
  } finally {
    report.completedAt = new Date().toISOString();
    writeFileSync(
      join(directory, "summary.json"),
      JSON.stringify(report, null, 2) + "\n",
      { mode: 0o600 },
    );
    console.log(
      `[QA native] Functional=${report.functionalStatus}; performance budgets=${report.performanceBudgets}.`,
    );
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
