import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dir = path.resolve(rootDir, "frontend", "public", "figma-screens-native");

const modalFiles = [
  "08_Trang_08_So_do_ghe_ban_dau.html",
  "09_Trang_09_Goi_y_ghe_thong_minh.html",
  "10_Trang_10_Giu_ghe_VIP_5_phut.html",
  "11_Trang_11_Loi_trung_ghe_409.html"
];

for (const file of modalFiles) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) continue;
  let html = fs.readFileSync(filePath, "utf-8");

  const premiereEnd = html.indexOf("</section>", html.indexOf('class="nova-premiere"'));
  const modalStart = html.indexOf('<div class="modal-backdrop"');

  if (premiereEnd !== -1 && modalStart !== -1 && modalStart > premiereEnd) {
    const before = html.substring(0, premiereEnd + 10);
    const after = html.substring(modalStart);
    const newHtml = before + "\n</main>\n" + after;
    fs.writeFileSync(filePath, newHtml, "utf-8");
    console.log(`✅ Cleaned ${file}: size reduced to ${(newHtml.length/1024/1024).toFixed(1)}MB`);
  } else if (modalStart !== -1 && modalStart < premiereEnd) {
    // If modal is before premiere, let's see
    console.log(`${file}: modal is before premiere`);
  }
}
