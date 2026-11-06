// SoatVeNhanVien: mã nguồn chức năng soát vé thông minh (Smart Camera QR & Manual Entry).
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { uniqueRecords } from "@/uniqueRecords.js";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  ClipboardCheck,
  Keyboard,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  X,
  Ticket,
  Film,
  MapPin,
  Clock,
  Calendar,
} from "lucide-react";
import QrCapture from "./QrCapture.jsx";
import ticketInput from "../../../shared/ticket-input.cjs";
import Modal from "./Modal.jsx";
import { createPortal } from "react-dom";
import AdmissionStatus from "./AdmissionStatus.jsx";
import { apiGetShowtimes, read, readCommand } from "@/api/client.js";
import { useCatalog, dayKey } from "@/catalog.js";
import jsQR from "jsqr";
import { admissionTicket } from "@/admission.js";

const extractCode = ticketInput.extractNormalizedCode;
const vietnamDate = (value = new Date()) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

const screeningTime = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
});

const labels = {
  TICKET_NOT_FOUND: "Mã vé không tồn tại hoặc không hợp lệ!",
  TICKET_SHOWTIME_MISMATCH:
    "Vé không khớp với suất chiếu đang kiểm tra. Hãy đối chiếu lại phòng và giờ trên vé.",
  TICKET_ALREADY_USED:
    "Vé này đã được sử dụng. Không thể xác nhận lần thứ hai.",
  CHECK_IN_OUTSIDE_WINDOW:
    "Chưa đến hoặc đã quá thời gian được phép vào rạp của vé này (cho phép vào trước 60 phút đến sau 30 phút).",
  TICKET_BOOKING_NOT_PAID:
    "Đơn chưa đủ điều kiện vào rạp. Cần xác nhận thanh toán và trạng thái ghế.",
};

function playSuccessBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
    const closeAudio = () => void ctx.close().catch(() => {});
    const fallback = setTimeout(closeAudio, 500);
    osc.onended = () => {
      clearTimeout(fallback);
      closeAudio();
    };
  } catch {
    // Audio autoplay might be restricted by browser policy
  }
}

