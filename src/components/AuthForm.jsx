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
} from "lucide-react";
import { useI18n } from "../i18n.js";
export default function AuthForm({ onSuccess }) {
  const { language, t } = useI18n();
  const [tab, setTab] = useState("signin"),
    [show, setShow] = useState(false),
    [remember, setRemember] = useState(true),
    [fields, setFields] = useState({
      name: "",
      email: "",
      password: "",
      confirm: "",
    }),
    [touched, setTouched] = useState({}),
    [notice, setNotice] = useState("");
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
  function submit(e) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (
      error.email ||
      error.password ||
      (tab === "signup" && (error.name || error.confirm.trim()))
    )
      return;
    // Chỉ lưu hồ sơ demo. Tuyệt đối không lưu mật khẩu hay giả lập kết nối OAuth thành công.
    const member = {
      name: tab === "signup" ? fields.name.trim() : fields.email.split("@")[0],
      email: fields.email.trim(),
      points: tab === "signup" ? 100 : 0,
    };
    localStorage.removeItem("nova-member");
    sessionStorage.removeItem("nova-member");
    (remember ? localStorage : sessionStorage).setItem(
      "nova-member",
      JSON.stringify(member),
    );
    onSuccess(member);
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
            {t("Ưu đãi dành riêng")}
          </li>
        </ul>
        <p className="small muted">
          {language === "en"
            ? "Demo rewards. No verified account or real payment."
            : "Ưu đãi minh họa. Chưa xác thực tài khoản, không thu tiền thật."}
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
                setTouched({});
                setNotice("");
              }}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <h3>
          {tab === "signin"
            ? t("Chào mừng trở lại.")
            : t("Điện ảnh, dành riêng cho bạn.")}
        </h3>
        <p>
          {language === "en"
            ? "Your next big-screen moment starts here."
            : "Một trải nghiệm điện ảnh mới đang chờ bạn."}
        </p>
        <form onSubmit={submit} noValidate>
          {["name", "email", "password", "confirm"]
            .filter(
              (id) => tab === "signup" || !["name", "confirm"].includes(id),
            )
            .map((id) => (
              <div className="auth-field" key={id}>
                <input
                  id={`auth-${id}`}
                  name={id}
                  type={
                    ["password", "confirm"].includes(id)
                      ? show
                        ? "text"
                        : "password"
                      : id === "email"
                        ? "email"
                        : "text"
                  }
                  placeholder=" "
                  value={fields[id]}
                  autoComplete={
                    id === "name"
                      ? "name"
                      : id === "email"
                        ? "email"
                        : tab === "signup"
                          ? "new-password"
                          : "current-password"
                  }
                  onChange={(e) =>
                    setFields({ ...fields, [id]: e.target.value })
                  }
                  onBlur={() => setTouched({ ...touched, [id]: true })}
                  aria-invalid={!!(touched[id] && error[id]?.trim())}
                  aria-describedby={
                    touched[id] && error[id]?.trim() ? `error-${id}` : undefined
                  }
                />
                <label htmlFor={`auth-${id}`}>
                  {t(
                    {
                      name: "Họ và tên",
                      email: "Email",
                      password: "Mật khẩu",
                      confirm: "Xác nhận mật khẩu",
                    }[id],
                  )}
                </label>
                {["password", "confirm"].includes(id) && (
                  <button
                    type="button"
                    className="password-eye"
                    aria-label={
                      language === "en"
                        ? show
                          ? "Hide password"
                          : "Show password"
                        : show
                          ? "Ẩn mật khẩu"
                          : "Hiện mật khẩu"
                    }
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
            <button
              type="button"
              onClick={() =>
                setNotice(
                  language === "en"
                    ? "Password recovery requires the account backend. This demo never stores passwords."
                    : "Khôi phục mật khẩu cần dịch vụ tài khoản. Bản demo không lưu mật khẩu.",
                )
              }
            >
              {t("Quên mật khẩu?")}
            </button>
          </div>
          <button className="button button-primary w-full" type="submit">
            {t(tab === "signin" ? "Đăng nhập demo" : "Tạo tài khoản demo")}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="auth-or">
          <span />
          {t("Hoặc tiếp tục với")}
          <span />
        </div>
        <div className="social-buttons">
          {["Google", "Apple"].map((p) => (
            <button
              key={p}
              onClick={() =>
                setNotice(
                  language === "en"
                    ? `${p} sign-in requires a configured OAuth backend. No connection is made in this demo.`
                    : `Đăng nhập ${p} cần cấu hình OAuth và backend. Bản demo chưa kết nối dịch vụ này.`,
                )
              }
            >
              <b aria-hidden="true">{p === "Google" ? "G" : "●"}</b>
              {p}
            </button>
          ))}
        </div>
        {notice && (
          <p className="auth-notice" role="status">
            {notice}
          </p>
        )}
        <p className="auth-disclaimer">
          <ShieldCheck size={13} />
          {language === "en"
            ? "Frontend demo · Never enter a real password."
            : "Demo giao diện · Không nhập mật khẩu thật."}
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
