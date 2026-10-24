// QuanTriHeThong: mã nguồn chức năng, dùng chung cho mọi trang.
/**
 * ==============================================================================
 * TỆP TIN: src/components/AdminDashboard.jsx
 * CHÚ Ý: Tệp này đã được chuẩn hóa tên theo chức năng tiếng Việt:
 *   👉 Vui lòng xem và chỉnh sửa tại: src/components/QuanTriHeThong.jsx
 * ==============================================================================
 */

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Ticket,
  Users,
  Film,
  Building,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
  Crown,
  X,
  DollarSign,
  PieChart,
  HardDrive,
  Download,
  ShieldCheck,
} from "lucide-react";
import { money } from "../data.js";

function revenueShare(value, ticketAmount, comboAmount) {
  const cents = (amount) => {
    const match = String(amount || "0").match(/^(\d+)(?:\.(\d{1,2}))?$/);
    return match
      ? BigInt(match[1]) * 100n + BigInt((match[2] || "").padEnd(2, "0"))
      : 0n;
  };
  const total = cents(ticketAmount) + cents(comboAmount);
  return total > 0n
    ? Math.min(100, Number((cents(value) * 10000n) / total) / 100) + "%"
    : "0%";
}
import AdminAudit from "./AdminAudit.jsx";
import OperationalCatalog from "./OperationalCatalog.jsx";
import {
  apiGetAdminOverview,
  apiGetAdminRevenue,
  apiGetAdminUsers,
  apiPurgeOutbox,
  apiGetHealth,
} from "../api/client.js";

function getVietnamDate(offsetDays = 0) {
  const target = new Date(Date.now() + offsetDays * 86400000);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(target);
}

