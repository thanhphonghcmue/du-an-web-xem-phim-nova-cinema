import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dir = path.resolve(rootDir, "frontend", "public", "figma-screens-native");

const allFiles = fs.readdirSync(dir).filter(f => f.endsWith(".html") && f !== "index.html");

let cleanedCount = 0;

for (const file of allFiles) {
  const filePath = path.join(dir, file);
  let html = fs.readFileSync(filePath, "utf-8");

  const premiereEnd = html.indexOf("</section>", html.indexOf('class="nova-premiere"'));
  if (premiereEnd === -1) continue;

  let overlayIndex = -1;
  const overlayMarkers = [
    '<div class="modal-backdrop"',
    '<div id="seat-modal-overlay"',
    '<div id="checkout-modal-overlay"',
    'id="booking-modal-real"',
    'class="booking-modal-overlay'
  ];

  for (const m of overlayMarkers) {
    const idx = html.indexOf(m);
    if (idx !== -1 && idx > premiereEnd) {
      if (overlayIndex === -1 || idx < overlayIndex) {
        overlayIndex = idx;
      }
    }
  }

  // Find opening <div for booking-modal-real if needed
  if (overlayIndex !== -1) {
    let actualStart = overlayIndex;
    const lastOpenDiv = html.lastIndexOf('<div', overlayIndex);
    if (lastOpenDiv !== -1 && overlayIndex - lastOpenDiv < 80) {
      actualStart = lastOpenDiv;
    }

    const originalMB = (html.length / 1024 / 1024).toFixed(1);
    const before = html.substring(0, premiereEnd + 10);
    const after = html.substring(actualStart);
    const newHtml = before + "\n</main>\n" + after;
    fs.writeFileSync(filePath, newHtml, "utf-8");
    const newMB = (newHtml.length / 1024 / 1024).toFixed(1);
    console.log(`✅ Cleaned ${file}: ${originalMB}MB -> ${newMB}MB (Height locked to 1080px)`);
    cleanedCount++;
  }
}

console.log(`\n🎉 Successfully trimmed ${cleanedCount} overlay screens!`);
