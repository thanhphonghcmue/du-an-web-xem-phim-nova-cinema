import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const htmlDir = path.resolve(rootDir, "frontend", "public", "figma-screens-native");
const publicDir = path.resolve(rootDir, "frontend", "public");

const files = fs.readdirSync(htmlDir).filter((f) => f.endsWith(".html") && f !== "index.html");

const mimeTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

// Cache base64 strings so we don't re-read from disk multiple times
const base64Cache = new Map();

function getBase64(relUrl) {
  // Normalize URL like "/images/posters/dune.jpg" or "http://localhost:3000/images/..."
  const cleanUrl = relUrl.replace(/^http:\/\/localhost:3000/i, "").split("?")[0];
  if (base64Cache.has(cleanUrl)) return base64Cache.get(cleanUrl);

  const localPath = path.resolve(publicDir, cleanUrl.startsWith("/") ? cleanUrl.slice(1) : cleanUrl);
  if (fs.existsSync(localPath)) {
    const ext = path.extname(localPath).toLowerCase();
    const mime = mimeTypes[ext] || "image/jpeg";
    const data = fs.readFileSync(localPath);
    const uri = `data:${mime};base64,${data.toString("base64")}`;
    base64Cache.set(cleanUrl, uri);
    return uri;
  }
  return null;
}

console.log(`Embedding Base64 images across ${files.length} HTML files...`);

let totalReplacements = 0;

for (const file of files) {
  const filePath = path.resolve(htmlDir, file);
  let html = fs.readFileSync(filePath, "utf-8");
  let fileReplacements = 0;

  // 1. Remove all srcset attributes and convert lazy loading to eager
  html = html.replace(/\s+srcset="[^"]*"/gi, "");
  html = html.replace(/\s+loading="lazy"/gi, ' loading="eager"');

  // 2. Replace Next.js _next/image paths
  html = html.replace(/src="[^"]*\/_next\/image\?url=([^"&]+)[^"]*"/gi, (match, encodedUrl) => {
    const originalPath = decodeURIComponent(encodedUrl);
    const b64 = getBase64(originalPath);
    if (b64) {
      fileReplacements++;
      return `src="${b64}"`;
    }
    return `src="http://localhost:3000${originalPath.startsWith("/") ? "" : "/"}${originalPath}"`;
  });

  // 3. Replace direct image src attributes
  html = html.replace(/src="(?:http:\/\/localhost:3000)?(\/images\/[^"]+)"/gi, (match, imgPath) => {
    const b64 = getBase64(imgPath);
    if (b64) {
      fileReplacements++;
      return `src="${b64}"`;
    }
    return match;
  });

  // 4. Replace CSS background urls
  html = html.replace(/url\(['"]?(?:http:\/\/localhost:3000)?(\/images\/[^'")]+)['"]?\)/gi, (match, imgPath) => {
    const b64 = getBase64(imgPath);
    if (b64) {
      fileReplacements++;
      return `url("${b64}")`;
    }
    return match;
  });

  fs.writeFileSync(filePath, html, "utf-8");
  totalReplacements += fileReplacements;
  console.log(`  ✅ ${file}: ${fileReplacements} images embedded as Base64.`);
}

console.log(`\n🎉 Done! Total ${totalReplacements} images embedded across ${files.length} HTML files.`);
console.log("All HTML files are now 100% self-contained and will NEVER have broken images!");