export default function QuanTriHeThong({
  onClose,
  adminUser,
  embedded = false,
}) {
  const [activeTab, setActiveTab] = useState("revenue"); // revenue | users | catalog | maintenance
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Overview metrics
  const [overview, setOverview] = useState(null);

  // Revenue state - using Vietnam local timezone (ICT, UTC+7)
  const [fromDate, setFromDate] = useState(() => getVietnamDate(-7));
  const [toDate, setToDate] = useState(() => getVietnamDate(0));
  const [revenue, setRevenue] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);

  // Users state
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState("");
  const [usersUpdatedAt, setUsersUpdatedAt] = useState(null);
  useEffect(() => {
    if (activeTab !== "users") return;
    let active = true;
    let running = false;
    async function syncUsers() {
      if (running || document.hidden) return;
      running = true;
      try {
        const current = await apiGetAdminUsers();
        if (active) {
          setUsers(current);
          setUsersUpdatedAt(new Date());
          setError("");
        }
      } catch (cause) {
        if (active) {
          setUsers([]);
          setError(cause.message);
        }
      } finally {
        running = false;
      }
    }
    void syncUsers();
    const timer = setInterval(syncUsers, 15000);
    window.addEventListener("focus", syncUsers);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", syncUsers);
    };
  }, [activeTab]);

  // Health state
  const [health, setHealth] = useState(null);
  const [purgeDays, setPurgeDays] = useState(7);
  const [purgeResult, setPurgeResult] = useState(null);
  const [purging, setPurging] = useState(false);

  const fetchRevenue = useCallback(async (from, to) => {
    setRevenueLoading(true);
    try {
      const rev = await apiGetAdminRevenue(from, to);
      setRevenue(rev);
    } catch (err) {
      setRevenue(null);
      setError(err.message);
    } finally {
      setRevenueLoading(false);
    }
  }, []);

  const applyDatePreset = (days) => {
    let from, to;
    if (days === 0) {
      from = getVietnamDate(0);
      to = getVietnamDate(0);
    } else if (days === -1) {
      from = "2024-01-01";
      to = getVietnamDate(0);
    } else {
      from = getVietnamDate(-days);
      to = getVietnamDate(0);
    }
    setFromDate(from);
    setToDate(to);
    fetchRevenue(from, to);
  };

  const loadAllData = useCallback(async () => {
    setError("");
    setRevenueLoading(true);
    try {
      const [ovData, healthData, usersData] = await Promise.allSettled([
        apiGetAdminOverview(),
        apiGetHealth(),
        apiGetAdminUsers(),
      ]);

      setOverview(null);
      setHealth(null);
      setUsers([]);
      const failures = [ovData, healthData, usersData].filter(
        (r) => r.status === "rejected",
      );
      if (failures.length)
        setError(failures.map((r) => r.reason.message).join(" · "));
      if (ovData.status === "fulfilled") setOverview(ovData.value);
      if (healthData.status === "fulfilled") setHealth(healthData.value);
      if (usersData.status === "fulfilled") setUsers(usersData.value);

      await fetchRevenue(fromDate, toDate);
    } catch (err) {
      setError(err.message || "Lỗi khi tải dữ liệu trang quản trị");
    } finally {
      setLoading(false);
      setRevenueLoading(false);
    }
  }, [fetchRevenue, fromDate, toDate]);

  // Load initial data
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiGetAdminOverview(),
      apiGetHealth(),
      apiGetAdminUsers(),
      apiGetAdminRevenue(fromDate, toDate),
    ]).then(([ovRes, healthRes, usersRes, revRes]) => {
      if (!active) return;
      setOverview(null);
      setHealth(null);
      setUsers([]);
      setRevenue(null);
      const failures = [ovRes, healthRes, usersRes, revRes].filter(
        (r) => r.status === "rejected",
      );
      setError(failures.map((r) => r.reason.message).join(" · "));
      if (ovRes.status === "fulfilled") setOverview(ovRes.value);
      if (healthRes.status === "fulfilled") setHealth(healthRes.value);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value);
      if (revRes.status === "fulfilled") setRevenue(revRes.value);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fromDate, toDate]);

  function exportRevenueCsv() {
    if (!revenue) return;
    const lines = [];
    lines.push("NOVA CINEMA - BÁO CÁO DOANH THU & KẾT QUẢ KINH DOANH");
    lines.push(`Thời gian xuất báo cáo,${new Date().toLocaleString("vi-VN")}`);
    lines.push(`Khoảng thời gian thống kê,Từ ${fromDate} đến ${toDate}`);
    lines.push("");
    lines.push("TỔNG QUAN TÀI CHÍNH");
    lines.push("Chỉ số,Giá trị");
    lines.push(
      `Tổng doanh thu ròng (Net Revenue),${revenue.totalRevenue || 0} VNĐ`,
    );
    lines.push(
      `Số đơn thanh toán thành công (PAID),${revenue.paidBookingCount || 0}`,
    );
    lines.push(`Doanh thu vé xem phim,${revenue.ticketRevenue || 0} VNĐ`);
    lines.push(`Doanh thu bắp nước F&B,${revenue.comboRevenue || 0} VNĐ`);
    lines.push(`Tổng tiền ưu đãi & Voucher,${revenue.discountAmount || 0} VNĐ`);
    lines.push("");
    lines.push("CHI TIẾT CÁC ĐƠN ĐẶT VÉ TRONG KỲ");
    lines.push(
      "Mã Đơn,Khách Hàng,Phim,Rạp Chiếu,Phòng Chiếu,Tổng Tiền (VNĐ),Trạng Thái,Thời Gian Đặt Vé",
    );

    const orders = overview?.recentBookings || [];
    for (const b of orders) {
      const row = [
        `"${b.orderCode}"`,
        `"${b.customer}"`,
        `"${b.movie}"`,
        `"${b.cinema}"`,
        `"${b.room}"`,
        b.finalAmount,
        `"${b.status}"`,
        `"${new Date(b.createdAt).toLocaleString("vi-VN")}"`,
      ];
      lines.push(row.join(","));
    }

    const csvContent = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bao_Cao_Doanh_Thu_NovaCinema_${fromDate}_${toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handlePurgeOutbox() {
    setPurging(true);
    setPurgeResult(null);
    try {
      const res = await apiPurgeOutbox(Number(purgeDays));
      setPurgeResult(
        `Đã dọn dẹp thành công ${res.purgedCount} bản ghi sự kiện Outbox cũ hơn ${purgeDays} ngày!`,
      );
    } catch (err) {
      setPurgeResult(`Lỗi dọn dẹp: ${err.message}`);
    } finally {
      setPurging(false);
    }
  }

  return (
    <div
      className={
        embedded
          ? "admin-portal-overlay admin-embedded"
          : "admin-portal-overlay"
      }
    >
      <div className="admin-portal-modal">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-title-area">
            <div className="admin-badge">
              <Crown size={18} />
              <span>NOVA OPERATIONS</span>
            </div>
            <h2>Không gian quản trị NOVA</h2>
            <p className="admin-subtitle">
              Đăng nhập bởi: <b>{adminUser?.email || "admin@nova.local"}</b> ·
              Tổng quan vận hành · Danh mục · Thành viên
            </p>
          </div>
          <div className="admin-actions">
            <button
              className="button button-outline"
              onClick={loadAllData}
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={16} className={loading ? "spin" : ""} />
              Làm mới
            </button>
            <button
              className="icon-button"
              onClick={onClose}
              title="Đóng trang quản trị"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === "revenue" ? "active" : ""}`}
            onClick={() => setActiveTab("revenue")}
          >
            <TrendingUp size={16} />
            Doanh Thu & Thống Kê
          </button>
          <button
            className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <Users size={16} />
            Khách Hàng & Thành Viên ({users.length})
          </button>
          <button
            className={`admin-tab ${activeTab === "catalog" ? "active" : ""}`}
            onClick={() => setActiveTab("catalog")}
          >
            <Film size={16} />
            Rạp, Phim & Suất Chiếu
          </button>
          <button
            className={`admin-tab ${activeTab === "maintenance" ? "active" : ""}`}
            onClick={() => setActiveTab("maintenance")}
          >
            <HardDrive size={16} />
            Hạ Tầng & Dọn Dẹp Outbox
          </button>
          <button
            className={`admin-tab ${activeTab === "audit" ? "active" : ""}`}
            onClick={() => setActiveTab("audit")}
          >
            <ShieldCheck size={16} />
            Nhật ký quản trị
          </button>
        </div>

        {error && <div className="admin-error-banner">{error}</div>}

        {/* Content Body */}
        <div className="admin-content-body">
          {activeTab === "audit" && <AdminAudit />}
          {/* TAB 1: DOANH THU & BÁO CÁO */}
          {activeTab === "revenue" && (
            <div className="admin-tab-pane">
              {/* Date Filter & Presets */}
              <div className="admin-filter-bar">
                <div className="filter-group">
                  <Calendar size={16} />
                  <label>Từ ngày:</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <Calendar size={16} />
                  <label>Đến ngày:</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
                <button
                  className="button button-primary"
                  onClick={() => fetchRevenue(fromDate, toDate)}
                  disabled={revenueLoading}
                >
                  {revenueLoading ? "Đang lọc..." : "Áp dụng lọc"}
                </button>

                <div className="filter-presets">
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyDatePreset(0)}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyDatePreset(7)}
                  >
                    7 ngày qua
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyDatePreset(30)}
                  >
                    30 ngày qua
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyDatePreset(-1)}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    className="preset-btn refresh"
                    onClick={loadAllData}
                    title="Làm mới số liệu"
                  >
                    <RefreshCw
                      size={14}
                      className={revenueLoading ? "spin" : ""}
                    />
                    <span>Cập nhật báo cáo</span>
                  </button>

                  <button
                    type="button"
                    className="button button-primary export-csv-btn"
                    onClick={exportRevenueCsv}
                    disabled={!revenue}
                    title="Tải xuống tệp CSV Excel có dấu UTF-8"
                  >
                    <Download size={15} />
                    <span>Xuất CSV (Excel)</span>
                  </button>
                </div>
              </div>

              {/* Stat Cards Grid */}
              <div className="admin-stats-grid">
                <div className="stat-card highlight">
                  <div className="stat-icon">
                    <DollarSign size={24} />
                  </div>
                  <div className="stat-details">
                    <span className="stat-label">Doanh Thu Ròng (VND)</span>
                    <strong className="stat-value">
                      {revenue ? money(revenue.netRevenue) : "0 đ"}
                    </strong>
                    <span className="stat-sub">
                      Đã trừ chiết khấu & voucher
                    </span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <Ticket size={24} />
                  </div>
                  <div className="stat-details">
                    <span className="stat-label">Số Vé Đã Bán</span>
                    <strong className="stat-value">
                      {revenue?.ticketCount || 0} vé
                    </strong>
                    <span className="stat-sub">
                      Doanh thu vé:{" "}
                      {revenue ? money(revenue.ticketRevenue) : "0 đ"}
                    </span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <Layers size={24} />
                  </div>
                  <div className="stat-details">
                    <span className="stat-label">Đơn Hàng Thanh Toán</span>
                    <strong className="stat-value">
                      {revenue?.paidBookingCount || 0} đơn
                    </strong>
                    <span className="stat-sub">Đã thanh toán (PAID)</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <PieChart size={24} />
                  </div>
                  <div className="stat-details">
                    <span className="stat-label">Doanh Thu Bắp Nước</span>
                    <strong className="stat-value">
                      {revenue ? money(revenue.comboRevenue) : "0 đ"}
                    </strong>
                    <span className="stat-sub">Các gói Party/Duo Combo</span>
                  </div>
                </div>
              </div>

              {/* Visual Breakdown */}
              <div className="admin-box mt-4">
                <h3>Phân Tích Cấu Trúc Dòng Tiền (Financial Snapshot)</h3>
                <div className="revenue-bars-container">
                  <div className="rev-bar-row">
                    <span>Tiền vé rạp (Gross Ticket):</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill blue"
                        style={{
                          width: revenueShare(
                            revenue?.ticketRevenue,
                            revenue?.ticketRevenue,
                            revenue?.comboRevenue,
                          ),
                        }}
                      />
                    </div>
                    <strong>
                      {revenue ? money(revenue.ticketRevenue) : "0 đ"}
                    </strong>
                  </div>

                  <div className="rev-bar-row">
                    <span>Bắp nước F&B:</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill gold"
                        style={{
                          width: revenueShare(
                            revenue?.comboRevenue,
                            revenue?.ticketRevenue,
                            revenue?.comboRevenue,
                          ),
                        }}
                      />
                    </div>
                    <strong>
                      {revenue ? money(revenue.comboRevenue) : "0 đ"}
                    </strong>
                  </div>

                  <div className="rev-bar-row">
                    <span>Ưu đãi thành viên & Voucher:</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill green"
                        style={{
                          width: revenueShare(
                            revenue?.discountAmount,
                            revenue?.ticketRevenue,
                            revenue?.comboRevenue,
                          ),
                        }}
                      />
                    </div>
                    <strong>
                      -{revenue ? money(revenue.discountAmount) : "0 đ"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Detailed Orders in Revenue Tab */}
              <div className="admin-box mt-4">
                <div className="admin-box-header">
                  <div>
                    <h3>Chi Tiết Đơn Đặt Vé & Doanh Thu Hệ Thống</h3>
                    <p className="admin-box-sub">
                      Dữ liệu thực tế ghi nhận từ PostgreSQL & NestJS API.
                    </p>
                  </div>
                  <span className="badge-note">
                    💡 Chỉ đơn <strong>Đã thanh toán (PAID)</strong> mới được
                    tính vào tổng doanh thu
                  </span>
                </div>

                {overview?.recentBookings &&
                overview.recentBookings.length > 0 ? (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Mã Đơn</th>
                          <th>Khách Hàng</th>
                          <th>Phim</th>
                          <th>Rạp / Phòng</th>
                          <th>Tổng Tiền</th>
                          <th>Thời Gian Đặt</th>
                          <th>Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.recentBookings.map((b) => (
                          <tr key={b.id}>
                            <td>
                              <code>{b.orderCode}</code>
                            </td>
                            <td>
                              <strong>{b.customer}</strong>
                            </td>
                            <td>{b.movie}</td>
                            <td>
                              {b.cinema} · {b.room}
                            </td>
                            <td>
                              <strong
                                style={{
                                  color:
                                    b.status === "PAID" ? "#4ade80" : "#94a3b8",
                                  fontSize: "14px",
                                }}
                              >
                                {money(b.finalAmount)}
                              </strong>
                            </td>
                            <td
                              style={{ fontSize: "12.5px", color: "#94a3b8" }}
                            >
                              {new Date(b.createdAt).toLocaleString("vi-VN")}
                            </td>
                            <td>
                              <span
                                className={`status-badge ${b.status.toLowerCase()}`}
                              >
                                {b.status === "PAID"
                                  ? "✅ Đã thanh toán (PAID)"
                                  : b.status === "HOLDING"
                                    ? "⏳ Đang giữ chỗ"
                                    : b.status === "EXPIRED"
                                      ? "⏱️ Hết hạn 5 phút"
                                      : b.status === "CANCELLED"
                                        ? "❌ Đã hủy"
                                        : b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="admin-empty">
                    Chưa có đơn đặt vé nào được tạo.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: KHÁCH HÀNG & THÀNH VIÊN */}
          {activeTab === "users" && (
            <div className="admin-tab-pane">
              <div className="admin-users-toolbar">
                <label>
                  Tìm khách hàng
                  <input
                    aria-label="Tìm khách hàng"
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                    placeholder="Email hoặc họ tên"
                  />
                </label>
                <p role="status">
                  {usersUpdatedAt
                    ? `Cập nhật lúc ${usersUpdatedAt.toLocaleTimeString("vi-VN")}`
                    : "Đang đồng bộ danh sách khách hàng…"}
                </p>
              </div>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Họ và Tên</th>
                      <th>Vai Trò (Role)</th>
                      <th>Hạng Thành Viên</th>
                      <th>Điểm Tích Lũy</th>
                      <th>Ngày Đăng Ký</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter((user) =>
                        `${user.email} ${user.fullName || ""}`
                          .toLocaleLowerCase("vi")
                          .includes(userQuery.toLocaleLowerCase("vi")),
                      )
                      .map((u) => (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.email}</strong>
                          </td>
                          <td>{u.fullName || "Chưa cập nhật"}</td>
                          <td>
                            <span
                              className={`role-badge ${u.role.toLowerCase()}`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`tier-badge ${u.cMemberTier?.toLowerCase()}`}
                            >
                              {u.cMemberTier || "STANDARD"}
                            </span>
                          </td>
                          <td>
                            <strong>{u.cMemberPoints || 0} pts</strong>
                          </td>
                          <td>
                            {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                          </td>
                        </tr>
                      ))}
                    {users.filter((user) =>
                      `${user.email} ${user.fullName || ""}`
                        .toLocaleLowerCase("vi")
                        .includes(userQuery.toLocaleLowerCase("vi")),
                    ).length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ textAlign: "center", padding: "20px" }}
                        >
                          {error
                            ? "Chưa tải được danh sách. Hãy làm mới để thử lại."
                            : "Chưa có khách hàng phù hợp."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DANH MỤC & RẠP CHIẾU */}
          {activeTab === "catalog" && (
            <div className="admin-tab-pane">
              <OperationalCatalog />
              <div className="catalog-summary-cards">
                <div className="mini-card">
                  <Film size={20} />
                  <span>Tổng Phim:</span>
                  <strong>{overview?.movieCount ?? "—"} phim</strong>
                </div>
                <div className="mini-card">
                  <Building size={20} />
                  <span>Cụm Rạp:</span>
                  <strong>{overview?.cinemaCount ?? "—"} cụm rạp</strong>
                </div>
                <div className="mini-card">
                  <Layers size={20} />
                  <span>Phòng Chiếu:</span>
                  <strong>{overview?.roomCount ?? "—"} phòng</strong>
                </div>
                <div className="mini-card">
                  <Calendar size={20} />
                  <span>Suất Chiếu Đã Lên Lịch:</span>
                  <strong>{overview?.showtimeCount ?? "—"} suất</strong>
                </div>
              </div>

              <div className="admin-box mt-4">
                <h3>Đơn Đặt Vé Gần Đây (Recent Orders)</h3>
                {overview?.recentBookings &&
                overview.recentBookings.length > 0 ? (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Mã Đơn</th>
                        <th>Khách Hàng</th>
                        <th>Phim</th>
                        <th>Rạp / Phòng</th>
                        <th>Tổng Tiền</th>
                        <th>Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.recentBookings.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <code>{b.orderCode}</code>
                          </td>
                          <td>{b.customer}</td>
                          <td>{b.movie}</td>
                          <td>
                            {b.cinema} - {b.room}
                          </td>
                          <td>
                            <strong>{money(b.finalAmount)}</strong>
                          </td>
                          <td>
                            <span
                              className={`status-badge ${b.status.toLowerCase()}`}
                            >
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="muted" style={{ padding: "16px 0" }}>
                    Chưa có đơn đặt vé nào phát sinh trong hôm nay.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: BẢO TRÌ HỆ THỐNG & OUTBOX */}
          {activeTab === "maintenance" && (
            <div className="admin-tab-pane">
              <div className="admin-box">
                <h3>Trạng Thái Hệ Thống (Infrastructure Health)</h3>
                <div className="health-grid">
                  <div className="health-card">
                    <CheckCircle2 size={24} className="text-green" />
                    <div>
                      <strong>PostgreSQL 17 Database</strong>
                      <p>
                        Trạng thái:{" "}
                        {health?.checks?.postgres?.status?.toUpperCase() ||
                          "UNKNOWN"}
                      </p>
                    </div>
                  </div>

                  <div className="health-card">
                    <CheckCircle2 size={24} className="text-green" />
                    <div>
                      <strong>Redis 7.4 In-Memory</strong>
                      <p>
                        Trạng thái:{" "}
                        {health?.checks?.redis?.status?.toUpperCase() ||
                          "UNKNOWN"}
                      </p>
                    </div>
                  </div>

                  <div className="health-card">
                    <CheckCircle2 size={24} className="text-green" />
                    <div>
                      <strong>BullMQ Distributed Queues</strong>
                      <p>
                        Trạng thái:{" "}
                        {health?.checks?.queue?.status?.toUpperCase() ||
                          "UNKNOWN"}
                      </p>
                    </div>
                  </div>

                  <div className="health-card">
                    <CheckCircle2 size={24} className="text-green" />
                    <div>
                      <strong>Realtime WebSocket Bus</strong>
                      <p>
                        Trạng thái:{" "}
                        {health?.checks?.realtime?.status?.toUpperCase() ||
                          "UNKNOWN"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outbox Cleanup */}
              <div className="admin-box mt-4">
                <div className="purge-box-header">
                  <Trash2 size={22} className="text-gold" />
                  <div>
                    <h3>Dọn Dẹp Bảng Outbox (Khắc Phục Table Bloating)</h3>
                    <p className="muted">
                      Xóa các sự kiện vé và giữ chỗ đã xử lý hoàn tất (
                      <code>processedAt != null</code>) để tối ưu tốc độ truy
                      vấn cơ sở dữ liệu.
                    </p>
                  </div>
                </div>

                <div className="purge-action-row">
                  <label>Xóa sự kiện đã xử lý cũ hơn:</label>
                  <select
                    value={purgeDays}
                    onChange={(e) => setPurgeDays(Number(e.target.value))}
                  >
                    <option value={0}>Tất cả sự kiện đã xử lý (0 ngày)</option>
                    <option value={1}>Cũ hơn 1 ngày</option>
                    <option value={7}>Cũ hơn 7 ngày</option>
                    <option value={30}>Cũ hơn 30 ngày</option>
                  </select>

                  <button
                    className="button button-primary"
                    onClick={handlePurgeOutbox}
                    disabled={purging}
                  >
                    {purging ? "Đang dọn dẹp..." : "Dọn Dẹp Ngay"}
                  </button>
                </div>

                {purgeResult && (
                  <div className="purge-result-banner">{purgeResult}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
