import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  cpSync,
  symlinkSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
async function freePort() {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((done) => socket.close(done));
  return port;
}

// Kiểm tra orchestration với các service stub trên loopback, không giả đây là test PostgreSQL.
test(
  "npm dev prepares schema/seed then builds a missing native entrypoint before starting either server",
  { timeout: 45000 },
  async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "nova-owned-native-launcher-"));
    for (const name of [
      "scripts",
      "backend/dist",
      "frontend",
      "node_modules/next/dist/bin",
    ])
      mkdirSync(join(dir, name), { recursive: true });
    cpSync(
      join(root, "scripts/dev-fullstack.cjs"),
      join(dir, "scripts/dev-fullstack.cjs"),
    );
    symlinkSync(
      dirname(require.resolve("dotenv/package.json")),
      join(dir, "node_modules/dotenv"),
      "junction",
    );
    writeFileSync(join(dir, "backend/package.json"), "{}");
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        private: true,
        scripts: {
          seed: "node prepare.cjs seed",
          "build:backend": "node prepare.cjs build",
        },
      }),
    );
    const entry =
      'require("node:http").createServer((q,s)=>{s.setHeader("content-type","application/json");s.end(JSON.stringify({fresh:true,service:"backend-stub"}));}).listen(Number(process.env.PORT),"127.0.0.1");';
    writeFileSync(
      join(dir, "prepare.cjs"),
      `const fs=require("node:fs"); const step=process.argv[2]; fs.appendFileSync("steps.txt",step+"\\n"); if(step==="build")fs.writeFileSync("backend/dist/main.js",${JSON.stringify(entry)});`,
    );
    writeFileSync(
      join(dir, "node_modules/next/dist/bin/next"),
      'const args=process.argv.slice(2);require("node:http").createServer((q,s)=>s.end("frontend-stub")).listen(Number(args[args.indexOf("--port")+1]),"127.0.0.1");',
    );
    const probe = createServer((socket) => socket.destroy());
    probe.listen(0, "127.0.0.1");
    await once(probe, "listening");
    const port = probe.address().port;
    const apiPort = await freePort(),
      webPort = await freePort();
    const npmCli =
      process.env.npm_execpath ||
      [
        resolve(
          dirname(process.execPath),
          "../lib/node_modules/npm/bin/npm-cli.js",
        ),
        resolve(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
      ].find(existsSync);
    assert.ok(npmCli, "npm CLI must be available");
    const child = spawn(process.execPath, ["scripts/dev-fullstack.cjs"], {
      cwd: dir,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "development",
        npm_execpath: npmCli,
        NOVA_BACKEND_MODE: "postgres",
        DATABASE_URL: `postgresql://unused:unused@127.0.0.1:${port}/nova_owned_launcher_test`,
        NOVA_REFRESH_PROGRAMME: "true",
        NOVA_API_PORT: String(apiPort),
        NOVA_WEB_PORT: String(webPort),
      },
    });
    // Drain without printing inherited environment or unexpected subprocess output.
    child.stdout.resume();
    child.stderr.resume();
    t.after(async () => {
      child.kill("SIGTERM");
      if (child.exitCode === null && child.signalCode === null)
        await once(child, "exit");
      await new Promise((done) => probe.close(done));
      rmSync(dir, { recursive: true, force: true });
    });
    let ready = false;
    const until = Date.now() + 30000;
    while (Date.now() < until) {
      assert.equal(
        child.exitCode,
        null,
        "launcher must not exit before readiness",
      );
      try {
        const response = await fetch(`http://127.0.0.1:${webPort}`, {
          signal: AbortSignal.timeout(500),
        });
        if (response.ok && (await response.text()) === "frontend-stub") {
          ready = true;
          break;
        }
      } catch {
        /* Servers have not bound their loopback ports yet. */
      }
      await delay(100);
    }
    assert.ok(ready, "frontend starts after preparation and backend readiness");
    assert.equal(readFileSync(join(dir, "steps.txt"), "utf8"), "seed\nbuild\n");
    assert.deepEqual(
      await (await fetch(`http://127.0.0.1:${apiPort}/api/v1/health`)).json(),
      { fresh: true, service: "backend-stub" },
    );
  },
);
