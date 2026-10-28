import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { menuPhotographs } from "../src/menuPhotography.js";
const catalog = JSON.parse(
  readFileSync(new URL("../content/cinema.json", import.meta.url)),
);
const sources = JSON.parse(
  readFileSync(
    new URL("../public/images/food-photography/sources.json", import.meta.url),
  ),
);
test("every live menu reference has existing local raster photographs with recorded sources", () => {
  assert.equal(catalog.menu.length, 24);
  const recorded = new Set(sources.map((s) => s.file));
  for (const item of catalog.menu) {
    const photos = menuPhotographs(item);
    assert.ok(photos.length > 0, item.name);
    for (const photo of photos) {
      assert.match(photo.src, /^\/images\/food-photography\//);
      assert.ok(recorded.has(photo.src.split("/").at(-1)), photo.src);
      const file = new URL("../public" + photo.src, import.meta.url);
      assert.ok(existsSync(file), item.name);
      const bytes = readFileSync(file);
      assert.ok(bytes.length > 1000);
      assert.ok(
        bytes[0] === 0xff ||
          bytes.toString("ascii", 1, 4) === "PNG" ||
          bytes.toString("ascii", 0, 4) === "RIFF",
        photo.src,
      );
    }
  }
});
test("administrator uploads survive while legacy illustrations never override reference photography", () => {
  const item = catalog.menu.find((i) => i.key === "party69");
  assert.ok(
    menuPhotographs({ ...item, imageUrl: "/images/menu/party69.svg" }).every(
      (p) => p.src.includes("/food-photography/"),
    ),
  );
  assert.equal(
    menuPhotographs({ ...item, imageUrl: "/uploads/real-custom-photo.jpg" })[0]
      .src,
    "/uploads/real-custom-photo.jpg",
  );
  assert.equal(
    menuPhotographs({
      ...item,
      imageUrl: "/images/menu/missing-admin-image.webp",
    })[0].src,
    "/images/menu/missing-admin-image.webp",
  );
  assert.equal(
    menuPhotographs({
      ...item,
      imageUrl: "/images/campaigns/real-admin-photo.jpg",
    })[0].src,
    "/images/campaigns/real-admin-photo.jpg",
  );
  assert.deepEqual(
    menuPhotographs({ name: "Unphotographed custom menu item" }),
    [],
  );
});
test("combo photograph labels preserve the displayed food quantities without fabricating packaging", () => {
  const quantities = (key) =>
    Object.fromEntries(
      menuPhotographs({ key }).map((p) => [p.key, p.quantity]),
    );
  assert.deepEqual(quantities("party69"), { bucket: 1, cola: 2 });
  assert.deepEqual(quantities("solo"), { bucket: 1, cola: 1 });
  assert.deepEqual(quantities("family"), { bucket: 2, cola: 4, hotdog: 2 });
  assert.deepEqual(quantities("berry-date"), { cheese: 2, berry: 2 });
});
