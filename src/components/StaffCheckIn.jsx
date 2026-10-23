/**
 * ==============================================================================
 * TỆP TIN: src/components/StaffCheckIn.jsx
 * CHÚ Ý: Tệp này đã được chuẩn hóa tên theo chức năng tiếng Việt:
 *   👉 Vui lòng xem và chỉnh sửa tại: src/components/SoatVeNhanVien.jsx
 * ==============================================================================
 */

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Keyboard,
  QrCode,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import Modal from "./Modal.jsx";
import { readCommand, read } from "../api/client.js";

export default function StaffCheckIn({ onClose, embedded = false }) {
  const [mode, setMode] = useState("camera"); // camera | manual
  const [hash, setHash] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [sampleTickets, setSampleTickets] = useState([]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);

  // Load sample tickets for quick 1-click test scanning
  useEffect(() => {
    read("/admin/reports/overview")
      .then((data) => {
        if (data?.recentBookings) {
          const paid = data.recentBookings.filter((b) => b.status === "PAID");
          setSampleTickets(paid.slice(0, 5));
        }
      })
      .catch(() => {});
  }, []);

  async function performCheckIn(targetHash) {
    if (!targetHash) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await readCommand("/staff/check-in", {
        ticketHash: targetHash.trim(),
      });
      setResult(res);
      stopCamera();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    await performCheckIn(hash);
  }

  async function startCamera() {
    setCameraError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Trình duyệt không hỗ trợ WebRTC Camera.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startScanLoop();
      }
    } catch (err) {
      setCameraError(
        err.message ||
          "Không thể truy cập camera. Vui lòng cấp quyền hoặc dùng nhập tay.",
      );
      setCameraActive(false);
    }
  }

  function stopCamera() {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  function startScanLoop() {
    if (!("BarcodeDetector" in window)) {
      // Browser doesn't have native BarcodeDetector; guide user or allow simulated click
      return;
    }
    try {
      // @ts-ignore
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      async function detect() {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            // Parse rawValue: can be direct 64-char hash or URL containing ticketHash
            let extracted = rawValue;
            if (rawValue.includes("hash=")) {
              extracted =
                new URL(rawValue).searchParams.get("hash") || rawValue;
            }
            if (/^[a-f0-9]{64}$/i.test(extracted)) {
              setHash(extracted);
              stopCamera();
              await performCheckIn(extracted);
              return;
            }
          }
        } catch {
          // ignore detection frame drops
        }
        scanLoopRef.current = requestAnimationFrame(detect);
      }
      scanLoopRef.current = requestAnimationFrame(detect);
    } catch {
      // fallback
    }
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function switchMode(newMode) {
    setMode(newMode);
    if (newMode === "camera") {
      void startCamera();
    } else {
      stopCamera();
    }
  }

  return (
    <Modal
      title="Soát vé tại rạp (Nhân viên)"
      onClose={onClose}
      embedded={embedded}
    >
      <div className="staff-mode-switch">
        <button
          type="button"
          className={`staff-mode-tab ${mode === "camera" ? "active" : ""}`}
          onClick={() => switchMode("camera")}
        >
          <Camera size={16} /> Quét Camera QR
        </button>
        <button
          type="button"
          className={`staff-mode-tab ${mode === "manual" ? "active" : ""}`}
          onClick={() => switchMode("manual")}
        >
          <Keyboard size={16} /> Nhập Mã Thủ Công
        </button>
      </div>

      {mode === "camera" && (
        <div className="camera-scanner-container">
          <div className="scanner-viewfinder">
            <video
              ref={videoRef}
              playsInline
              muted
              className="camera-video-stream"
            />
            <div className="scanner-reticle">
              <div className="reticle-corner top-left" />
              <div className="reticle-corner top-right" />
              <div className="reticle-corner bottom-left" />
              <div className="reticle-corner bottom-right" />
              <div className="laser-scanner-line" />
            </div>
            <div className="scanner-overlay-hint">
              {cameraActive
                ? "Hướng camera về phía mã QR vé của khách"
                : "Đang kích hoạt camera thiết bị…"}
            </div>
          </div>

          {cameraError && (
            <div className="scanner-error-message">
              <span>⚠️ {cameraError}</span>
              <button
                type="button"
                className="button button-outline button-small mt-2"
                onClick={() => setMode("manual")}
              >
                Chuyển sang nhập mã thủ công
              </button>
            </div>
          )}

          <div className="camera-controls-row">
            {cameraActive ? (
              <button
                type="button"
                className="button button-glass button-small"
                onClick={stopCamera}
              >
                <CameraOff size={14} /> Tắt camera
              </button>
            ) : (
              <button
                type="button"
                className="button button-primary button-small"
                onClick={startCamera}
              >
                <Camera size={14} /> Bật camera
              </button>
            )}
          </div>
        </div>
      )}

      {/* Manual Entry Form */}
      <form className="auth-form mt-3" onSubmit={submit}>
        <label htmlFor="ticket-hash">Mã đọc từ QR (SHA-256 Hash)</label>
        <div className="hash-input-wrap">
          <input
            id="ticket-hash"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            required
            pattern="[a-f0-9]{64}"
            autoComplete="off"
            placeholder="Dán hoặc nhập chuỗi 64 ký tự hash vé..."
          />
        </div>
        <button
          className="button button-primary"
          disabled={busy || !hash.trim()}
        >
          {busy ? "Đang xác thực…" : "Xác nhận soát vé"}
        </button>
      </form>

      {/* Sample Tickets for Instant Test Scanning */}
      {sampleTickets.length > 0 && (
        <div className="sample-tickets-helper">
          <div className="sample-tickets-header">
            <Sparkles size={14} />
            <small>
              Vé thực tế trong hệ thống (Thử nghiệm nhanh không cần camera):
            </small>
          </div>
          <div className="sample-tickets-list">
            {sampleTickets.map((t) => (
              <button
                key={t.id}
                type="button"
                className="sample-ticket-btn"
                onClick={() => {
                  setHash(t.id.replaceAll("-", "") + t.id.replaceAll("-", ""));
                  setMode("manual");
                }}
                title={`Đơn: ${t.orderCode} · ${t.movie}`}
              >
                <b>{t.orderCode}</b> ({t.customer} - {t.movie})
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="auth-notice mt-3">
          {error}
        </p>
      )}

      {result && (
        <div role="status" className="ticket-success checkin-success mt-3">
          <div className="success-icon-wrap">
            <CheckCircle2 size={32} />
          </div>
          <h3>Soát vé thành công!</h3>
          <p>
            Phim: <b>{result.movie}</b>
          </p>
          <p>
            Rạp: <b>{result.cinema}</b>
          </p>
          <p>
            Vị trí ghế: <b>{result.seats.map((s) => s.label).join(", ")}</b>
          </p>
          <p className="small muted">
            Thời gian soát: {new Date().toLocaleTimeString("vi-VN")}
          </p>
        </div>
      )}
    </Modal>
  );
}
