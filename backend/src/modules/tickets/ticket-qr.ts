import { create } from "qrcode";
import { crc32, deflateSync } from "node:zlib";

const WIDTH = 320;
const QUIET_ZONE = 4;
const ROW_BYTES = WIDTH / 8;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type, "ascii");
  const header = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  header.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(data, crc32(name)));
  return Buffer.concat([header, name, data, checksum]);
}

// QR vẫn do thư viện qrcode mã hóa. PNG đen/trắng 1-bit tránh raster RGBA
// 4 byte/pixel và chỉ dựng mỗi hàng module một lần; vẫn giữ 320px/M/quiet zone4.
export function ticketQrPng(ticketHash: string): string {
  if (!/^[a-f0-9]{64}$/.test(ticketHash))
    throw new Error("Invalid opaque ticket identifier.");
  const { modules } = create(ticketHash, { errorCorrectionLevel: "M" });
  const scale = WIDTH / (modules.size + QUIET_ZONE * 2);
  const source = Array.from(
    { length: WIDTH },
    (_, pixel) => Math.floor(pixel / scale) - QUIET_ZONE,
  );
  const white = Buffer.alloc(ROW_BYTES, 255);
  const rows = Array.from({ length: modules.size }, (_, row) => {
    const pixels = Buffer.from(white);
    for (let x = 0; x < WIDTH; x++) {
      const column = source[x] ?? -QUIET_ZONE;
      if (
        column >= 0 &&
        column < modules.size &&
        modules.data[row * modules.size + column]
      )
        pixels[x >> 3] = (pixels[x >> 3] ?? 255) & ~(128 >> (x & 7));
    }
    return pixels;
  });
  const scanlines = Buffer.alloc((ROW_BYTES + 1) * WIDTH);
  for (let y = 0; y < WIDTH; y++)
    (rows[source[y] ?? -1] ?? white).copy(scanlines, y * (ROW_BYTES + 1) + 1);
  const imageHeader = Buffer.alloc(13);
  imageHeader.writeUInt32BE(WIDTH, 0);
  imageHeader.writeUInt32BE(WIDTH, 4);
  imageHeader[8] = 1; // Grayscale 1-bit: 0 = black, 1 = white; PNG filter0.
  const png = Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", imageHeader),
    chunk("IDAT", deflateSync(scanlines, { level: 1 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}
