import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const { createDemoData } = require("../backend/standalone-server.cjs");
const { createMemoryServer } = require("../backend/standalone/runtime.cjs");
const {
  comboFileStore,
} = require("../backend/standalone/combo-file-store.cjs");
process.env.NOVA_LOG_REQUESTS = "false";
async function app(store) {
  const data = createDemoData(),
    server = createMemoryServer({ ...data, comboStore: store });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const account = data.accounts.find((a) => a.role === "ADMIN");
  const call = async (path, body, token, method = "POST") => {
    const res = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: res.status, body: await res.json() };
  };
  const login = await call("/auth/login", {
    email: account.email,
    password: account.password,
  });
  assert.equal(login.status, 200);
  return {
    data,
    call,
    token: login.body.data.accessToken,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
test("actual RAM movie seed supports status-only PATCH; combo CRUD survives process restart without resurrecting deletions", async () => {
  const dir = mkdtempSync(join(tmpdir(), "nova-combo-store-")),
    store = comboFileStore(join(dir, "combos.json"));
  let f;
  try {
    f = await app(store);
    const film = f.data.movies[0];
    assert.ok(film.description);
    assert.equal(
      (
        await f.call(
          `/movies/${film.id}`,
          { status: "COMING_SOON" },
          f.token,
          "PATCH",
        )
      ).status,
      200,
    );
    const created = await f.call(
      "/admin/combos",
      {
        name: "Owned persistent combo",
        description: "Test",
        price: "49000",
        tasteTag: "CARAMEL",
        itemsSummary: "1 bắp",
        badgeLabel: "SOLO",
        suggestedMinSeats: 1,
        suggestedMaxSeats: 1,
      },
      f.token,
    );
    assert.equal(created.status, 201);
    const id = created.body.data.id;
    assert.equal(
      (
        await f.call(
          `/admin/combos/${id}/status`,
          { isActive: false },
          f.token,
          "PATCH",
        )
      ).status,
      200,
    );
    await f.close();
    f = await app(store);
    const all = await f.call(
      "/admin/combos?limit=100",
      undefined,
      f.token,
      "GET",
    );
    assert.equal(all.body.data.items.find((c) => c.id === id).isActive, false);
    assert.ok(Array.isArray(all.body.combos));
    assert.equal(
      (await f.call(`/admin/combos/${id}`, undefined, f.token, "DELETE"))
        .status,
      200,
    );
    await f.close();
    f = await app(store);
    assert.ok(
      !(
        await f.call("/admin/combos?limit=100", undefined, f.token, "GET")
      ).body.data.items.some((c) => c.id === id),
    );
  } finally {
    if (f) await f.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("disk write rejection returns503 and rolls back the RAM combo state", async () => {
  let snapshot = null,
    fail = false;
  const store = {
    load: () => snapshot,
    save: (rows) => {
      if (fail) throw new Error("Owned disk fault");
      snapshot = structuredClone(rows);
    },
  };
  const f = await app(store);
  try {
    const old = snapshot[0];
    fail = true;
    const res = await f.call(
      `/admin/combos/${old.id}/status`,
      { isActive: !old.isActive },
      f.token,
      "PATCH",
    );
    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    const all = await f.call(
      "/admin/combos?limit=100",
      undefined,
      f.token,
      "GET",
    );
    assert.equal(
      all.body.data.items.find((c) => c.id === old.id).isActive,
      old.isActive,
    );
  } finally {
    await f.close();
  }
});
