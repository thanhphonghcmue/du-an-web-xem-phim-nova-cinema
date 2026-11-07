"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import input from "../../../shared/ticket-input.cjs";
const { extractNormalizedCode } = input;
export default function QrCapture({ onCode, disabled = false, demo = false }) {
  const video = useRef(null),
    stream = useRef(null),
    frame = useRef(null),
    epoch = useRef(0),
    callback = useRef(onCode),
    blocked = useRef(disabled);
  const [hint, setHint] = useState(
    "Chế độ mô phỏng máy quét · Nhập mã, dán chuỗi QR hoặc chọn ảnh.",
  );
  const [camera, setCamera] = useState(false);
  useEffect(() => {
    callback.current = onCode;
  }, [onCode]);
  useEffect(() => {
    blocked.current = disabled;
    if (disabled) stop();
  }, [disabled]);
  function stop() {
    epoch.current++;
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }
  useEffect(() => () => stop(), []);
  function decoded(source) {
    const canvas = document.createElement("canvas");
    const width = source.videoWidth || source.width,
      height = source.videoHeight || source.height;
    const scale = Math.min(1, 1200 / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !width || !height) return null;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(pixels.data, pixels.width, pixels.height)?.data;
  }
  async function start() {
    stop();
    const version = epoch.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("virtual");
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (version !== epoch.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      video.current.srcObject = media;
      await video.current.play();
      if (version !== epoch.current || blocked.current) return;
      setCamera(true);
      setHint("Hướng camera vào mã QR.");
      const scan = () => {
        if (version !== epoch.current || blocked.current) return;
        let code;
        try {
          code = decoded(video.current);
        } catch {
          /* Chờ khung hình tiếp theo. */
        }
        if (code) {
          stop();
          setCamera(false);
          callback.current(extractNormalizedCode(code));
        } else frame.current = requestAnimationFrame(scan);
      };
      frame.current = requestAnimationFrame(scan);
    } catch {
      if (version !== epoch.current) return;
      stop();
      setCamera(false);
      setHint(
        "Chế độ mô phỏng máy quét · Camera chưa sẵn sàng. Hãy chọn ảnh QR, dán mã hoặc dùng nút thử bên dưới.",
      );
    }
  }
  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || blocked.current) return;
    stop();
    setCamera(false);
    const version = epoch.current;
    let bitmap;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Ảnh tối đa 10MB.");
      bitmap = await createImageBitmap(file);
      // Chỉ lượt quét mới nhất được cập nhật UI; luôn đóng bitmap trong finally.
      if (version !== epoch.current || blocked.current) return;
      const code = decoded(bitmap);
      if (!code)
        throw new Error(
          "Chưa đọc được QR trong ảnh. Hãy chọn ảnh rõ hơn hoặc dán chuỗi QR.",
        );
      callback.current(extractNormalizedCode(code));
      setHint("Đã đọc nội dung QR từ ảnh.");
    } catch (error) {
      if (version !== epoch.current || blocked.current) return;
      setHint(
        error.message || "Chưa đọc được ảnh. Bạn có thể nhập hoặc dán mã.",
      );
    } finally {
      bitmap?.close();
    }
  }
  return (
    <section className="qr-capture" aria-label="Quét QR vé">
      <div className="scanner-viewfinder">
        <video
          ref={video}
          playsInline
          muted
          className="camera-video-stream"
          hidden={!camera}
        />
        <div className="scanner-reticle">
          <div className="laser-scanner-line" />
        </div>
        <p className="scanner-overlay-hint">{hint}</p>
      </div>
      <div className="cinema-state-actions">
        <button
          type="button"
          className="button button-glass"
          disabled={disabled}
          onClick={
            camera
              ? () => {
                  stop();
                  setCamera(false);
                }
              : start
          }
        >
          {camera ? "Tắt camera" : "📷 Quét QR vé"}
        </button>
        <label className="button button-glass">
          📷 Chọn ảnh QR / Quét từ file
          <input
            aria-label="Chọn ảnh mã QR"
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={upload}
          />
        </label>
      </div>
      {demo && (
        <div className="cinema-state-actions">
          {[
            ["Vé Hợp Lệ (V1 / 8F9A)", "V1"],
            ["Vé Đã Dùng (Lần 2)", "V2"],
            ["Vé Sai Suất (21:45)", "V3"],
            ["Giả / Không tồn tại (QR_INVALID_999)", "QR_INVALID_999"],
          ].map(([label, code]) => (
            <button
              key={code}
              type="button"
              disabled={disabled}
              className="button button-glass"
              onClick={() => onCode(code)}
            >
              📷 Quét QR {label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
