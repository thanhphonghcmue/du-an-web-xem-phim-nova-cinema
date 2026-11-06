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
for (const failure of ["none", "backend", "redis", "memory", "busy-web"])
  test(
    failure === "busy-web"
      ? "an old frontend occupying the port fails clearly before seed or backend startup"
      : failure === "memory"
        ? "explicit memory mode ignores an unavailable placeholder SQL configuration"
        : failure === "redis"
          ? "unavailable Redis selects RAM before seed/build and starts a usable frontend"
          : failure === "backend"
            ? "native startup failure falls back before frontend starts, without exposing an unusable API"
            : "npm dev prepares schema/seed then builds a missing native entrypoint before starting either server",
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
            "seed:admission:data": "node prepare.cjs admission",
          },
        }),
      );
      const healthyEntry =
        'require("node:http").createServer((q,s)=>{s.setHeader("content-type","application/json");s.end(JSON.stringify({fresh:true,service:"backend-stub"}));}).listen(Number(process.env.PORT),"127.0.0.1");';
      writeFileSync(
        join(dir, "prepare.cjs"),
        `const fs=require("node:fs"); const step=process.argv[2]; fs.appendFileSync("steps.txt",step+"\\n"); if(step==="build")fs.writeFileSync("backend/dist/main.js",${JSON.stringify(failure === "backend" ? "process.exit(1);" : healthyEntry)});`,
      );
      writeFileSync(
        join(dir, "node_modules/next/dist/bin/next"),
        'const args=process.argv.slice(2);require("node:http").createServer((q,s)=>s.end("frontend-stub")).listen(Number(args[args.indexOf("--port")+1]),"127.0.0.1");',
      );
      writeFileSync(
        join(dir, "backend/standalone-server.cjs"),
        healthyEntry.replace("backend-stub", "memory-stub"),
      );
      const probe = createServer((socket) => socket.destroy());
      probe.listen(0, "127.0.0.1");
      await once(probe, "listening");
      const port = probe.address().port;
      const apiPort = await freePort(),
        webPort = failure === "busy-web" ? port : await freePort();
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
          NOVA_BACKEND_MODE: failure === "memory" ? "memory" : "postgres",
          DATABASE_URL: `postgresql://${failure === "memory" ? "offline:offline" : "unused:unused"}@127.0.0.1:${port}/nova_owned_launcher_test`,
          REDIS_HOST: "127.0.0.1",
          REDIS_PORT: String(failure === "redis" ? await freePort() : port),
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
      if (failure === "busy-web") {
        const code = child.exitCode ?? (await once(child, "exit"))[0];
        assert.equal(code, 1);
        assert.equal(existsSync(join(dir, "steps.txt")), false);
        return;
      }
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
      assert.ok(
        ready,
        "frontend starts after preparation and backend readiness",
      );
      assert.equal(
        existsSync(join(dir, "steps.txt"))
          ? readFileSync(join(dir, "steps.txt"), "utf8")
          : "",
        ["redis", "memory"].includes(failure) ? "" : "seed\nbuild\nadmission\n",
      );
      assert.deepEqual(
        await (await fetch(`http://127.0.0.1:${apiPort}/api/v1/health`)).json(),
        {
          fresh: true,
          service: failure === "none" ? "backend-stub" : "memory-stub",
        },
      );
    },
  );
