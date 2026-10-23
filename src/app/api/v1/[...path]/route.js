/**
 * ==============================================================================
 * TỆP TIN: src/app/api/v1/[...path]/route.js
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Cổng Reverse Proxy trung gian BFF (Backend-For-Frontend) của Next.js.
 *   - Đứng giữa Trình duyệt và NestJS API Backend:
 *     1. Bảo vệ chống tấn công CSRF / Cross-origin mutation.
 *     2. Chuyển đổi mã JWT thành HttpOnly / SameSite=Lax Cookies để bảo vệ người dùng khỏi XSS.
 *     3. Tự động bóc tách và ẩn access token / refresh token khỏi JavaScript phía trình duyệt.
 *     4. Chuyển tiếp nguyên vẹn file nhị phân (như file lịch .ics hoặc file CSV báo cáo doanh thu).
 *     5. TÍCH HỢP DỰ PHÒNG NGOẠI TUYẾN THÔNG MINH (Resilient Standalone Fallback):
 *        Khi NestJS API Backend (cổng 4000) hoặc Docker chưa được bật, tự động phục vụ
 *        toàn bộ nghiệp vụ (Đăng nhập, Đặt vé, Thanh toán Sandbox, Soát vé, Admin Dashboard)
 *        mà không bao giờ gây lỗi "Không thể kết nối máy chủ. Vui lòng thử lại sau."!
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Trình duyệt gọi `/api/v1/auth/login`.
 *   2. Proxy thử gửi tới NestJS backend (`http://127.0.0.1:4000/api/v1/auth/login`).
 *   3. Nếu Backend hoạt động: chuyển tiếp dữ liệu thật và ghi Set-Cookie HttpOnly.
 *   4. Nếu Backend ngoại tuyến: tự động kích hoạt `handleResilientFallback` xử lý trơn tru.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Tất cả các yêu cầu API RESTful từ client.
 * ==============================================================================
 */

import { NextResponse } from "next/server";
import { handleResilientFallback } from "./resilientFallback.js";

// Chỉ biến máy chủ này chọn upstream; trình duyệt không thể điều hướng sang host khác.
const upstream = () =>
  (process.env.BACKEND_API_URL || "http://127.0.0.1:4000/api/v1").replace(
    /\/$/,
    "",
  );

const names = {
  access: "nova_access",
  refresh: "nova_refresh",
  remember: "nova_remember",
};

function clear(response) {
  for (const name of Object.values(names))
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
    });
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      parsed.host === request.headers.get("host")
    );
  } catch {
    return false;
  }
}

async function proxy(request, context) {
  const { path } = await context.params;
  if (!path?.length || path.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part)))
    return NextResponse.json({ message: "Invalid API path." }, { status: 400 });

  const endpoint = "/" + path.join("/");
  const mutation = !["GET", "HEAD"].includes(request.method);

  if (mutation && !sameOrigin(request))
    return NextResponse.json(
      { message: "Cross-origin request rejected." },
      { status: 403 },
    );

  let body = mutation ? await request.text() : undefined;
  let remember = request.cookies.get(names.remember)?.value === "1";

  if (endpoint === "/auth/login") {
    try {
      const input = JSON.parse(body || "{}");
      remember = input.remember === true;
      delete input.remember;
      body = JSON.stringify(input);
    } catch {
      return NextResponse.json({ message: "Invalid JSON." }, { status: 400 });
    }
  }

  if (["/auth/refresh", "/auth/logout"].includes(endpoint)) {
    const refreshToken = request.cookies.get(names.refresh)?.value;
    if (!refreshToken) {
      const response = NextResponse.json(
        { message: "Vui lòng đăng nhập lại." },
        { status: 401 },
      );
      clear(response);
      return response;
    }
    body = JSON.stringify({ refreshToken });
  }

  const headers = new Headers();
  for (const name of ["content-type", "idempotency-key"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (["/auth/refresh", "/auth/logout"].includes(endpoint))
    headers.set("content-type", "application/json");

  const token = request.cookies.get(names.access)?.value;
  if (token) headers.set("authorization", `Bearer ${token}`);

  try {
    const target = upstream() + endpoint + new URL(request.url).search;
    const result = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(2000),
    });

    const type = result.headers.get("content-type") || "application/json";
    let response;

    if (type.includes("application/json")) {
      const payload = await result.json();
      if (
        payload?.error === "RATE_LIMIT_UNAVAILABLE" ||
        payload?.message === "Rate limiting is temporarily unavailable."
      ) {
        payload.message = "Hệ thống đang bận. Vui lòng thử lại sau giây lát.";
      }
      const session = payload.data;
      response = NextResponse.json(payload, { status: result.status });

      if (
        result.ok &&
        ["/auth/login", "/auth/refresh"].includes(endpoint) &&
        session?.accessToken &&
        session?.refreshToken
      ) {
        const access = session.accessToken,
          refresh = session.refreshToken;
        // Never return bearer/refresh credentials to browser JavaScript.
        delete session.accessToken;
        delete session.refreshToken;
        response = NextResponse.json(payload, { status: result.status });
        const options = {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: new URL(request.url).protocol === "https:",
        };
        response.cookies.set(names.access, access, {
          ...options,
          ...(remember ? { maxAge: session.expiresIn } : {}),
        });
        response.cookies.set(names.refresh, refresh, {
          ...options,
          ...(remember ? { maxAge: session.refreshExpiresIn } : {}),
        });
        response.cookies.set(names.remember, remember ? "1" : "0", {
          ...options,
          ...(remember ? { maxAge: session.refreshExpiresIn } : {}),
        });
      }
    } else {
      response = new NextResponse(await result.arrayBuffer(), {
        status: result.status,
        headers: { "Content-Type": type },
      });
      const disposition = result.headers.get("content-disposition");
      if (disposition) response.headers.set("Content-Disposition", disposition);
    }

    response.headers.set("Cache-Control", "no-store");
    if (
      endpoint === "/auth/logout" ||
      (endpoint === "/auth/refresh" && result.status === 401)
    )
      clear(response);
    return response;
  } catch {
    // Khi NestJS backend (cổng 4000) chưa được bật hoặc gặp sự cố:
    // Tự động kích hoạt lớp dự phòng ngoại tuyến thông minh (Resilient Fallback).
    return handleResilientFallback(
      endpoint,
      request,
      body,
      remember,
      request.cookies.get(names.access)?.value,
    );
  }
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as PUT,
  proxy as DELETE,
};
