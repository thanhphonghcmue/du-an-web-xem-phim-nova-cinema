import { useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { read } from "@/api/client.js";
const actions = { CREATE: "Thêm phim", UPDATE: "Sửa phim", DELETE: "Xóa phim" };
const fields = {
  title: "Tên phim",
  description: "Nội dung",
  status: "Trạng thái",
  durationMinutes: "Thời lượng",
  releaseDate: "Ngày phát hành",
  posterUrl: "Poster",
  trailerUrl: "Trailer",
};
export default function AdminAudit() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      page,
      limit: 20,
      ...(action ? { action } : {}),
    });
    read(`/admin/audit-logs?${params}`)
      .then((data) => {
        if (active) {
          setResult(data);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [action, page, revision]);
  return (
    <section className="admin-audit">
      <div className="workspace-heading">
        <div>
          <p className="nova-kicker">LỊCH SỬ THAO TÁC PHIM</p>
          <h2>
            <History size={26} /> Nhật ký quản trị
          </h2>
          <p>Đối chiếu ai đã thay đổi danh mục, lúc nào và nội dung nào.</p>
        </div>
        <button
          className="button button-glass"
          onClick={() => {
            setResult(null);
            setRevision((v) => v + 1);
          }}
        >
          <RefreshCw size={17} /> Làm mới nhật ký
        </button>
      </div>
      <div className="workspace-toolbar">
        <label>
          Thao tác
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
              setResult(null);
            }}
          >
            <option value="">Tất cả thao tác</option>
            {Object.entries(actions).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <span>
          {result ? `${result.meta.total} bản ghi` : "Đang tải nhật ký…"}
        </span>
      </div>
      {error && (
        <p role="alert" className="workspace-error">
          {error}
        </p>
      )}
      {!error && result?.items.length === 0 && (
        <div className="workspace-empty">
          <History size={32} />
          <h3>Chưa có thao tác được ghi nhận</h3>
          <p>Các lần thêm, sửa, xóa phim thành công sẽ xuất hiện ở đây.</p>
        </div>
      )}
      {!error &&
        result?.items.map((log) => {
          const before = log.changes.before || {},
            after = log.changes.after || {};
          const keys = Object.keys({ ...before, ...after }).filter(
            (key) => before[key] !== after[key],
          );
          return (
            <article className="audit-entry" key={log.id}>
              <span
                className={`audit-action audit-${log.action.toLowerCase()}`}
              >
                {actions[log.action]}
              </span>
              <div>
                <h3>{log.summary}</h3>
                <p>
                  {new Date(log.createdAt).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}{" "}
                  · Giờ Việt Nam
                </p>
                <small>
                  Quản trị viên: <code>{log.actorId}</code>
                </small>
                <details>
                  <summary>Xem {keys.length} nội dung thay đổi</summary>
                  <dl>
                    {keys.map((key) => (
                      <div key={key}>
                        <dt>{fields[key] || key}</dt>
                        <dd>
                          {log.action !== "CREATE" && (
                            <span>
                              Trước: {String(before[key] ?? "Chưa có")}
                            </span>
                          )}
                          {log.action !== "DELETE" && (
                            <span>Sau: {String(after[key] ?? "Chưa có")}</span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </div>
            </article>
          );
        })}
      <div className="workspace-pagination">
        <button
          className="button button-glass"
          disabled={page <= 1 || !result}
          onClick={() => {
            setPage((v) => v - 1);
            setResult(null);
          }}
        >
          Trang trước
        </button>
        <span>
          Trang {page} / {Math.max(1, result?.meta.totalPages || page)}
        </span>
        <button
          className="button button-glass"
          disabled={!result || page >= result.meta.totalPages}
          onClick={() => {
            setPage((v) => v + 1);
            setResult(null);
          }}
        >
          Trang sau
        </button>
      </div>
    </section>
  );
}
