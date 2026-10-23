// SoatVeNhanVien: mã nguồn chức năng, dùng chung cho mọi trang.
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  ClipboardCheck,
  Keyboard,
  QrCode,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import Modal from "./Modal.jsx";
import { apiGetShowtimes, readCommand } from "../api/client.js";
import { useCatalog } from "../catalog.js";

const vietnamDate = (value = new Date()) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const labels = {
  TICKET_NOT_FOUND: "Không tìm thấy định danh vé trong hệ thống.",
  TICKET_SHOWTIME_MISMATCH:
    "Vé không khớp với suất chiếu đang kiểm tra. Hãy đối chiếu lại phòng và giờ trên vé.",
  TICKET_ALREADY_USED:
    "Vé này đã được sử dụng. Không thể xác nhận lần thứ hai.",
  CHECK_IN_OUTSIDE_WINDOW:
    "Chưa đến hoặc đã quá thời gian được phép vào rạp của vé này.",
  TICKET_BOOKING_NOT_PAID:
    "Đơn chưa đủ điều kiện vào rạp. Cần xác nhận thanh toán và trạng thái ghế.",
};
export default function SoatVeNhanVien({ onClose, embedded = false }) {
  const { cinemas, rooms, movies, isLive } = useCatalog();
  const [mode, setMode] = useState("manual");
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
  const videoRef = useRef(null),
    streamRef = useRef(null),
    loopRef = useRef(null),
    inFlight = useRef(false),
    cameraEpoch = useRef(0);
  const [schedule, setSchedule] = useState({
    items: [],
    day: "",
    cinemaId: "",
    error: "",
  });
  const scheduleReady =
    schedule.day === day && schedule.cinemaId === cinemaId && !schedule.error;
  const screenings = scheduleReady ? schedule.items : [];
  useEffect(() => {
    let active = true;
    async function load() {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
      try {
        // Explicit date includes already-started screenings, unlike the public upcoming catalog.
        const items = await apiGetShowtimes({
          date: day,
          ...(cinemaId ? { cinemaId } : {}),
        });
        if (active) setSchedule({ items, day, cinemaId, error: "" });
      } catch (err) {
        if (active)
          setSchedule({ items: [], day, cinemaId, error: err.message });
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
    setPreview(null);
    setResult(null);
    setError(null);
  }
  function stopCamera() {
    cameraEpoch.current++;
    cancelAnimationFrame(loopRef.current);
    loopRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }
  useEffect(
    () => () => {
      cameraEpoch.current++;
      cancelAnimationFrame(loopRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );
  function report(err) {
    setError({
      code: err.code,
      message: labels[err.code] || err.message,
      at: err.details?.checkedInAt,
    });
  }
  async function verify(targetHash) {
    if (inFlight.current || !showtimeId || !scheduleReady) return;
    inFlight.current = true;
    setBusy(true);
    clearResult();
    stopCamera();
    try {
      const normalized = targetHash.trim().toLowerCase();
      const ticket = await readCommand("/staff/verify", {
        ticketHash: normalized,
        showtimeId,
      });
      setPreview({ ticket, hash: normalized, showtimeId });
    } catch (err) {
      report(err);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function admit() {
    if (!preview || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const ticket = await readCommand("/staff/check-in", {
        ticketHash: preview.hash,
        showtimeId: preview.showtimeId,
      });
      setResult(ticket);
      setPreview(null);
    } catch (err) {
      setPreview(null);
      report(err);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function startCamera() {
    setCameraError("");
    if (!showtimeId) {
      setCameraError("Chọn suất chiếu trước khi bật camera.");
      return;
    }
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Trình duyệt chưa hỗ trợ quét QR trực tiếp. Hãy dùng mục Nhập mã hoặc trình duyệt hỗ trợ BarcodeDetector.",
      );
      return;
    }
    stopCamera();
    const epoch = cameraEpoch.current;
    try {
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (epoch !== cameraEpoch.current || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (epoch !== cameraEpoch.current) return;
      setCameraActive(true);
      async function detect() {
        if (
          epoch !== cameraEpoch.current ||
          !streamRef.current ||
          !videoRef.current
        )
          return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (epoch !== cameraEpoch.current) return;
          const raw = codes[0]?.rawValue?.trim().toLowerCase();
          if (raw && /^[a-f0-9]{64}$/.test(raw)) {
            setHash(raw);
            await verify(raw);
            return;
          }
        } catch {
          /* A dropped camera frame is retried; no admission occurs here. */
        }
        loopRef.current = requestAnimationFrame(detect);
      }
      loopRef.current = requestAnimationFrame(detect);
    } catch (err) {
      stopCamera();
      setCameraError(
        err.message || "Không mở được camera. Bạn có thể nhập mã QR.",
      );
    }
  }
  const ticket = result || preview?.ticket;
  return (
    <Modal
      title="Soát vé tại rạp (Nhân viên)"
      onClose={onClose}
      embedded={embedded}
    >
      <div className="admission-intro">
        <ShieldCheck size={25} />
        <div>
          <p className="nova-kicker">NOVA ADMISSION DESK</p>
          <h3>Đúng suất. Đúng vé. Một lần vào rạp.</h3>
          <p>
            Kiểm tra thông tin trước, xác nhận cho vào rạp sau. Mọi kết quả do
            máy chủ đối chiếu.
          </p>
        </div>
      </div>
      <div className="admission-steps">
        <span className={!preview && !result ? "active" : ""}>
          01 · Chọn suất
        </span>
        <span className={preview ? "active" : ""}>02 · Kiểm tra QR</span>
        <span className={result ? "active" : ""}>03 · Xác nhận vào rạp</span>
      </div>
      <div className="admission-context">
        <label>
          Cụm rạp
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
          Ngày chiếu
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
          Suất chiếu đang kiểm tra
          <select
            aria-label="Suất chiếu đang soát"
            value={showtimeId}
            disabled={busy || !isLive || !scheduleReady}
            onChange={(event) => {
              stopCamera();
              setShowtimeId(event.target.value);
              clearResult();
            }}
          >
            <option value="">Chọn phim · giờ · phòng</option>
            {screenings.map((show) => (
              <option value={show.id} key={show.id}>
                {new Date(show.startTime).toLocaleTimeString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                ·{" "}
                {movies.find((movie) => movie.id === show.movieId)?.title ||
                  "Phim đã kết thúc"}{" "}
                · {rooms.find((room) => room.id === show.roomId)?.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!isLive && (
        <p role="alert" className="auth-notice">
          Chưa kết nối được lịch chiếu. Hãy tải lại trước khi soát vé.
        </p>
      )}
      {schedule.error &&
        schedule.day === day &&
        schedule.cinemaId === cinemaId && (
          <p role="alert" className="auth-notice">
            Không đọc được lịch ngày này: {schedule.error} Hệ thống sẽ thử lại;
            bạn có thể đổi ngày để tải lại.
          </p>
        )}
      {isLive && !scheduleReady && !schedule.error && (
        <p role="status">Đang đọc lịch theo ngày từ máy chủ…</p>
      )}
      {isLive && scheduleReady && !screenings.length && (
        <p role="status">
          Ngày này chưa có lịch ở rạp đã chọn. Hãy đổi ngày hoặc rạp.
        </p>
      )}
      <div className="staff-mode-switch">
        {[
          ["manual", Keyboard, "Nhập mã"],
          ["camera", Camera, "Quét Camera QR"],
        ].map(([key, Icon, title]) => (
          <button
            key={key}
            type="button"
            disabled={busy}
            className={`staff-mode-tab ${mode === key ? "active" : ""}`}
            onClick={() => {
              stopCamera();
              setMode(key);
            }}
          >
            <Icon size={16} />
            {title}
          </button>
        ))}
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
              <QrCode size={68} />
            </div>
            <div className="scanner-overlay-hint">
              {cameraActive
                ? "Hướng camera về mã QR. Quét chưa xác nhận vào rạp."
                : "Chọn suất rồi bấm Bật camera."}
            </div>
          </div>
          {cameraError && (
            <p role="status" className="scanner-error-message">
              {cameraError}
            </p>
          )}
          <div className="camera-controls-row">
            <button
              type="button"
              className="button button-glass"
              disabled={busy || !showtimeId}
              onClick={cameraActive ? stopCamera : startCamera}
            >
              {cameraActive ? <CameraOff size={15} /> : <Camera size={15} />}{" "}
              {cameraActive ? "Tắt camera" : "Bật camera"}
            </button>
          </div>
        </div>
      )}
      <form
        className="auth-form admission-form"
        onSubmit={(event) => {
          event.preventDefault();
          void verify(hash);
        }}
      >
        <label htmlFor="ticket-hash">Mã đọc từ QR</label>
        <input
          id="ticket-hash"
          value={hash}
          disabled={busy}
          onChange={(event) => {
            setHash(event.target.value);
            clearResult();
          }}
          required
          pattern="[a-fA-F0-9]{64}"
          autoComplete="off"
          placeholder="Dán chuỗi 64 ký tự từ QR vé"
        />
        <button
          className="button button-primary"
          disabled={busy || !showtimeId || !hash.trim() || !scheduleReady}
        >
          <ClipboardCheck size={16} />
          {busy ? "Đang đối chiếu…" : "Kiểm tra vé"}
        </button>
      </form>
      {error && (
        <div
          role="alert"
          className={`admission-result ${error.code === "TICKET_SHOWTIME_MISMATCH" || error.code === "CHECK_IN_OUTSIDE_WINDOW" ? "warning" : "invalid"}`}
        >
          <AlertTriangle size={24} />
          <div>
            <h3>
              {error.code === "TICKET_ALREADY_USED"
                ? "Vé đã sử dụng"
                : "Chưa thể cho vào rạp"}
            </h3>
            <p>{error.message}</p>
            {error.at && (
              <p>
                Đã soát lúc{" "}
                {new Date(error.at).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </p>
            )}
          </div>
        </div>
      )}
      {ticket && (
        <div role="status" className="admission-result valid">
          <CheckCircle2 size={30} />
          <div>
            <h3>
              {result
                ? "Soát vé thành công!"
                : "Vé hợp lệ · Chưa xác nhận vào rạp"}
            </h3>
            <strong>{ticket.movie}</strong>
            <p>
              {ticket.cinema} · {ticket.room}
            </p>
            <p>
              {new Date(ticket.startTime).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </p>
            <p>
              Ghế: <b>{ticket.seats.map((seat) => seat.label).join(", ")}</b> ·{" "}
              {ticket.orderCode}
            </p>
            {result ? (
              <p>
                Đã soát:{" "}
                {new Date(result.checkedInAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </p>
            ) : (
              <>
                <p>
                  Đối chiếu khách và chỗ ngồi trước khi xác nhận. Máy chủ kiểm
                  tra lại tại thời điểm bấm.
                </p>
                <button
                  className="button button-primary"
                  disabled={busy}
                  onClick={admit}
                >
                  Xác nhận soát vé
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <div className="admission-checklist">
        <p className="nova-kicker">ĐỐI CHIẾU TẠI CỬA PHÒNG</p>
        <div>
          <span>Vé hợp lệ → xác nhận</span>
          <span>Không tìm thấy → từ chối</span>
          <span>Sai suất → kiểm tra lại</span>
          <span>Đã sử dụng → chặn vào lại</span>
        </div>
        <p>
          Chỉ dùng mã QR thực từ vé đã thanh toán. Không có vé mẫu tự tạo hoặc
          soát vé khi mất kết nối.
        </p>
      </div>
    </Modal>
  );
}
