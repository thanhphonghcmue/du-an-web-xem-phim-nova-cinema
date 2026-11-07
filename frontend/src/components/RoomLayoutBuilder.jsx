import { useEffect, useMemo, useState } from "react";
import { Armchair, CheckCircle2, Grid2X2, ShieldCheck } from "lucide-react";
import { apiList, readCommand } from "@/api/client.js";
import { formFieldErrors } from "@/api/formErrors.js";
import { useCatalog } from "@/catalog.js";
import { uniqueRecords } from "@/uniqueRecords.js";
const labels = { STANDARD: "Thường", VIP: "VIP", SWEETBOX: "Sweetbox" };
export default function RoomLayoutBuilder() {
  const catalog = useCatalog();
  const [roomId, setRoomId] = useState("");
  const [roomRows, setRoomRows] = useState(null);
  const roomOptions = useMemo(
    () => uniqueRecords(roomRows ?? catalog.rooms),
    [roomRows, catalog.rooms],
  );
  const [existing, setExisting] = useState(null);
  const [editingSeat, setEditingSeat] = useState(null);
  const [resizing, setResizing] = useState(false);
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
  useEffect(() => {
    let active = true;
    // Phòng mới chưa có suất vẫn cần hiện trong quản trị, không chờ cache lịch công khai.
    apiList("/rooms")
      .then((rooms) => {
        if (active) setRoomRows(rooms);
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, [catalog.rooms, revision]);
  const [fieldErrors, setFieldErrors] = useState({});
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
  const locked = existing?.length > 0 && !resizing;
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
    setFieldErrors({});
    try {
      const result = await readCommand(
        `/rooms/${roomId}/seats/${resizing ? "layout" : "generate"}`,
        {
          rows: rowLabels,
          columns: Number(columns),
          vipRows: rowLabels.filter((row) => types[row] === "VIP"),
          sweetboxRows: rowLabels.filter((row) => types[row] === "SWEETBOX"),
        },
        {},
        resizing ? "PUT" : "POST",
      );
      setNotice(`Đã lưu sơ đồ ${result.totalSeats} ghế vào phòng chiếu.`);
      setExisting(null);
      setResizing(false);
      setRevision((v) => v + 1);
      void catalog.reload().catch((error) => setError(error.message));
    } catch (err) {
      setFieldErrors(formFieldErrors(err, ["rows", "columns"]));
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
              disabled={busy}
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value);
                setEditingSeat(null);
                setResizing(false);
                setExisting(null);
                setError("");
                setNotice("");
                setFieldErrors({});
              }}
            >
              <option value="">Chọn phòng chiếu</option>
              {roomOptions.map((room) => (
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
                  disabled={busy}
                  aria-invalid={
                    Boolean(fieldErrors.rows) ||
                    !Number.isInteger(Number(rows)) ||
                    Number(rows) < 1 ||
                    Number(rows) > 15 ||
                    count > 300
                  }
                  aria-describedby={
                    fieldErrors.rows
                      ? "layout-error-rows"
                      : invalid
                        ? "layout-capacity-error"
                        : undefined
                  }
                  type="number"
                  min="1"
                  max="15"
                  required
                  value={rows}
                  onChange={(e) => {
                    setRows(e.target.value);
                    setFieldErrors((current) => ({ ...current, rows: "" }));
                  }}
                />
                {fieldErrors.rows && (
                  <span
                    id="layout-error-rows"
                    className="field-validation-message"
                    role="alert"
                  >
                    {fieldErrors.rows}
                  </span>
                )}
              </label>
              <label>
                Số cột
                <input
                  aria-label="Số cột ghế"
                  disabled={busy}
                  aria-invalid={
                    Boolean(fieldErrors.columns) ||
                    !Number.isInteger(Number(columns)) ||
                    Number(columns) < 1 ||
                    Number(columns) > 24 ||
                    count > 300 ||
                    oddSweetbox
                  }
                  aria-describedby={
                    fieldErrors.columns
                      ? "layout-error-columns"
                      : invalid
                        ? "layout-capacity-error"
                        : oddSweetbox
                          ? "layout-sweetbox-error"
                          : undefined
                  }
                  type="number"
                  min="1"
                  max="24"
                  required
                  value={columns}
                  onChange={(e) => {
                    setColumns(e.target.value);
                    setFieldErrors((current) => ({ ...current, columns: "" }));
                  }}
                />
                {fieldErrors.columns && (
                  <span
                    id="layout-error-columns"
                    className="field-validation-message"
                    role="alert"
                  >
                    {fieldErrors.columns}
                  </span>
                )}
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
          <p
            id="layout-capacity-error"
            className="workspace-error"
            role="alert"
          >
            Vượt quá sức chứa cấu trúc vật lý của phòng. Vui lòng chọn tối đa
            300 ghế, 15 hàng và 24 cột.
          </p>
        )}
        {oddSweetbox && !locked && (
          <p
            id="layout-sweetbox-error"
            className="workspace-error"
            role="alert"
          >
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
                    <button
                      type="button"
                      disabled={!locked || busy || !roomId}
                      onClick={() => setEditingSeat({ ...seat })}
                      title={`${row}${seat.seatColumn} · ${labels[seat.seatType]}`}
                      aria-label={`${row}${seat.seatColumn} · ${labels[seat.seatType]}`}
                      className={`layout-seat layout-${seat.seatType.toLowerCase()}`}
                      key={seat.seatColumn}
                    >
                      {seat.seatColumn}
                    </button>
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
        {locked && (
          <button
            type="button"
            className="button button-glass"
            disabled={busy}
            onClick={() => {
              const grouped = Object.groupBy(existing, (seat) => seat.seatRow);
              setRows(
                Math.min(
                  15,
                  Math.max(
                    ...existing.map((seat) => seat.seatRow.charCodeAt(0) - 64),
                  ),
                ),
              );
              setColumns(Math.max(...existing.map((seat) => seat.seatColumn)));
              setTypes(
                Object.fromEntries(
                  Object.entries(grouped).map(([row, seats]) => [
                    row,
                    seats[0].seatType,
                  ]),
                ),
              );
              setEditingSeat(null);
              setResizing(true);
              setNotice("");
            }}
          >
            Chỉnh số hàng / cột
          </button>
        )}
        {resizing && (
          <p className="layout-info">
            Lưu sẽ áp dụng loại ghế theo từng hàng trong sơ đồ xem trước. Chỉ
            phòng chưa có lịch được phép đổi ma trận.
          </p>
        )}
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
      {editingSeat && (
        <form
          className="live-admin-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              await readCommand(
                `/seats/${editingSeat.id}`,
                {
                  seatRow: editingSeat.seatRow,
                  seatColumn: Number(editingSeat.seatColumn),
                  seatType: editingSeat.seatType,
                },
                {},
                "PATCH",
              );
              setRevision((value) => value + 1);
              setEditingSeat(null);
              setNotice("Đã lưu ghế vào database.");
            } catch (cause) {
              setError(cause.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            Chỉnh từng ghế trong phòng chưa có lịch. Phòng đã có lịch/vé giữ
            nguyên cấu trúc để bảo toàn dữ liệu.
          </p>
          <label>
            Hàng ghế
            <input
              disabled={busy}
              aria-label="Hàng ghế chỉnh sửa"
              required
              value={editingSeat.seatRow}
              onChange={(event) =>
                setEditingSeat({
                  ...editingSeat,
                  seatRow: event.target.value.toUpperCase(),
                })
              }
            />
          </label>
          <label>
            Cột ghế
            <input
              disabled={busy}
              required
              aria-label="Cột ghế chỉnh sửa"
              type="number"
              min="1"
              max="24"
              value={editingSeat.seatColumn}
              onChange={(event) =>
                setEditingSeat({
                  ...editingSeat,
                  seatColumn: event.target.value,
                })
              }
            />
          </label>
          <label>
            Loại ghế
            <select
              disabled={busy}
              aria-label="Loại ghế chỉnh sửa"
              value={editingSeat.seatType}
              onChange={(event) =>
                setEditingSeat({ ...editingSeat, seatType: event.target.value })
              }
            >
              {Object.entries(labels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-primary" disabled={busy}>
            Lưu cấu hình ghế
          </button>
          <button
            type="button"
            className="button button-glass"
            disabled={busy}
            onClick={() => setEditingSeat(null)}
          >
            Hủy chỉnh ghế
          </button>
        </form>
      )}
    </section>
  );
}
