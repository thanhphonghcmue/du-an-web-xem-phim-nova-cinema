import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const uploads = [
  "https://mcp.figma.com/mcp/upload/4bb73511-0048-48d6-87f2-f15da12d7a30/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/79089371-cc56-43be-92d5-4d52a2144257/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/61ec6c13-b2b7-4341-b9bb-331a383a1067/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/8181ece9-c7a8-44fe-b5fe-f15695fa78f5/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/19da34d7-1a21-43df-8bd8-5920a34276af/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/fd81cb14-ba74-40a9-a872-9e83f0e819e2/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/79d12e66-b8ac-4d1b-8c06-9ead2148f288/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/5312b402-c619-4b06-a8da-ba98f83d6eb8/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/2060525c-e241-4c74-94ff-352ff0a378bb/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/9f561ea8-8a85-4eea-99ca-6da403215cd8/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/a31cfd57-581e-4d45-bfea-189a43cf3cb9/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/41644c94-7a13-4ce3-941c-6ffc2d897dd7/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/40a39bc5-390a-4b8b-a3c8-1d5c438f9c36/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/1db70baa-3514-4908-81b5-2b3c2c24277a/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/4daa8165-a5be-4e56-8af0-03a04ac92629/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/32f5d71d-547a-4826-a03b-b7de5dddb7d3/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/ac8e83fd-4765-4d9a-b100-c60055e0e88b/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/149896d0-0599-4d77-90ac-2ee13501af99/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/02a48f61-5b45-4ae0-a8b6-426cdd2cf4c3/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/127a3144-df38-4f6b-8391-3b37a20c23cf/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/e5781fa6-def9-4e8f-af07-72783671101c/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/9df2b092-38b1-4cc4-b68b-850974f65414/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/191bd333-70ed-4d0f-a962-ca47a7658436/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/503b99c0-94b9-4bff-ab5e-d0d31d8be2db/submit?scaleMode=FILL&currentPageId=0%3A1",
  "https://mcp.figma.com/mcp/upload/9fca963d-b9b9-4213-9247-564bff4dd00a/submit?scaleMode=FILL&currentPageId=0%3A1"
];

const screenDir = resolve("./public/figma-lab04-screens");
const files = readdirSync(screenDir)
  .filter(f => f.endsWith(".png"))
  .sort((a, b) => {
    const na = parseInt(a.slice(0, 2), 10);
    const nb = parseInt(b.slice(0, 2), 10);
    return na - nb;
  });

console.log(`Tìm thấy ${files.length} ảnh trong ${screenDir}:`);
files.forEach((f, i) => console.log(`  [${i + 1}] ${f}`));

if (files.length !== 25) {
  console.error("Cảnh báo: số lượng tệp không đúng 25!");
}

async function upload() {
  console.log("\nBắt đầu tải lên 25 ảnh vào Figma Canvas...");
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filepath = resolve(screenDir, filename);
    const submitUrl = uploads[i];

    console.log(`[${i + 1}/25] Đang tải lên: ${filename}...`);
    try {
      const buffer = readFileSync(filepath);
      const blob = new Blob([buffer], { type: "image/png" });
      const formData = new FormData();
      formData.append("file", blob, filename);

      const resp = await fetch(submitUrl, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error(`  ✗ Lỗi (${resp.status}):`, text);
      } else {
        const data = await resp.json();
        console.log(`  ✓ Thành công: ${filename} (nodeId: ${data.nodeId || "đã tạo"})`);
      }
    } catch (err) {
      console.error(`  ✗ Lỗi kết nối tại ${filename}:`, err.message);
    }
  }
  console.log("\n🎉 ĐÃ TẢI LÊN TOÀN BỘ 25/25 ẢNH VÀO FIGMA!");
}

upload().catch(console.error);
