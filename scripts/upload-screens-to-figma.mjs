import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const urls = [
  "https://mcp.figma.com/mcp/upload/c2bdaa15-d969-4aad-b9a0-a40d162d1a93/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/ee11bd86-0906-4ca5-9d96-3a24ff367f45/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/1f1cc322-5aaf-4c5c-8cc6-2c51f1c3ee7e/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/ebf97093-bd75-4fde-9b3b-2057a1dcdc8d/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/e8a7b7e9-914c-490b-aa4d-4624d7edf822/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/ec5a51e0-939e-4f54-aac1-84d46ac21aad/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/f2169bef-e7e9-4545-8923-78fae5b1f1a3/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/61edbd3d-68a2-41a0-8920-543daa2e5848/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/60c6df6b-1c93-469c-9ba7-4695adce3a8a/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/57402e1f-2149-40fb-bd35-1cc6964cc552/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/c5e84f86-f5a8-4443-ab64-ac33d9be2c56/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/4247b41c-a7f5-4b3f-9db9-5ead4ece5b20/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/06778508-4a91-4115-81fc-32af2a540793/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/47fedad0-56bd-4719-a3d4-53388e8a8a24/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/e966d5fb-2042-4a55-a578-63e046adee23/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/b48ed58e-9448-48c4-a2c8-8058ccf6445a/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/218ca4f5-6821-43fd-a59f-cf4a7260b5b9/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/42d9ecd7-9257-4c27-80a6-5768c7ee9f93/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/919d16e4-adaa-4da6-92b8-bc8bf0a3c3eb/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/d70b81be-9e2f-4d34-bed0-607066e93338/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/acf3ea97-7a88-4dae-b28a-8eaf6b1d82c9/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/6e19bc44-982a-4151-9de8-d1d3eb45317b/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/3a567826-abce-4d56-bb0c-f1ef377332a2/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/5c31ade8-2118-4a41-9857-228ea3d02497/submit?scaleMode=FILL",
  "https://mcp.figma.com/mcp/upload/967ceb1d-f4b0-4cc1-8182-cd7aeb149408/submit?scaleMode=FILL"
];

const files = [
  "01_trang_chu.png",
  "02_danh_muc_phim.png",
  "03_chi_tiet_phim.png",
  "04_phim_sap_chieu.png",
  "05_cum_rap_nova.png",
  "06_uu_dai_su_kien.png",
  "07_bap_nuoc_combo.png",
  "08_hoi_vien_cmember.png",
  "09_modal_dang_nhap.png",
  "10_modal_dang_ky.png",
  "11_dat_ve_chon_lich.png",
  "12_modal_chon_ghe.png",
  "13_modal_thanh_toan_giu_ghe.png",
  "14_cong_thanh_toan_sandbox.png",
  "15_ve_dien_tu_qr.png",
  "16_tai_khoan_ve_cua_toi.png",
  "17_ban_soat_ve_nhan_vien.png",
  "18_soat_ve_da_quet_thanh_cong.png",
  "19_quan_tri_admin_tong_quan.png",
  "20_quan_tri_rap_suat_chieu.png",
  "21_gioi_thieu_rap.png",
  "22_huong_dan_dat_ve.png",
  "23_chinh_sach_bao_mat.png",
  "24_thong_tin_thanh_toan.png",
  "25_lien_he_ho_tro.png"
];

const dir = resolve("public/figma-screens");

async function uploadOne(file, url, index) {
  const filePath = resolve(dir, file);
  const buffer = readFileSync(filePath);
  
  // Use FormData with 'file' field so Figma names the layer after the file!
  const formData = new FormData();
  const blob = new Blob([buffer], { type: "image/png" });
  formData.append("file", blob, file);

  console.log(`[${index + 1}/25] Đang đẩy ${file} lên Figma...`);
  const res = await fetch(url, {
    method: "POST",
    body: formData
  });

  if (res.ok) {
    const text = await res.text();
    console.log(`  ✓ Thành công: ${file}`);
    return { file, success: true, response: text };
  } else {
    console.error(`  ✗ Thất bại: ${file} (HTTP ${res.status}): ${await res.text()}`);
    return { file, success: false };
  }
}

async function main() {
  console.log("Bắt đầu tải 25 Frame giao diện vào Figma Canvas...");
  for (let i = 0; i < files.length; i++) {
    await uploadOne(files[i], urls[i], i);
  }
  console.log("\n🎉 HOÀN THÀNH TẤT CẢ 25 MÀN HÌNH ĐÃ ĐƯỢC ĐƯA VÀO FIGMA!");
}

main().catch(console.error);
