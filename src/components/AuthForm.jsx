import { useState } from "react";
import {
  ArrowRight,
  Check,
  Crown,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  UserRound,
  Zap,
} from "lucide-react";
import { useI18n } from "../i18n.js";
import { apiLogin, apiRegister } from "../api/client.js";

export default function AuthForm({ onSuccess }) {
  const { language, t } = useI18n();
  const [tab, setTab] = useState("signin");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [touched, setTouched] = useState({});
  const [notice, setNotice] = useState("");

  const error = {
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
      fields.password.length < 8
        ? language === "en"
          ? "Use at least 8 characters."
          : "Mật khẩu cần ít nhất 8 ký tự."
        : "",
    confirm:
      fields.confirm !== fields.password
        ? language === "en"
          ? "Passwords do not match."
          : "Mật khẩu xác nhận chưa khớp."
        : " ",
  };

  async function submit(e) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    setNotice("");

    if (
      error.email ||
      error.password ||
      (tab === "signup" && (error.name || error.confirm.trim()))
    )
      return;

    setLoading(true);
    try {
      if (tab === "signin") {
        const data = await apiLogin(fields.email, fields.password);
        const user = data.user;
        const member = {
          id: user.id,
          name: user.fullName || user.email.split("@")[0],
          email: user.email,
          role: user.role, // 'ADMIN' | 'STAFF' | 'CUSTOMER'
          tier: user.cMemberTier || "SILVER",
          points: user.cMemberPoints || 0,
        };
        localStorage.removeItem("nova-member");
        sessionStorage.removeItem("nova-member");
        (remember ? localStorage : sessionStorage).setItem(
          "nova-member",
          JSON.stringify(member),
        );
        onSuccess(member);
      } else {
        const data = await apiRegister(fields.email, fields.password, fields.name.trim());
        const user = data.user;
        const member = {
          id: user.id,
          name: user.fullName || fields.name.trim(),
          email: user.email,
          role: user.role || "CUSTOMER",
          tier: user.cMemberTier || "SILVER",
          points: user.cMemberPoints || 100,
        };
        localStorage.removeItem("nova-member");
        sessionStorage.removeItem("nova-member");
        (remember ? localStorage : sessionStorage).setItem(
          "nova-member",
          JSON.stringify(member),
        );
        onSuccess(member);
      }
    } catch (err) {
      setNotice(err.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  }

  function handleQuickFill(email, roleName) {
    setTab("signin");
    setFields({
      ...fields,
      email,
      password: "Nova@123456",
    });
    setNotice(`Đã điền sẵn tài khoản ${roleName} (Mật khẩu: Nova@123456)`);
  }

  return (
    <div className="auth-layout">
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
            {t("Giảm 5% tiền vé")}
            <small>{t("Ưu đãi chào bạn mới")}</small>
          </p>
        </div>
        <ul>
          <li>
            <Check size={14} />
            {t("Tích điểm mỗi vé")}
          </li>
          <li>
            <Check size={14} />
            {t("Lưu vé trong tài khoản")}
          </li>
          <li>
            <Check size={14} />
            {t("Quyền quản trị số liệu rạp")}
          </li>
        </ul>

        {/* Quick Demo Logins */}
        <div className="quick-login-box">
          <span className="quick-title">
            <Zap size={14} /> Chọn nhanh tài khoản mẫu:
          </span>
          <div className="quick-buttons">
            <button
              type="button"
              className="quick-btn admin"
              onClick={() => handleQuickFill("admin@nova.local", "Quản Trị Admin")}
            >
              👑 Admin
            </button>
            <button
              type="button"
              className="quick-btn staff"
              onClick={() => handleQuickFill("staff@nova.local", "Soát Vé Staff")}
            >
              🎫 Staff
            </button>
            <button
              type="button"
              className="quick-btn customer"
              onClick={() => handleQuickFill("customer@nova.local", "Khách Hàng")}
            >
              👤 Khách Hàng
            </button>
          </div>
        </div>

        <p className="small muted mt-2">
          Kết nối trực tiếp NestJS Backend & PostgreSQL 17 (port 4000).
        </p>
      </div>

      <div className="auth-main">
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

        <form onSubmit={submit} noValidate className="auth-form">
          {[
            tab === "signup" && ["name", "Họ và tên", "text", "Nguyễn Văn A"],
            ["email", "Email", "email", "example@nova.local"],
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
              <div key={id} className="field-block">
                <label htmlFor={`field-${id}`}>{t(label)}</label>
                <input
                  id={`field-${id}`}
                  type={id === "password" || id === "confirm" ? (show ? "text" : "password") : type}
                  placeholder={placeholder}
                  value={fields[id]}
                  onChange={(e) =>
                    setFields({ ...fields, [id]: e.target.value })
                  }
                  onBlur={() => setTouched({ ...touched, [id]: true })}
                  autoComplete={id === "password" ? "current-password" : id}
                  aria-invalid={Boolean(touched[id] && error[id]?.trim())}
                  aria-describedby={
                    touched[id] && error[id]?.trim() ? `error-${id}` : undefined
                  }
                />
                {(id === "password" || id === "confirm") && (
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                )}
                {touched[id] && error[id]?.trim() && (
                  <small id={`error-${id}`} role="alert">
                    {error[id]}
                  </small>
                )}
              </div>
            ))}

          <div className="auth-options">
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              {t("Ghi nhớ đăng nhập")}
            </label>
            <span className="text-gold-light small">
              Mật khẩu mẫu: <b>Nova@123456</b>
            </span>
          </div>

          <button
            className="button button-primary w-full"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Đang xác thực với server..."
              : t(tab === "signin" ? "Đăng nhập ngay" : "Tạo tài khoản")}
            <ArrowRight size={17} />
          </button>
        </form>

        {notice && (
          <p className="auth-notice mt-3" role="status">
            {notice}
          </p>
        )}

        <p className="auth-disclaimer mt-3">
          <ShieldCheck size={13} />
          Bảo mật mã hóa bằng Argon2id & JWT Token chuẩn NestJS.
        </p>
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
