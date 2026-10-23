/**
 * ==============================================================================
 * TỆP TIN: src/components/OperationalCatalog.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Mô-đun Quản Trị CRUD Danh Mục Hoạt Động Của Rạp (Operational Catalog CRUD Engine).
 *   - Quản lý 5 thực thể cốt lõi trong cơ sở dữ liệu:
 *     1. PHIM (Movies): Thêm/sửa thông tin phim, độ tuổi (P/K/T13/T16/T18), trạng thái, trailer YouTube, poster.
 *     2. CỤM RẠP (Cinemas): Thêm rạp mới, địa chỉ, thành phố.
 *     3. PHÒNG CHIẾU (Rooms): Cấu hình định dạng phòng (2D / IMAX Laser / Dolby Atmos) và TỰ ĐỘNG SINH SƠ ĐỒ 160 GHẾ cho phòng mới.
 *     4. SUẤT CHIẾU (Showtimes): Tạo lịch chiếu theo ngày giờ, gắn phòng chiếu và đặt giá vé cơ bản.
 *     5. COMBO BẮP NƯỚC (Combos): Thêm gói combo ẩm thực, giá bán và bật/tắt bán tại quầy.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Quản trị viên chọn phân hệ muốn quản lý (Phim, Rạp, Phòng, Suất, Combo).
 *   2. Giao diện hiển thị bảng dữ liệu lấy từ API backend.
 *   3. Nhập biểu mẫu -> Gửi `POST /api/v1/<resource>` tạo mới.
 *   4. Gọi `reload()` từ `CatalogContext` để đồng bộ ngay lập tức sang giao diện khách hàng.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Quản trị viên (ADMIN) trong Bảng điều khiển quản trị.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Hỗ trợ tải file ảnh poster trực tiếp lên server (Multipart/form-data upload) thay vì chỉ dán link URL.
 *   - Thêm tính năng sao chép lịch chiếu hàng loạt (Batch clone showtimes) cho cả tuần kế tiếp.
 * ==============================================================================
 */

