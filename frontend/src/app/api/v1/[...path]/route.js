/**
 * BFF cùng origin: cookie HttpOnly, kiểm tra Origin, proxy sang API đã cấu hình.
 * Mọi thao tác luôn chuyển tới NestJS; lỗi kết nối trả 503, không có kho thay thế.
 */
import { NextResponse } from "next/server";
import { promisify } from "node:util";
import { gzip } from "node:zlib";
const compress = promisify(gzip);
const publicRead = (method, endpoint) =>
  method === "GET" &&
  /^\/(movies|cinemas|rooms|combos|showtimes)(\/|$)/.test(endpoint);
const acceptsGzip = (header) =>
  (header || "").split(",").some((part) => {
    const match = part.trim().match(/^gzip(?:;\s*q=([01](?:\.\d+)?))?$/i);
    return match && (match[1] === undefined || Number(match[1]) > 0);
  });

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
  if (endpoint === "/runtime" && request.method === "GET")
    return NextResponse.json(
      { success: true, data: { mode: "backend" } },
      { headers: { "Cache-Control": "no-store" } },
    );

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
      // A guest refresh can finish after a concurrent login. With no refresh
      // cookie in that request, do not erase the newly established session.
      if (endpoint === "/auth/logout") clear(response);
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

  // BFF compresses public reads once, after forwarding unchanged JSON bytes.
  // Native direct clients negotiate their own compression separately.
  if (publicRead(request.method, endpoint))
    headers.set("accept-encoding", "identity");
  try {
    const target = upstream() + endpoint + new URL(request.url).search;
    const result = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(7500)]),
    });

    const type = result.headers.get("content-type") || "application/json";
    let response;

    if (
      result.ok &&
      type.includes("application/json") &&
      publicRead(request.method, endpoint)
    ) {
      const bytes = Buffer.from(await result.arrayBuffer());
      const useGzip =
        bytes.length >= 1024 &&
        acceptsGzip(request.headers.get("accept-encoding"));
      response = new NextResponse(
        useGzip ? await compress(bytes, { level: 4 }) : bytes,
        {
          status: result.status,
          headers: {
            "Content-Type": type,
            Vary: "Accept-Encoding",
            ...(useGzip ? { "Content-Encoding": "gzip" } : {}),
          },
        },
      );
    } else if (type.includes("application/json")) {
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
    const backendKind = result.headers.get("x-nova-backend");
    if (backendKind) response.headers.set("x-nova-backend", backendKind);
    const requestId = result.headers.get("x-request-id");
    if (requestId) response.headers.set("x-request-id", requestId);
    if (
      endpoint === "/auth/logout" ||
      (endpoint === "/auth/refresh" && result.status === 401)
    )
      clear(response);
    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "BACKEND_UNAVAILABLE",
        message: "Không thể kết nối đến máy chủ Backend. Vui lòng thử lại sau.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
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
