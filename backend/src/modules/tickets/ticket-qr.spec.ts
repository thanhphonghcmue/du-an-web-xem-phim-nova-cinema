import { PNG } from "pngjs";
import jsQR from "jsqr";
import { ticketQrPng } from "./ticket-qr";

describe("ticket QR PNG", () => {
  it.each(["0".repeat(64), "f".repeat(64), "0123456789abcdef".repeat(4)])(
    "decodes a grayscale PNG320 to its original opaque identifier",
    (hash) => {
      const url = ticketQrPng(hash);
      expect(url.startsWith("data:image/png;base64,")).toBe(true);
      const bytes = Buffer.from(
        url.slice("data:image/png;base64,".length),
        "base64",
      );
      const png = PNG.sync.read(bytes, { checkCRC: true });
      expect(png.width).toBe(320);
      expect(png.height).toBe(320);
      expect(
        jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
      ).toBe(hash);
      // Quiet zone ngoài cùng luôn trắng, không alpha và không cắt finder pattern.
      for (let x = 0; x < png.width; x++) {
        expect([...png.data.subarray(x * 4, x * 4 + 4)]).toEqual([
          255, 255, 255, 255,
        ]);
        const bottom = ((png.height - 1) * png.width + x) * 4;
        expect([...png.data.subarray(bottom, bottom + 4)]).toEqual([
          255, 255, 255, 255,
        ]);
      }
      expect(bytes.length).toBeLessThan(4096);
    },
  );

  it("rejects identifiers outside the bounded opaque64hex contract", () => {
    for (const hash of ["", "abc", "F".repeat(64), "g".repeat(64)])
      expect(() => ticketQrPng(hash)).toThrow(
        "Invalid opaque ticket identifier.",
      );
  });
});
