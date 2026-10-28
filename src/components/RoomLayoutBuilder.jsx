import { useEffect, useState } from "react";
import { Armchair, CheckCircle2, Grid2X2, ShieldCheck } from "lucide-react";
import { apiList, readCommand } from "../api/client.js";
import { useCatalog } from "../catalog.js";
const labels = { STANDARD: "Thường", VIP: "VIP", SWEETBOX: "Sweetbox" };
export default function RoomLayoutBuilder() {
  const catalog = useCatalog();
  const [roomId, setRoomId] = useState("");
  const [existing, setExisting] = useState(null);
  const [rows, setRows] = useState(8),
    [columns, setColumns] = useState(20);
  const [types, setTypes] = useState({
    D: "VIP",
    E: "VIP",
    F: "VIP",
    H: "SWEETBOX",
  });
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const rowLabels = Array.from(
    { length: Math.min(15, Math.max(1, Number(rows) || 1)) },
    (_, i) => String.fromCharCode(65 + i),
  );
  const count = Number(rows) * Number(columns);
  const invalid =
    !Number.isInteger(Number(rows)) ||
    !Number.isInteger(Number(columns)) ||
    rows < 1 ||
    rows > 15 ||
    columns < 1 ||
    columns > 24 ||
    count > 300;
  const oddSweetbox =
    columns % 2 !== 0 && rowLabels.some((row) => types[row] === "SWEETBOX");
  const locked = existing?.length > 0;
  useEffect(() => {
    if (!roomId) return;
    let active = true;
    apiList(`/rooms/${roomId}/seats`)
      .then((seats) => {
        if (active) setExisting(seats);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [roomId, revision]);
  const preview = locked
    ? Object.entries(Object.groupBy(existing, (seat) => seat.seatRow))
    : rowLabels.map((row) => [
        row,
        Array.from(
          { length: Math.min(24, Math.max(1, Number(columns) || 1)) },
          (_, i) => ({
            seatRow: row,
            seatColumn: i + 1,
            seatType: types[row] || "STANDARD",
          }),
        ),
      ]);
  async function generate(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await readCommand(`/rooms/${roomId}/seats/generate`, {
        rows: rowLabels,
        columns: Number(columns),
        vipRows: rowLabels.filter((row) => types[row] === "VIP"),
        sweetboxRows: rowLabels.filter((row) => types[row] === "SWEETBOX"),
      });
      setNotice(`Đã lưu sơ đồ ${result.totalSeats} ghế vào phòng chiếu.`);
      setExisting(null);
      setRevision((v) => v + 1);
      void catalog.reload().catch((error) => setError(error.message));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="room-builder">
      <div className="workspace-heading">
        <div>
          <p className="nova-kicker">THIẾT KẾ PHÒNG CHIẾU</p>
          <h2>
            <Grid2X2 size={27} /> Sơ đồ rõ ràng. Chỗ ngồi chính xác.
          </h2>
          <p>
            Xem sơ đồ hiện tại hoặc tạo ghế cho phòng mới chưa có lịch chiếu.
          </p>
        </div>
      </div>
      <form onSubmit={generate}>
        <div className="room-builder-controls">
          <label>
            Phòng cần xem / tạo sơ đồ
            <select
              required
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value);
                setExisting(null);
                setError("");
                setNotice("");
              }}
            >
              <option value="">Chọn phòng chiếu</option>
              {catalog.rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {catalog.cinemas.find((c) => c.id === room.cinemaId)?.name} ·{" "}
                  {room.name} · {room.totalSeats} ghế
                </option>
              ))}
            </select>
          </label>
          {!locked && (
            <>
              <label>
                Số hàng
                <input
                  aria-label="Số hàng ghế"
                  type="number"
                  min="1"
                  max="15"
                  required
                  value={rows}
                  onChange={(e) => setRows(e.target.value)}
                />
              </label>
              <label>
                Số cột
                <input
                  aria-label="Số cột ghế"
                  type="number"
                  min="1"
                  max="24"
                  required
                  value={columns}
                  onChange={(e) => setColumns(e.target.value)}
                />
              </label>
            </>
          )}
        </div>
        <div className="layout-summary">
          <strong>
            <Armchair size={21} /> {locked ? existing.length : count || 0} ghế
          </strong>
          <span>Tối đa 300 ghế · 15 hàng · 24 cột</span>
        </div>
        {locked && (
          <p className="layout-info">
            <ShieldCheck size={18} /> Sơ đồ đã lưu được hiển thị bên dưới. Phòng
            đã có lịch chiếu được bảo vệ khỏi thay đổi cấu trúc.
          </p>
        )}
        {roomId && existing === null && !error && (
          <p role="status">Đang đọc sơ đồ phòng…</p>
        )}
        {invalid && !locked && (
          <p className="workspace-error" role="alert">
            Vượt quá sức chứa cấu trúc vật lý của phòng. Vui lòng chọn tối đa
            300 ghế, 15 hàng và 24 cột.
          </p>
        )}
        {oddSweetbox && !locked && (
          <p className="workspace-error" role="alert">
            Hàng Sweetbox cần số cột chẵn để tạo đủ cặp ghế.
          </p>
        )}
        <div className="layout-preview-scroll">
          <div className="layout-preview">
            <div className="layout-screen">MÀN HÌNH</div>
            {preview.map(([row, seats]) => (
              <div className="layout-row" key={row}>
                <strong>{row}</strong>
                <div>
                  {seats.map((seat) => (
                    <span
                      title={`${row}${seat.seatColumn} · ${labels[seat.seatType]}`}
                      className={`layout-seat layout-${seat.seatType.toLowerCase()}`}
                      key={seat.seatColumn}
                    >
                      {seat.seatColumn}
                    </span>
                  ))}
                </div>
                {!locked && (
                  <select
                    aria-label={`Loại ghế hàng ${row}`}
                    value={types[row] || "STANDARD"}
                    onChange={(e) =>
                      setTypes({ ...types, [row]: e.target.value })
                    }
                  >
                    {Object.entries(labels).map(([key, text]) => (
                      <option key={key} value={key}>
                        {text}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="layout-legend">
          {Object.entries(labels).map(([key, text]) => (
            <span key={key}>
              <i className={`layout-seat layout-${key.toLowerCase()}`} />
              {text}
            </span>
          ))}
        </div>
        {!locked && (
          <button
            className="button button-primary"
            disabled={
              busy || invalid || oddSweetbox || !roomId || existing === null
            }
          >
            Lưu sơ đồ ghế
          </button>
        )}
        {notice && (
          <p className="workspace-success" role="status">
            <CheckCircle2 size={18} />
            {notice}
          </p>
        )}
        {error && (
          <p className="workspace-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
