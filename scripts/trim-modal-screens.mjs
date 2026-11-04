import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dir = path.resolve(rootDir, "frontend", "public", "figma-screens-native");

function trimModalPage(fileName) {
  const filePath = path.join(dir, fileName);
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, "utf-8");

  const premiereEnd = html.indexOf("</section>", html.indexOf('class="nova-premiere"'));
  const modalStart = html.indexOf('<div class="modal-backdrop"');

  if (premiereEnd !== -1 && modalStart !== -1 && modalStart > premiereEnd) {
    // Cut out everything between premiereEnd and modalStart
    // Keep: up to </section>, then close main, then modal-backdrop to the end of body
    const before = html.substring(0, premiereEnd + 10);
    const after = html.substring(modalStart);
    
    // Check if we need to close </main>
    const newHtml = before + "\n</main>\n" + after;
    fs.writeFileSync(filePath, newHtml, "utf-8");
    console.log(`✅ Trimmed ${fileName}: size reduced from ${(html.length/1024/1024).toFixed(1)}MB to ${(newHtml.length/1024/1024).toFixed(1)}MB`);
  } else {
    console.warn(`Could not trim ${fileName} - premiereEnd: ${premiereEnd}, modalStart: ${modalStart}`);
  }
}

trimModalPage("02_Trang_02_Dang_nhap_CMEMBER.html");
trimModalPage("03_Trang_03_Dang_ky_CMEMBER.html");
