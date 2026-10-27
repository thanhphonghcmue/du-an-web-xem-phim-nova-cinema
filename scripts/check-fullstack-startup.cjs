// Verify the launcher fails when its configured PostgreSQL is unavailable.
// Uses an owned loopback socket; never reads secrets or modifies a database.
const { createServer } = require("node:net");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { resolve } = require("node:path");
async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((done) => server.close(done));
  return port;
}
async function main() {
  const deadDatabase = createServer((socket) => socket.destroy());
  deadDatabase.listen(0, "127.0.0.1");
  await once(deadDatabase, "listening");
  const apiPort = await freePort(),
    webPort = await freePort();
  const child = spawn(process.execPath, ["scripts/dev-fullstack.cjs"], {
    cwd: resolve(__dirname, ".."),
    stdio: "ignore",
    env: {
      ...process.env,
      NODE_ENV: "development",
      NOVA_STANDALONE: "true",
      NOVA_REFRESH_PROGRAMME: "false",
      NOVA_API_PORT: String(apiPort),
      NOVA_WEB_PORT: String(webPort),
      DATABASE_URL: `postgresql://offline:offline@127.0.0.1:${deadDatabase.address().port}/nova_audit?connect_timeout=1`,
    },
  });
  const watchdog = setTimeout(() => child.kill("SIGTERM"), 15000);
  try {
    const [code] = await once(child, "exit");
    if (code === null || code === 0)
      throw new Error(
        "Expected a failed real-backend startup, not a fallback success.",
      );
    for (const port of [apiPort, webPort]) {
      let listening = false;
      try {
        listening = (
          await fetch(`http://127.0.0.1:${port}/api/v1/health`, {
            signal: AbortSignal.timeout(1000),
          })
        ).ok;
      } catch {
        /* No server is the expected result. */
      }
      if (listening)
        throw new Error(
          "A server remained available after the failed startup.",
        );
    }
    console.log(
      "PASS launcher: unavailable configured PostgreSQL exits nonzero; no RAM API or frontend is started, even with the obsolete demo flag.",
    );
  } finally {
    clearTimeout(watchdog);
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGTERM");
    await new Promise((done) => deadDatabase.close(done));
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
