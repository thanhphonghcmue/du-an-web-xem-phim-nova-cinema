// DangNhap_DangKy: mã nguồn chức năng, dùng chung cho mọi trang.
/**
 * ==============================================================================
 * TỆP TIN: src/components/AuthForm.jsx
 * CHÚ Ý: Tệp này đã được chuẩn hóa tên theo chức năng tiếng Việt:
 *   👉 Vui lòng xem và chỉnh sửa tại: src/components/DangNhap_DangKy.jsx
 * ==============================================================================
 */

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useCatalog } from "../catalog.js";
import { useI18n } from "../i18n.js";
import { apiLogin, apiRegister } from "../api/client.js";

export default function DangNhap_DangKy({ onSuccess }) {
  const { runtimeMode } = useCatalog();
  const { language, t } = useI18n();
  const [tab, setTab] = useState("signin");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [touched, setTouched] = useState({});
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("error"); // "error" | "info"

  const error = {
    phone:
      fields.phone && !/^0[0-9]{9}$/.test(fields.phone)
        ? "Số điện thoại cần 10 chữ số, bắt đầu bằng 0."
        : "",
    name:
      fields.name.trim().length < 2
        ? language === "en"
          ? "Enter at least 2 characters."
          : "Tên cần ít nhất 2 ký tự."
        : "",
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)
      ? language === "en"
        ? "Enter a valid email address."
        : "Nhập email đúng định dạng."
      : "",
    password:
      fields.password.length < (tab === "signup" ? 12 : 1)
        ? language === "en"
          ? "Use at least 12 characters."
          : "Mật khẩu cần ít nhất 12 ký tự."
        : "",
    confirm:
      fields.confirm !== fields.password
        ? language === "en"
          ? "Passwords do not match."
          : "Mật khẩu xác nhận chưa khớp."
        : " ",
  };

  function translateNotice(raw) {
    if (!raw) return "";
    if (
      raw.includes("Email or password is incorrect") ||
      raw.includes("INVALID_CREDENTIALS")
    ) {
      return "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.";
    }
    if (raw.includes("already registered") || raw.includes("exists")) {
      return "Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.";
    }
    if (raw.includes("Password must be at least 12")) {
      return "Mật khẩu cần tối thiểu 12 ký tự.";
    }
    return raw;
  }

  function handleQuickFill(email, roleName) {
    setTab("signin");
    setFields((prev) => ({
      ...prev,
      email,
      password: "nova@12345",
    }));
    setTouched((prev) => ({ ...prev, email: true, password: true }));
    setNoticeType("info");
    setNotice(`Đã chọn ${roleName} (${email}) - Mật khẩu: nova@12345`);
  }

  async function submit(e) {
    e.preventDefault();
    setTouched({
      phone: true,
      name: true,
      email: true,
      password: true,
      confirm: true,
    });
    setNotice("");

    if (
      error.email ||
      error.password ||
      (tab === "signup" && (error.name || error.phone || error.confirm.trim()))
    )
      return;

    setLoading(true);
    try {
      if (tab === "signin") {
        const data = await apiLogin(fields.email, fields.password, remember);
        const user = data.user;
        const member = {
          id: user.id,
          name: user.fullName || user.email.split("@")[0],
          email: user.email,
          role: user.role, // 'ADMIN' | 'STAFF' | 'CUSTOMER'
          tier: user.cMemberTier || "SILVER",
          points: user.cMemberPoints || 0,
        };
        onSuccess(member);
      } else {
        const data = await apiRegister(
          fields.email,
          fields.password,
          fields.name.trim(),
          fields.phone || undefined,
          remember,
        );
        const user = data.user;
        const member = {
          id: user.id,
          name: user.fullName || fields.name.trim(),
          email: user.email,
          role: user.role || "CUSTOMER",
          tier: user.cMemberTier || "SILVER",
          points: user.cMemberPoints || 0,
        };
        onSuccess(member);
      }
    } catch (err) {
      setNoticeType("error");
      setNotice(
        err.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      {/* Left Banner: VIP Club & Benefits */}
      <div className="auth-reward">
        <Crown size={34} />
        <span>C’MEMBER / INFINITY CLUB</span>
        <h3>{t("Điện ảnh, dành riêng cho bạn.")}</h3>
        <div className="auth-perk">
          <Sparkle />
          <strong>
            5<span>%</span>
          </strong>
          <p>
            {t("Ưu đãi theo hạng thành viên")}
            <small>{t("Ưu đãi chào bạn mới")}</small>
          </p>
        </div>
        <ul>
          <li>
            <Check size={15} />
            {t("Tích điểm mỗi vé")}
          </li>
          <li>
            <Check size={15} />
            {t("Lưu vé trong tài khoản")}
          </li>
          <li>
            <Check size={15} />
            {t("Xem lịch sử đặt vé")}
          </li>
        </ul>
      </div>

      {/* Right Column: Form */}
      <div className="auth-main">
        {/* Navigation Tabs */}
        <div className="auth-tabs" role="tablist" aria-label="Authentication">
          {[
            ["signin", "Đăng nhập"],
            ["signup", "Đăng ký thành viên"],
          ].map(([id, label]) => (
            <button
              role="tab"
              aria-selected={tab === id}
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => {
                setTab(id);
                setNotice("");
              }}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {/* Cinema Operational Accounts (in Sign-in tab) */}
        {tab === "signin" && runtimeMode === "standalone" && (
          <div className="auth-quick-accounts">
            <div className="auth-quick-header">
              <span>
                <Sparkles
                  size={14}
                  style={{ display: "inline", marginRight: 5 }}
                />
                Tài khoản nghiệp vụ rạp chiếu phim (Mật khẩu: nova@12345):
              </span>
            </div>
            <div className="auth-quick-pills">
              <button
                type="button"
                className="auth-quick-pill admin"
                onClick={() =>
                  handleQuickFill("admin@nova.local", "Quản trị viên")
                }
                title="admin@nova.local"
              >
                👑 Quản trị viên
              </button>
              <button
                type="button"
                className="auth-quick-pill staff"
                onClick={() =>
                  handleQuickFill("staff@nova.local", "Nhân viên soát vé")
                }
                title="staff@nova.local"
              >
                🎫 Nhân viên soát vé
              </button>
              <button
                type="button"
                className="auth-quick-pill customer"
                onClick={() =>
                  handleQuickFill("customer@nova.local", "Người dùng")
                }
                title="customer@nova.local"
              >
                👤 Người dùng
              </button>
            </div>
          </div>
        )}

        {/* Main Authentication Form */}
        <form onSubmit={submit} noValidate className="auth-form">
          {[
            tab === "signup" && ["name", "Họ và tên", "text", "Nguyễn Văn A"],
            ["email", "Email", "email", "example@nova.local"],
            tab === "signup" && [
              "phone",
              "Số điện thoại (không bắt buộc)",
              "tel",
              "0901234567",
            ],
            ["password", "Mật khẩu", "password", "••••••••"],
            tab === "signup" && [
              "confirm",
              "Xác nhận mật khẩu",
              "password",
              "••••••••",
            ],
          ]
            .filter(Boolean)
            .map(([id, label, type, placeholder]) => (
              <div key={id} className="auth-field-group">
                <div className="auth-field-header">
                  <label htmlFor={`field-${id}`} className="auth-field-label">
                    {t(label)}
                  </label>
                  {id === "password" && tab === "signup" && (
                    <span className="auth-field-hint">Tối thiểu 12 ký tự</span>
                  )}
                </div>

                <div className="auth-input-container">
                  <span className="auth-input-icon">
                    {id === "name" && <UserRound size={17} />}
                    {id === "email" && <Mail size={17} />}
                    {id === "phone" && <Phone size={17} />}
                    {(id === "password" || id === "confirm") && (
                      <Lock size={17} />
                    )}
                  </span>
                  <input
                    id={`field-${id}`}
                    name={id}
                    type={
                      id === "password" || id === "confirm"
                        ? show
                          ? "text"
                          : "password"
                        : type
                    }
                    placeholder={placeholder}
                    value={fields[id]}
                    onChange={(e) =>
                      setFields({ ...fields, [id]: e.target.value })
                    }
                    onBlur={() => setTouched({ ...touched, [id]: true })}
                    autoComplete={
                      id === "name"
                        ? "name"
                        : id === "phone"
                          ? "tel"
                          : id === "email"
                            ? "email"
                            : tab === "signup"
                              ? "new-password"
                              : "current-password"
                    }
                    aria-invalid={Boolean(touched[id] && error[id]?.trim())}
                    aria-describedby={
                      touched[id] && error[id]?.trim()
                        ? `error-${id}`
                        : undefined
                    }
                    className={`auth-text-input ${
                      touched[id] && error[id]?.trim() ? "is-invalid" : ""
                    }`}
                  />
                  {(id === "password" || id === "confirm") && (
                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  )}
                </div>

                {touched[id] && error[id]?.trim() && (
                  <div
                    id={`error-${id}`}
                    className="auth-error-message"
                    role="alert"
                  >
                    <AlertCircle size={14} />
                    <span>{error[id]}</span>
                  </div>
                )}
              </div>
            ))}

          <div className="auth-options">
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>{t("Ghi nhớ đăng nhập")}</span>
            </label>
          </div>

          <button className="auth-submit-btn" type="submit" disabled={loading}>
            <span>
              {loading
                ? "Đang xác thực..."
                : t(tab === "signin" ? "Đăng nhập ngay" : "Tạo tài khoản")}
            </span>
            <ArrowRight size={18} />
          </button>
        </form>

        {notice && (
          <div
            className={`auth-notice-banner ${
              noticeType === "info" ? "success" : ""
            }`}
            role="status"
          >
            {noticeType === "info" ? (
              <CheckCircle2 size={17} />
            ) : (
              <AlertCircle size={17} />
            )}
            <span>{translateNotice(notice)}</span>
          </div>
        )}

        <div className="auth-security-footer">
          <ShieldCheck size={15} />
          <span>Bảo mật mã hóa Argon2id & JWT Token chuẩn NestJS</span>
        </div>
      </div>
    </div>
  );
}

function Sparkle() {
  return (
    <span className="auth-perk-symbol">
      <UserRound size={21} />
      <Mail size={12} />
    </span>
  );
}
