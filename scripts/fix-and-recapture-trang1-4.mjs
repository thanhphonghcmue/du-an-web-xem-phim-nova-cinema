import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outDir = path.resolve(rootDir, "frontend", "public", "figma-screens-native");
const auditDir = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\677ae184-2c2d-4f4e-ac8f-476c05d8b855\\audit-screens";

// Load CSS bundle
const cssFiles = [
  "styles.css",
  "cinema.css",
  "premiere.css",
  "cyber-cinema.css",
  "booking-experience.css",
  "experience-details.css",
  "food-studio.css",
  "server-experience.css",
  "clarity.css",
  "qa-readability.css",
];
let bundledCSS = "";
for (const file of cssFiles) {
  const p = path.resolve(rootDir, "frontend", "src", file);
  if (fs.existsSync(p)) {
    bundledCSS += `\n/* --- ${file} --- */\n` + fs.readFileSync(p, "utf-8");
  }
}

function prepareFigmaHTML(rawHtml, pageTitle) {
  let html = rawHtml;
  if (html.includes("<title>")) {
    html = html.replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`);
  } else {
    html = html.replace("<head>", `<head><title>${pageTitle}</title>`);
  }

  const styleTag = `
  <style id="nova-embedded-styles">
    ${bundledCSS}
    html, body {
      width: 1440px !important;
      min-width: 1440px !important;
      background: #0b0d17 !important;
      color: #ffffff !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      overflow-x: hidden !important;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
  </style>
  `;
  html = html.replace("</head>", `${styleTag}</head>`);

  // Fix Next.js image optimizer URLs back to original static assets
  html = html.replace(/src="[^"]*\/_next\/image\?url=([^"&]+)[^"]*"/gi, (match, encodedUrl) => {
    const originalPath = decodeURIComponent(encodedUrl);
    return `src="http://localhost:3000${originalPath.startsWith('/') ? '' : '/'}${originalPath}"`;
  });
  html = html.replace(/\s+srcset="[^"]*"/gi, "");
  html = html.replaceAll('src="/images/', 'src="http://localhost:3000/images/');
  html = html.replaceAll("url(/images/", "url(http://localhost:3000/images/");
  html = html.replaceAll("url('/images/", "url('http://localhost:3000/images/");
  html = html.replaceAll('url("/images/', 'url("http://localhost:3000/images/');

  // Remove rehydration scripts
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  return html;
}

async function run() {
  console.log("Starting targeted capture and fix for Trang 01 & Trang 04...");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    sessionStorage.setItem("nova-welcome-seen", "1");
  });

  async function loginAs(email, password = "nova@12345") {
    console.log(`  Logging in as ${email}...`);
    const resp = await context.request.post("http://localhost:3000/api/v1/auth/login", {
      data: { email, password },
    });
    const data = await resp.json();
    const token = data.accessToken || data.token || data?.data?.accessToken;
    const user = data.user || data?.data?.user;

    await page.addInitScript(({ token, user }) => {
      if (token) {
        localStorage.setItem("nova_auth_token", token);
        localStorage.setItem("nova_access_token", token);
      }
      if (user) {
        localStorage.setItem("nova_auth_user", JSON.stringify(user));
        localStorage.setItem("nova-member", JSON.stringify(user));
      }
    }, { token, user });
  }

  async function saveScreen(fileName, title) {
    console.log(`\n📸 CAPTURING: ${fileName} - "${title}"`);
    // Wait for hero images to load
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.querySelectorAll(".nova-premiere img")).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 2000);
          });
        })
      );
    });

    await page.waitForTimeout(1500);

    // Save PNG
    const localPng = path.resolve(outDir, `${fileName}.png`);
    const auditPng = path.resolve(auditDir, `${fileName}.png`);
    await page.screenshot({ path: localPng, fullPage: false });
    fs.copyFileSync(localPng, auditPng);

    // Save HTML
    const rawHtml = await page.evaluate(() => document.documentElement.outerHTML);
    const finalizedHtml = prepareFigmaHTML(rawHtml, title);
    fs.writeFileSync(path.resolve(outDir, `${fileName}.html`), finalizedHtml, "utf-8");
    console.log(`  ✅ Successfully saved ${fileName}.html and ${fileName}.png to both directories.`);
  }

  // --- TRANG 01: Trang chu NOVA Cinema (Khach vang lai) ---
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".nova-premiere", { timeout: 15000 });
  await page.waitForTimeout(2000);
  await saveScreen(
    "01_Trang_01_Trang_chu_NOVA_Cinema",
    "Trang 01 - Trang chu NOVA Cinema (Khach vang lai)"
  );

  // --- TRANG 04: Trang chu Da dang nhap (Hoi vien C'MEMBER) ---
  await loginAs("customer@nova.local", "nova@12345");
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".nova-premiere", { timeout: 15000 });
  await page.waitForTimeout(2000);
  await saveScreen(
    "04_Trang_04_Trang_chu_Da_dang_nhap",
    "Trang 04 - Trang chu NOVA Cinema sau khi Dang nhap (Hoi vien C'MEMBER)"
  );

  await browser.close();

  // Also clean up all other 23 HTML files to strip any stray srcset and fix relative _next/image paths
  console.log("\n🧹 Scanning and sanitizing all HTML files in figma-screens-native...");
  const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".html"));
  let sanitizedCount = 0;
  for (const f of files) {
    const fullPath = path.resolve(outDir, f);
    let html = fs.readFileSync(fullPath, "utf-8");
    const originalLen = html.length;

    html = html.replace(/src="[^"]*\/_next\/image\?url=([^"&]+)[^"]*"/gi, (match, encodedUrl) => {
      const originalPath = decodeURIComponent(encodedUrl);
      return `src="http://localhost:3000${originalPath.startsWith('/') ? '' : '/'}${originalPath}"`;
    });
    html = html.replace(/\s+srcset="[^"]*"/gi, "");
    html = html.replaceAll('src="/images/', 'src="http://localhost:3000/images/');
    html = html.replaceAll("url(/images/", "url(http://localhost:3000/images/");
    html = html.replaceAll("url('/images/", "url('http://localhost:3000/images/");
    html = html.replaceAll('url("/images/', 'url("http://localhost:3000/images/');

    if (html.length !== originalLen || html.includes("http://localhost:3000/images/")) {
      fs.writeFileSync(fullPath, html, "utf-8");
      sanitizedCount++;
    }
  }
  console.log(`✅ Sanitized ${sanitizedCount} HTML files! All image sources are direct and clean.`);
  console.log("\n🎉 ALL TASKS COMPLETE!");
}

run().catch((err) => {
  console.error("Error during run:", err);
  process.exit(1);
});