import { useEffect, useState } from "react";
import { apiList, readCommand } from "../api/client.js";
import { useCatalog } from "../catalog.js";
const specs = {
  movies: {
    label: "Phim",
    fields: [
      ["title", "Tên phim"],
      ["description", "Nội dung"],
      ["durationMinutes", "Thời lượng (phút)", "number"],
      ["releaseDate", "Ngày phát hành", "datetime-local"],
      ["ageRating", "Nhãn tuổi", ["P", "K", "T13", "T16", "T18"]],
      ["status", "Trạng thái", ["COMING_SOON", "NOW_SHOWING", "ENDED"]],
      ["posterUrl", "Ảnh poster", "url"],
      ["trailerUrl", "Trailer", "url"],
    ],
  },
  cinemas: {
    label: "Cụm rạp",
    fields: [
      ["name", "Tên rạp"],
      ["city", "Thành phố"],
      ["address", "Địa chỉ"],
    ],
  },
  rooms: {
    label: "Phòng chiếu",
    fields: [
      ["cinemaId", "Thuộc cụm rạp", "cinemas"],
      ["name", "Tên phòng"],
      [
        "roomType",
        "Định dạng",
        ["STANDARD_2D", "IMAX_70MM_LASER", "DOLBY_ATMOS"],
      ],
    ],
  },
  showtimes: {
    label: "Suất chiếu",
    fields: [
      ["movieId", "Phim", "movies"],
      ["roomId", "Phòng", "rooms"],
      ["startTime", "Bắt đầu", "datetime-local"],
      ["baseTicketPrice", "Giá vé cơ bản (VND)"],
    ],
  },
  combos: {
    label: "Bắp nước",
    fields: [
      ["name", "Tên combo"],
      ["description", "Mô tả"],
      ["price", "Giá (VND)"],
      ["isActive", "Đang bán", ["true", "false"]],
    ],
  },
};
export default function OperationalCatalog() {
  const catalog = useCatalog();
  const [kind, setKind] = useState("movies"),
    [items, setItems] = useState([]),
    [draft, setDraft] = useState({}),
    [editId, setEditId] = useState(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  const [layout, setLayout] = useState({
    roomId: "",
    rows: "A,B,C,D,E,F,G,H",
    columns: 20,
    vipRows: "D,E,F",
    sweetboxRows: "H",
  });
  useEffect(() => {
    let active = true;
    apiList("/" + kind)
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch((err) => {
        if (active) setMessage(err.message);
      });
    return () => {
      active = false;
    };
  }, [kind, revision]);
  function select(value) {
    setKind(value);
    setDraft({});
    setEditId(null);
    setMessage("");
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const body = {};
      for (const [key, , type] of specs[kind].fields) {
        const value = draft[key];
        if (value === undefined || value === "") continue;
        body[key] =
          type === "number"
            ? Number(value)
            : type === "datetime-local"
              ? new Date(value).toISOString()
              : key === "isActive"
                ? value === "true"
                : value;
      }
      await readCommand(
        `/${kind}${editId ? "/" + editId : ""}`,
        body,
        {},
        editId ? "PATCH" : "POST",
      );
      setMessage("Đã lưu thành công.");
      setDraft({});
      setEditId(null);
      setRevision((v) => v + 1);
      await catalog.reload();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }
  function edit(item) {
    setEditId(item.id);
    setDraft(
      Object.fromEntries(
        specs[kind].fields.map(([key, , type]) => [
          key,
          type === "datetime-local"
            ? new Date(
                new Date(item[key]).getTime() -
                  new Date(item[key]).getTimezoneOffset() * 60000,
              )
                .toISOString()
                .slice(0, 16)
            : String(item[key] ?? ""),
        ]),
      ),
    );
    setMessage("");
  }
  async function remove(item) {
    setBusy(true);
    try {
      await readCommand(`/${kind}/${item.id}`, undefined, {}, "DELETE");
      setRevision((v) => v + 1);
      setMessage("Đã xóa mục chưa có lịch sử sử dụng.");
      await catalog.reload();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function generate(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const split = (s) =>
        s
          .split(",")
          .map((v) => v.trim().toUpperCase())
          .filter(Boolean);
      const result = await readCommand(
        `/rooms/${layout.roomId}/seats/generate`,
        {
          rows: split(layout.rows),
          columns: Number(layout.columns),
          vipRows: split(layout.vipRows),
          sweetboxRows: split(layout.sweetboxRows),
        },
      );
      setMessage(`Đã tạo ${result.createdCount} ghế.`);
      await catalog.reload();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="live-admin">
      <nav aria-label="Danh mục vận hành">
        {Object.entries(specs).map(([key, spec]) => (
          <button
            key={key}
            className="button button-glass"
            aria-pressed={kind === key}
            onClick={() => select(key)}
          >
            {spec.label}
          </button>
        ))}
      </nav>
      <h3>
        {editId ? "Chỉnh sửa" : "Tạo mới"} {specs[kind].label.toLowerCase()}
      </h3>
      <form className="live-admin-form" onSubmit={save}>
        {specs[kind].fields.map(([key, label, type = "text"]) => {
          const choices = Array.isArray(type)
            ? type.map((v) => ({ id: v, name: v }))
            : ["cinemas", "movies", "rooms"].includes(type)
              ? catalog[type].map((v) => ({
                  id: v.id,
                  name: v.name || v.title,
                }))
              : null;
          return (
            <label key={key}>
              {label}
              {choices ? (
                <select
                  aria-label={label}
                  value={draft[key] || ""}
                  required={!editId}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                >
                  <option value="">Chọn…</option>
                  {choices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  aria-label={label}
                  type={type}
                  value={draft[key] || ""}
                  min={type === "number" ? 1 : undefined}
                  required={
                    !editId && !["posterUrl", "trailerUrl"].includes(key)
                  }
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
              )}
            </label>
          );
        })}
        <button className="button button-primary" disabled={busy}>
          Lưu {specs[kind].label.toLowerCase()}
        </button>
        {editId && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setEditId(null);
              setDraft({});
            }}
          >
            Hủy chỉnh sửa
          </button>
        )}
      </form>
      {message && <p role="status">{message}</p>}
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tên / thời gian</th>
              <th>Trạng thái / định dạng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.title ||
                    item.name ||
                    new Date(item.startTime).toLocaleString("vi-VN")}
                </td>
                <td>{item.status || item.roomType || ""}</td>
                <td>
                  <button className="text-button" onClick={() => edit(item)}>
                    Sửa
                  </button>
                  {kind !== "combos" && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => remove(item)}
                    >
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {kind === "rooms" && (
        <form className="live-admin-form" onSubmit={generate}>
          <h3>Tạo sơ đồ cho phòng trống</h3>
          <label>
            Phòng
            <select
              required
              value={layout.roomId}
              onChange={(e) => setLayout({ ...layout, roomId: e.target.value })}
            >
              <option value="">Chọn phòng</option>
              {catalog.rooms.map((r) => (
                <option value={r.id} key={r.id}>
                  {r.name} · {r.totalSeats} ghế
                </option>
              ))}
            </select>
          </label>
          {[
            ["rows", "Các hàng (ngăn bằng dấu phẩy)"],
            ["columns", "Số cột"],
            ["vipRows", "Hàng VIP"],
            ["sweetboxRows", "Hàng Sweetbox"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={layout[key]}
                onChange={(e) =>
                  setLayout({ ...layout, [key]: e.target.value })
                }
              />
            </label>
          ))}
          <button className="button button-primary" disabled={busy}>
            Tạo ghế
          </button>
        </form>
      )}
    </div>
  );
}
