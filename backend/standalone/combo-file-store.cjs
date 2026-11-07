const {
  existsSync,
  readFileSync,
  mkdirSync,
  openSync,
  writeFileSync,
  fsyncSync,
  closeSync,
  renameSync,
  unlinkSync,
} = require("node:fs");
const { dirname } = require("node:path");
const { randomUUID } = require("node:crypto");
exports.comboFileStore = (path) => ({
  load() {
    if (!existsSync(path)) return null;
    const rows = JSON.parse(readFileSync(path, "utf8"));
    if (
      !Array.isArray(rows) ||
      rows.some(
        (row) =>
          !row ||
          typeof row.id !== "string" ||
          typeof row.name !== "string" ||
          !Number.isFinite(Number(row.price)) ||
          typeof row.isActive !== "boolean",
      ) ||
      new Set(rows.map((row) => row.id)).size !== rows.length
    )
      throw new Error("Kho combo không hợp lệ; giữ nguyên file để khôi phục.");
    return rows;
  },
  save(rows) {
    mkdirSync(dirname(path), { recursive: true });
    const temporary = path + "." + randomUUID() + ".tmp";
    try {
      const fd = openSync(temporary, "wx", 0o600);
      try {
        writeFileSync(fd, JSON.stringify(rows, null, 2));
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      renameSync(temporary, path);
    } finally {
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  },
});
