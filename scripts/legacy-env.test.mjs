import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { legacyFrontendEnv } from "../frontend/legacy-env.mjs";
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "nova relocated config "));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ workspaces: ["frontend", "backend"] }),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
test("relocated frontend retains legacy upstream/origin but never imports DB/JWT keys", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, ".env"),
    'BACKEND_API_URL="http://127.0.0.1:49001/api/v1" # prior port\nNEXT_PUBLIC_SITE_URL=http://localhost:39001\nDATABASE_URL=not-for-frontend\nJWT_ACCESS_SECRET=not-for-frontend\n',
  );
  assert.deepEqual(legacyFrontendEnv(root, {}, "production"), {
    BACKEND_API_URL: "http://127.0.0.1:49001/api/v1",
    NEXT_PUBLIC_SITE_URL: "http://localhost:39001",
  });
});
test("frontend/shell environment takes priority over the old root configuration", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, ".env.local"),
    "BACKEND_API_URL=http://localhost:4001/api/v1\nNEXT_PUBLIC_SITE_URL=http://localhost:3001",
  );
  const existing = {
    BACKEND_API_URL: "http://localhost:4002/api/v1",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3002",
  };
  assert.deepEqual(legacyFrontendEnv(root, existing, "development"), {});
  assert.equal(existing.BACKEND_API_URL, "http://localhost:4002/api/v1");
});
test("legacy mode-specific env precedence matches Next and test excludes generic local env", (t) => {
  const root = fixture(t);
  for (const [name, port] of [
    [".env.development.local", 4004],
    [".env.local", 4003],
    [".env.test", 4002],
    [".env", 4001],
  ])
    writeFileSync(
      join(root, name),
      `BACKEND_API_URL=http://localhost:${port}/api/v1`,
    );
  assert.equal(
    legacyFrontendEnv(root, {}, "development").BACKEND_API_URL,
    "http://localhost:4004/api/v1",
  );
  assert.equal(
    legacyFrontendEnv(root, {}, "production").BACKEND_API_URL,
    "http://localhost:4003/api/v1",
  );
  assert.equal(
    legacyFrontendEnv(root, {}, "test").BACKEND_API_URL,
    "http://localhost:4002/api/v1",
  );
});
test("a standalone frontend never reads an unrelated parent project's env", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "unrelated" }),
  );
  writeFileSync(
    join(root, ".env"),
    "BACKEND_API_URL=http://unrelated.invalid/api/v1",
  );
  assert.deepEqual(legacyFrontendEnv(root, {}, "production"), {});
});
