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
import RoomLayoutBuilder from "./RoomLayoutBuilder.jsx";
import { read, readCommand } from "@/api/client.js";
import { formFieldErrors } from "@/api/formErrors.js";
import { useCatalog } from "@/catalog.js";
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
export default function QuanLyDanhMucPhimRap() {
  const catalog = useCatalog();
  const [kind, setKind] = useState("movies"),
    [items, setItems] = useState([]),
    [meta, setMeta] = useState(null),
    [page, setPage] = useState(1),
    [keyword, setKeyword] = useState(""),
    [draft, setDraft] = useState({}),
    [editId, setEditId] = useState(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  function updateField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  }
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        page,
        limit: 25,
        ...(["movies", "cinemas", "rooms"].includes(kind) && keyword.trim()
          ? { keyword: keyword.trim() }
          : {}),
      });
      read(`/${kind}?${params}`)
        .then((data) => {
          if (active) {
            setItems(data.items);
            setMeta(data.meta);
          }
        })
        .catch((err) => {
          if (active) setMessage(err.message);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [kind, revision, page, keyword]);
  function select(value) {
    setFieldErrors({});
    setKind(value);
    setPage(1);
    setMeta(null);
    setItems([]);
    setKeyword("");
    setDraft({});
    setEditId(null);
    setMessage("");
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setFieldErrors({});
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
      setPage(1);
      setMessage("Đã lưu thành công.");
      setDraft({});
      setEditId(null);
      setRevision((v) => v + 1);
      void catalog.reload().catch((error) => setMessage(error.message));
    } catch (err) {
      const fieldIssues = formFieldErrors(
        err,
        specs[kind].fields.map(([key]) => key),
        {
          codes: { MOVIE_TITLE_EXISTS: "title" },
        },
      );
      setFieldErrors(fieldIssues);
      setMessage(
        err.status === 400 && Object.keys(fieldIssues).length
          ? "Vui lòng kiểm tra các trường được đánh dấu trong biểu mẫu."
          : err.message,
      );
    } finally {
      setBusy(false);
    }
  }
  function edit(item) {
    setFieldErrors({});
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
      void catalog.reload().catch((error) => setMessage(error.message));
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
            disabled={busy}
            onClick={() => select(key)}
          >
            {spec.label}
          </button>
        ))}
      </nav>
      <div className="catalog-workspace">
        <section className="admin-editor-panel">
          <p className="nova-kicker">BIỂU MẪU DANH MỤC</p>
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
                      disabled={busy}
                      aria-invalid={Boolean(fieldErrors[key])}
                      aria-describedby={
                        fieldErrors[key] ? `catalog-error-${key}` : undefined
                      }
                      value={draft[key] || ""}
                      required={!editId}
                      onChange={(e) => updateField(key, e.target.value)}
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
                      disabled={busy}
                      aria-invalid={Boolean(fieldErrors[key])}
                      aria-describedby={
                        fieldErrors[key] ? `catalog-error-${key}` : undefined
                      }
                      type={type}
                      value={draft[key] || ""}
                      min={type === "number" ? 1 : undefined}
                      required={
                        !editId && !["posterUrl", "trailerUrl"].includes(key)
                      }
                      onChange={(e) => updateField(key, e.target.value)}
                    />
                  )}
                  {fieldErrors[key] && (
                    <span
                      id={`catalog-error-${key}`}
                      className="field-validation-message"
                      role="alert"
                    >
                      {fieldErrors[key]}
                    </span>
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
                  setFieldErrors({});
                }}
              >
                Hủy chỉnh sửa
              </button>
            )}
          </form>
          {message && (
            <p className="workspace-message" role="status">
              {message}
            </p>
          )}
        </section>
        <section className="admin-list-panel">
          <div className="workspace-toolbar">
            <div>
              <p className="nova-kicker">DỮ LIỆU ĐÃ LƯU</p>
              <h3>
                {specs[kind].label} <small>{meta?.total ?? "…"} mục</small>
              </h3>
            </div>
            {["movies", "cinemas", "rooms"].includes(kind) && (
              <label>
                Tìm trong danh mục
                <input
                  type="search"
                  aria-label="Tìm trong danh mục quản trị"
                  value={keyword}
                  placeholder="Nhập tên để tìm…"
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setPage(1);
                    setMeta(null);
                  }}
                />
              </label>
            )}
          </div>
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
                  <tr key={item.id} data-entity-id={item.id}>
                    <td>
                      {item.title ||
                        item.name ||
                        new Date(item.startTime).toLocaleString("vi-VN")}
                    </td>
                    <td>
                      {{
                        COMING_SOON: "Sắp chiếu",
                        NOW_SHOWING: "Đang chiếu",
                        ENDED: "Ngừng chiếu",
                        STANDARD_2D: "2D",
                        IMAX_70MM_LASER: "IMAX Laser",
                        DOLBY_ATMOS: "Dolby Atmos",
                      }[item.status || item.roomType] || "—"}
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => edit(item)}
                      >
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
          <div className="workspace-pagination">
            <button
              className="button button-glass"
              disabled={page <= 1 || busy}
              onClick={() => setPage((v) => v - 1)}
            >
              Trang trước
            </button>
            <span>
              Trang {page} / {Math.max(1, meta?.totalPages || page)}
            </span>
            <button
              className="button button-glass"
              disabled={!meta || page >= meta.totalPages || busy}
              onClick={() => setPage((v) => v + 1)}
            >
              Trang sau
            </button>
          </div>
          {items.length === 0 && (
            <p className="workspace-empty">
              {meta ? "Chưa có dữ liệu phù hợp." : "Đang tải danh mục…"}
            </p>
          )}
        </section>
      </div>
      {kind === "rooms" && <RoomLayoutBuilder />}
    </div>
  );
}
