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
import Modal from "./Modal.jsx";
import { read, readCommand } from "@/api/client.js";
import { formFieldErrors } from "@/api/formErrors.js";
import { comboTasteLabel, normalizedTasteTag } from "@/comboRecommendations.js";
import { publishComboUpdate } from "@/comboUpdates.js";
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
      ["status", "Trạng thái suất", ["ACTIVE", "LOCKED", "CANCELED"]],
    ],
  },
  combos: {
    label: "🍿 Quản lý Party Combo",
    fields: [
      ["name", "Tên combo"],
      ["tasteTag", "Khẩu vị", ["NGỌT", "MẶN", "PHÔ_MAI", "CARAMEL", "MIX"]],
      ["itemsSummary", "Thành phần combo"],
      ["suggestedMinSeats", "Số người tối thiểu", "number"],
      ["suggestedMaxSeats", "Số người tối đa", "number"],
      ["badgeLabel", "Nhãn", ["SOLO", "COUPLE", "PARTY"]],
      ["description", "Mô tả"],
      ["price", "Giá (VND)"],
      ["isActive", "Đang bán", ["true", "false"]],
    ],
  },
};
export default function QuanLyDanhMucPhimRap({ initialKind = "movies" }) {
  const catalog = useCatalog();
  const [kind, setKind] = useState(() =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("tab") === "combos"
        ? "combos"
        : initialKind,
    ),
    [items, setItems] = useState([]),
    [meta, setMeta] = useState(null),
    [page, setPage] = useState(1),
    [keyword, setKeyword] = useState(""),
    [draft, setDraft] = useState({}),
    [originalDraft, setOriginalDraft] = useState({}),
    [editId, setEditId] = useState(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  const [comboEditing, setComboEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  function updateField(key, value) {
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(kind === "combos" && key === "badgeLabel" && value
        ? {
            suggestedMinSeats:
              value === "SOLO" ? 1 : value === "COUPLE" ? 2 : 3,
            suggestedMaxSeats:
              value === "SOLO" ? 1 : value === "COUPLE" ? 2 : 20,
          }
        : {}),
    }));
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
      read(`/${kind === "combos" ? "admin/combos" : kind}?${params}`)
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
        // PATCH chỉ gửi trường đã đổi, tránh làm tròn giây/mili giây của lịch cũ.
        if (editId && value === originalDraft[key]) continue;
        if (key === "suggestedMaxSeats" && value === "") {
          body[key] = null;
          continue;
        }
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
        `/${kind === "combos" ? "admin/combos" : kind === "showtimes" && editId ? "admin/showtimes" : kind}${editId ? "/" + editId : ""}`,
        body,
        {},
        editId ? (kind === "combos" ? "PUT" : "PATCH") : "POST",
      );
      if (kind === "combos") publishComboUpdate();
      setPage(1);
      setMessage("Đã lưu thành công.");
      if (kind === "combos") setComboEditing(false);
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
    if (kind === "combos") setComboEditing(true);
    setFieldErrors({});
    setEditId(item.id);
    const values = Object.fromEntries(
      specs[kind].fields.map(([key, , type]) => [
        key,
        type === "datetime-local"
          ? new Date(
              new Date(item[key]).getTime() -
                new Date(item[key]).getTimezoneOffset() * 60000,
            )
              .toISOString()
              .slice(0, 16)
          : key === "tasteTag"
            ? normalizedTasteTag(item[key])
            : String(item[key] ?? ""),
      ]),
    );
    setDraft(values);
    setOriginalDraft(values);
    setMessage("");
  }
  async function remove(item) {
    setBusy(true);
    try {
      await readCommand(
        `/${kind === "combos" ? "admin/combos" : kind}/${item.id}`,
        undefined,
        {},
        "DELETE",
      );
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
        {(kind !== "combos" || comboEditing) && (
          <CatalogEditor
            modal={kind === "combos"}
            onClose={() => setComboEditing(false)}
          >
            <p className="nova-kicker">BIỂU MẪU DANH MỤC</p>
            <h3>
              {editId ? "Chỉnh sửa" : "Tạo mới"}{" "}
              {specs[kind].label.toLowerCase()}
            </h3>
            <form className="live-admin-form" onSubmit={save}>
              {specs[kind].fields.map(([key, label, type = "text"]) => {
                const choices = Array.isArray(type)
                  ? type.map((v) => ({
                      id: v,
                      name:
                        key === "tasteTag"
                          ? comboTasteLabel({ tasteTag: v })
                          : key === "badgeLabel"
                            ? {
                                SOLO: "1 vé - Solo",
                                COUPLE: "2 vé - Couple",
                                PARTY: ">= 3 vé - Party",
                              }[v]
                            : v,
                    }))
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
                        type={key === "posterUrl" ? "text" : type}
                        value={draft[key] || ""}
                        min={type === "number" ? 1 : undefined}
                        required={
                          !editId &&
                          ![
                            "posterUrl",
                            "trailerUrl",
                            "suggestedMaxSeats",
                          ].includes(key)
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
                {kind === "combos"
                  ? "Lưu bắp nước"
                  : `Lưu ${specs[kind].label.toLowerCase()}`}
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
          </CatalogEditor>
        )}
        <section className="admin-list-panel">
          {kind === "combos" && (
            <button
              className="button button-primary"
              onClick={() => {
                setDraft({
                  isActive: "true",
                  tasteTag: "NGỌT",
                  badgeLabel: "SOLO",
                  suggestedMinSeats: 1,
                  suggestedMaxSeats: 1,
                });
                setEditId(null);
                setComboEditing(true);
              }}
            >
              Thêm mới Combo
            </button>
          )}
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
                      {kind === "combos" && (
                        <p>
                          {item.price} VND · {item.tasteTag} · {item.badgeLabel}{" "}
                          · {item.suggestedMinSeats}–
                          {item.suggestedMaxSeats ?? "nhiều"} vé ·{" "}
                          {item.isActive ? "Đang mở bán" : "Tạm ẩn"}
                        </p>
                      )}
                    </td>
                    <td>
                      {{
                        COMING_SOON: "Sắp chiếu",
                        NOW_SHOWING: "Đang chiếu",
                        ENDED: "Ngừng chiếu",
                        ACTIVE: "Đang mở",
                        LOCKED: "Tạm khóa",
                        CANCELED: "Đã hủy",
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
                        {kind === "showtimes" ? "✏️ Sửa suất chiếu" : "Sửa"}
                      </button>
                      {kind === "combos" && (
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await readCommand(
                                `/admin/combos/${item.id}/status`,
                                { isActive: !item.isActive },
                                {},
                                "PATCH",
                              );
                              publishComboUpdate();
                              setRevision((v) => v + 1);
                              await catalog.reload();
                            } catch (e) {
                              setMessage(e.message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {item.isActive ? "Ẩn combo" : "Hiện combo"}
                        </button>
                      )}
                      {kind === "showtimes" && (
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await readCommand(
                                `/admin/showtimes/${item.id}/status`,
                                {
                                  status:
                                    item.status === "ACTIVE"
                                      ? "LOCKED"
                                      : "ACTIVE",
                                },
                                {},
                                "PATCH",
                              );
                              setRevision((value) => value + 1);
                              await catalog.reload();
                            } catch (error) {
                              setMessage(error.message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {item.status === "ACTIVE"
                            ? "🔒 Khóa / Hủy suất chiếu"
                            : "🔓 Mở lại suất chiếu"}
                        </button>
                      )}
                      {
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => remove(item)}
                        >
                          {kind === "combos" ? "Xóa combo" : "Xóa"}
                        </button>
                      }
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

function CatalogEditor({ modal, onClose, children }) {
  return modal ? (
    <Modal title="Quản trị combo" onClose={onClose}>
      {children}
    </Modal>
  ) : (
    <section className="admin-editor-panel">{children}</section>
  );
}