export default function SoatVeNhanVien({ onClose, embedded = false }) {
  const { cinemas, rooms, movies, showtimes: catalogShowtimes } = useCatalog();
  const [mode, setMode] = useState("manual");
  const [demo, setDemo] = useState(false);
  const [guidance, setGuidance] = useState("");
  const [cinemaId, setCinemaId] = useState("");
  const [day, setDay] = useState(vietnamDate);
  const [showtimeId, setShowtimeId] = useState("");
  const [hash, setHash] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scannedEffect, setScannedEffect] = useState(false);

  const videoRef = useRef(null),
    streamRef = useRef(null),
    loopRef = useRef(null),
    inFlight = useRef(false),
    cameraEpoch = useRef(0);

  useEffect(() => {
    let active = true;
    read("/staff/demo-fixtures")
      .then((data) => {
        if (active) {
          setDemo(data.enabled === true);
          if (data.showtimeId)
            setShowtimeId((current) => current || data.showtimeId);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const [schedule, setSchedule] = useState({
    items: [],
    day: "",
    cinemaId: "",
    error: "",
  });

  // Tận dụng dữ liệu suất chiếu từ CatalogContext ngay lập tức khi API ngày đang tải
  const fallbackScreenings = useMemo(() => {
    if (!catalogShowtimes?.length) return [];
    return catalogShowtimes.filter((show) => {
      const showDay = dayKey(show.startTime);
      if (showDay !== day) return false;
      if (!cinemaId) return true;
      const room = rooms.find((r) => r.id === show.roomId);
      return room?.cinemaId === cinemaId;
    });
  }, [catalogShowtimes, day, cinemaId, rooms]);

  const scheduleReady =
    schedule.day === day && schedule.cinemaId === cinemaId && !schedule.error;

  const screenings = useMemo(() => {
    const list =
      scheduleReady && schedule.items?.length
        ? schedule.items
        : fallbackScreenings;
    return uniqueRecords(list);
  }, [scheduleReady, schedule.items, fallbackScreenings]);

  const screeningOptions = useMemo(() => {
    const titles = new Map(
      movies.map((movie) => [
        movie.id,
        movie.title || movie.short || movie.original,
      ]),
    );
    const roomNames = new Map(rooms.map((room) => [room.id, room.name]));
    return screenings.map((show, index) => {
      const start = new Date(show.startTime);
      return (
        <option value={show.id} key={`${show.id}-${index}`}>
          {Number.isFinite(start.getTime())
            ? screeningTime.format(start)
            : "Chưa xác định giờ"}{" "}
          · {titles.get(show.movieId) || "Phim đang chiếu"} ·{" "}
          {roomNames.get(show.roomId) || "Phòng chiếu"}
        </option>
      );
    });
  }, [screenings, movies, rooms]);

  useEffect(() => {
    let active = true;
    let running = false;
    async function load() {
      if (running) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        if (active)
          setSchedule({
            items: [],
            day,
            cinemaId,
            error: "Hãy chọn ngày hợp lệ để tải suất chiếu.",
          });
        return;
      }
      running = true;
      try {
        const items = await apiGetShowtimes({
          date: day,
          ...(cinemaId ? { cinemaId } : {}),
        });
        if (active) setSchedule({ items, day, cinemaId, error: "" });
      } catch (err) {
        if (active)
          setSchedule({ items: [], day, cinemaId, error: err.message });
      } finally {
        running = false;
      }
    }
    void Promise.resolve().then(load);
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [day, cinemaId]);

  function clearResult() {
    setGuidance("");
    setPreview(null);
    setResult(null);
    setError(null);
  }

  const stopCamera = useCallback(() => {
    cameraEpoch.current++;
    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const report = useCallback((err, input = "") => {
    setGuidance("");
    setError({
      input,
      status: err.status,
      details: err.details,
      code: err.code,
      message: labels[err.code] || err.message,
      at: err.details?.checkedInAt,
      actualShowtimeId: err.details?.actualShowtimeId,
    });
  }, []);

  const verify = useCallback(
    async (targetInput) => {
      if (inFlight.current) return;
      const target = extractCode(targetInput);
      if (!target) {
        setError({
          message: "Vui lòng nhập hoặc quét mã vé (mã QR hoặc mã vé 8 ký tự).",
        });
        return;
      }
      inFlight.current = true;
      setBusy(true);
      clearResult();
      stopCamera();

      try {
        let currentShowtimeId = showtimeId;
        // Nếu nhân viên chưa chọn suất chiếu, tự động gợi ý suất đang diễn ra hoặc suất đầu tiên
        if (!currentShowtimeId && screenings.length > 0) {
          const nowStamp = Date.now();
          const activeShow =
            screenings.find((s) => {
              const t = new Date(s.startTime).getTime();
              return nowStamp >= t - 3600000 && nowStamp <= t + 1800000;
            }) || screenings[0];
          currentShowtimeId = activeShow?.id;
        }

        // UC14: giữ nguyên suất nhân viên đang soát; không tự chuyển sang suất khác.
        setShowtimeId(currentShowtimeId);
        const ticket = admissionTicket(
          await readCommand(
            currentShowtimeId ? "/staff/verify" : "/staff/verify-ticket",
            {
              ...(currentShowtimeId
                ? { ticketHash: target }
                : { code: target }),
              ...(currentShowtimeId ? { showtimeId: currentShowtimeId } : {}),
            },
          ),
        );
        setShowtimeId(currentShowtimeId);
        setPreview({ ticket, hash: target, showtimeId: currentShowtimeId });
      } catch (err) {
        report(err, target);
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [showtimeId, screenings, stopCamera, report],
  );

  async function admit() {
    if (inFlight.current) return;
    if (!preview) {
      setError({ message: "Hãy kiểm tra vé trước khi xác nhận soát vé." });
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const ticket = admissionTicket(
        await readCommand("/staff/check-in", {
          ticketHash: preview.hash,
          showtimeId: preview.showtimeId,
        }),
      );
      setResult(ticket);
      setPreview(null);
      playSuccessBeep();
    } catch (err) {
      setPreview(null);
      report(err);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const verifyRef = useRef(null);
  useEffect(() => {
    verifyRef.current = verify;
  }, [verify]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError(
        "Trình duyệt hoặc thiết bị chưa cấp quyền truy cập Camera. Bạn có thể dùng mục Nhập mã.",
      );
      return;
    }
    stopCamera();
    const epoch = ++cameraEpoch.current;
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      if (epoch !== cameraEpoch.current || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (epoch !== cameraEpoch.current) return;
      setCameraActive(true);

      const detector =
        typeof window !== "undefined" && window.BarcodeDetector
          ? new window.BarcodeDetector({ formats: ["qr_code"] })
          : null;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      let lastCheck = 0;

      async function detect(timestamp) {
        if (
          epoch !== cameraEpoch.current ||
          !streamRef.current ||
          !videoRef.current
        )
          return;
        const video = videoRef.current;
        if (video && video.readyState >= 2 && timestamp - lastCheck >= 100) {
          lastCheck = timestamp;
          let rawData = "";

          // 1. Dùng BarcodeDetector native nếu trình duyệt hỗ trợ
          if (detector) {
            try {
              const codes = await detector.detect(video);
              if (codes?.length && codes[0]?.rawValue) {
                rawData = codes[0].rawValue;
              }
            } catch {
              /* Có thể thiếu quyền camera/clipboard; giữ đường nhập mã thủ công. */
            }
          }

          // 2. Dùng jsQR đọc qua canvas (hỗ trợ 100% mọi trình duyệt Chrome, Edge, Safari, Firefox, điện thoại)
          if (!rawData && video.videoWidth > 0 && video.videoHeight > 0) {
            try {
              canvas.width = Math.min(video.videoWidth, 640);
              canvas.height = Math.min(video.videoHeight, 480);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              );
              const qr = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: "dontInvert",
              });
              if (qr?.data) {
                rawData = qr.data;
              }
            } catch {
              /* Có thể thiếu quyền camera/clipboard; giữ đường nhập mã thủ công. */
            }
          }

          if (epoch !== cameraEpoch.current || !streamRef.current) return;
          if (rawData) {
            const clean = extractCode(rawData);
            if (clean) {
              setScannedEffect(true);
              playSuccessBeep();
              stopCamera();
              setHash(clean);
              setTimeout(() => setScannedEffect(false), 800);
              void verifyRef.current?.(clean);
              return;
            }
          }
        }
        if (epoch === cameraEpoch.current)
          loopRef.current = requestAnimationFrame(detect);
      }
      loopRef.current = requestAnimationFrame(detect);
    } catch (err) {
      stopCamera();
      setCameraError(
        err.name === "NotAllowedError"
          ? "Chế độ mô phỏng: camera chưa được cấp quyền. Hãy chọn ảnh QR hoặc nhập mã ở bên dưới."
          : err.message || "Không thể khởi động Camera thiết bị.",
      );
    }
  }, [stopCamera]);

  useEffect(() => {
    if (mode !== "camera") return;
    const frame = requestAnimationFrame(() => void startCamera());
    return () => {
      cancelAnimationFrame(frame);
      stopCamera();
    };
  }, [mode, startCamera, stopCamera]);

  const pasteFromClipboard = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        const clean = extractCode(text);
        if (clean) {
          setHash(clean);
          clearResult();
          void verify(clean);
        }
      }
    } catch {
      /* Có thể thiếu quyền camera/clipboard; giữ đường nhập mã thủ công. */
    }
  };

  const ticket = result || preview?.ticket;
  function repeatTicket() {
    void verify(hash);
  }
  function nextTicket() {
    setHash("");
    clearResult();
    if (mode === "camera") void startCamera();
    else document.getElementById("ticket-hash")?.focus();
  }
  const alertRef = useRef(null);
  useEffect(() => {
    if (!error && !ticket) return;
    // Portal đặt kết quả trước banner; đợi layout rồi đưa thẻ vào vùng nhìn thấy.
    const frame = requestAnimationFrame(() => {
      alertRef.current?.focus({ preventScroll: true });
      alertRef.current?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [error, ticket]);

  return (
    <Modal
      title="Soát vé tại rạp (Nhân viên)"
      onClose={onClose}
      embedded={embedded}
    >
      <div className="admission-intro">
        <ShieldCheck size={28} className="text-emerald-400" />
        <div>
          <p className="nova-kicker">NOVA ADMISSION DESK</p>
          <h3>Đúng suất. Đúng vé. Một lần vào rạp.</h3>
          <p>
            Kiểm tra thông tin trước, xác nhận cho vào rạp sau. Tự động nhận
            diện mã QR qua camera hoặc nhập mã vé 8 ký tự.
          </p>
        </div>
      </div>

      <div className="admission-steps">
        <span className={!preview && !result ? "active" : ""}>
          01 · Chọn suất
        </span>
        <span className={preview ? "active" : ""}>02 · Kiểm tra vé</span>
        <span className={result ? "active" : ""}>03 · Xác nhận vào rạp</span>
      </div>

      <div className="admission-context">
        <label>
          <span className="flex items-center gap-1.5 font-medium text-sm text-slate-300">
            <MapPin size={15} /> Cụm rạp
          </span>
          <select
            aria-label="Rạp đang soát"
            disabled={busy}
            value={cinemaId}
            onChange={(event) => {
              stopCamera();
              setCinemaId(event.target.value);
              setShowtimeId("");
              clearResult();
            }}
          >
            <option value="">Tất cả rạp NOVA</option>
            {cinemas.map((cinema) => (
              <option key={cinema.id} value={cinema.id}>
                {cinema.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="flex items-center gap-1.5 font-medium text-sm text-slate-300">
            <Calendar size={15} /> Ngày chiếu
          </span>
          <input
            aria-label="Ngày đang soát"
            type="date"
            value={day}
            disabled={busy}
            onChange={(event) => {
              stopCamera();
              setDay(event.target.value);
              setShowtimeId("");
              clearResult();
            }}
          />
        </label>

        <label className="admission-screening">
          <span className="flex items-center gap-1.5 font-medium text-sm text-slate-300">
            <Clock size={15} /> Suất chiếu đang kiểm tra
          </span>
          <select
            aria-label="Suất chiếu đang soát"
            value={showtimeId}
            disabled={busy}
            onChange={(event) => {
              setShowtimeId(event.target.value);
              clearResult();
            }}
          >
            <option value="">
              {screenings.length
                ? "Tự động phát hiện theo vé (hoặc chọn sẵn tại đây)"
                : "Chọn phim · giờ · phòng"}
            </option>
            {screeningOptions}
          </select>
        </label>
      </div>

      <div className="staff-mode-switch">
        {[
          ["manual", Keyboard, "Nhập mã vé"],
          ["camera", Camera, "Quét Camera QR"],
        ].map(([key, Icon, title]) => (
          <button
            key={key}
            type="button"
            disabled={busy}
            className={`staff-mode-tab ${mode === key ? "active" : ""}`}
            onClick={() => {
              setMode(key);
              clearResult();
            }}
          >
            <Icon size={16} />
            {title}
          </button>
        ))}
      </div>

      {mode === "camera" && (
        <div className="camera-scanner-container">
          <div
            className={`scanner-viewfinder ${scannedEffect ? "ring-4 ring-emerald-500 scale-[1.02] transition-transform" : ""}`}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
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
                ? "Hướng camera vào mã QR trên điện thoại hoặc vé in"
                : cameraError
                  ? "Chế độ mô phỏng · Chọn ảnh hoặc nhập mã bên dưới"
                  : "Đang kết nối camera…"}
            </div>
          </div>

          {cameraError && (
            <div role="status" className="scanner-help-message">
              {cameraError}
            </div>
          )}

          <div className="camera-controls-row mt-3 flex items-center gap-2">
            <button
              type="button"
              className="button button-glass text-xs"
              disabled={busy}
              onClick={cameraActive ? stopCamera : startCamera}
            >
              {cameraActive ? <CameraOff size={15} /> : <Camera size={15} />}{" "}
              {cameraActive ? "Tắt camera" : "Bật lại camera"}
            </button>
            <button
              type="button"
              className="button button-glass text-xs"
              onClick={() => setMode("manual")}
            >
              <Keyboard size={15} /> Nhập mã bằng tay
            </button>
          </div>
        </div>
      )}

      <QrCapture
        disabled={busy}
        demo={demo}
        onCode={(code) => {
          setHash(code);
          void verify(code);
        }}
      />

      <form
        className="auth-form admission-form"
        onSubmit={(event) => {
          event.preventDefault();
          void verify(hash);
        }}
      >
        <div className="flex items-center justify-between">
          <label
            htmlFor="ticket-hash"
            className="text-sm font-medium text-slate-200"
          >
            Mã QR hoặc mã vé 8 ký tự
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs text-amber-400 hover:underline flex items-center gap-1"
              onClick={pasteFromClipboard}
            >
              <ClipboardCheck size={13} /> Dán từ Clipboard
            </button>
            {hash && (
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                onClick={() => {
                  setHash("");
                  clearResult();
                }}
              >
                <X size={13} /> Xóa
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            id="ticket-hash"
            aria-label="Mã đọc từ QR"
            value={hash}
            disabled={busy}
            onChange={(event) => {
              setHash(event.target.value);
              clearResult();
            }}
            autoComplete="off"
            spellCheck="false"
            placeholder="Quét QR hoặc nhập mã vé, ví dụ NV-8K92FABC"
            className="flex-1"
          />
          <button
            type="submit"
            className="button button-primary whitespace-nowrap px-5"
            disabled={busy || !hash.trim()}
          >
            {busy ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Đang đối chiếu…
              </>
            ) : (
              <>
                <ClipboardCheck size={16} /> Kiểm tra vé
              </>
            )}
          </button>
        </div>
      </form>

      {(error || ticket) &&
        (() => {
          const status = (
            <AdmissionStatus
              ticket={ticket}
              result={result}
              error={error}
              currentShowtime={screenings.find(
                (show) => show.id === showtimeId,
              )}
              busy={busy}
              onAdmit={admit}
              onClear={nextTicket}
              guidance={guidance}
              onGuidance={setGuidance}
              onRepeat={repeatTicket}
              cardRef={alertRef}
            />
          );
          const host = embedded
            ? document.getElementById("staff-status-slot")
            : null;
          return host ? createPortal(status, host) : status;
        })()}

      <div className="admission-checklist">
        <p className="nova-kicker">QUY TRÌNH SOÁT VÉ TIÊU CHUẨN</p>
        <div>
          <span>Vé hợp lệ → Xác nhận vào rạp</span>
          <span>Không tìm thấy → Từ chối</span>
          <span>Sai suất chiếu → Đối chiếu giờ</span>
          <span>Đã sử dụng → Chặn vào lại</span>
        </div>
        <p>
          Hệ thống nhận diện mã QR quét từ Camera điện thoại hoặc mã vé riêng in
          trên vé.
        </p>
      </div>
    </Modal>
  );
}
