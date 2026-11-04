import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dir = path.resolve(rootDir, "frontend", "public", "figma-screens-native");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html") && f !== "index.html");

const targetStyle = `html, body {
      width: 1920px !important;
      min-width: 1920px !important;
      height: 1080px !important;
      max-height: 1080px !important;
      overflow: hidden !important;
      background: #0b0d17 !important;
      color: #ffffff !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    }`;

for (const f of files) {
  const p = path.join(dir, f);
  let html = fs.readFileSync(p, "utf-8");

  html = html.replace(/html,\s*body\s*\{[^}]*\}/i, targetStyle);
  fs.writeFileSync(p, html, "utf-8");
}

console.log(`Successfully locked viewport height to 1080px with overflow:hidden across all ${files.length} HTML files!`);
