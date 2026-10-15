// Same-origin BFF: credentials stay in HttpOnly cookies, never localStorage.
export const API_BASE = "/api/v1";
let refreshing;
export async function apiRequest(endpoint, options = {}, retry = true) {
  let response;
  try {
    response = await fetch(API_BASE + endpoint, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      signal: options.signal || AbortSignal.timeout(20000),
    });
  } catch (cause) {
    throw new Error("Kết nối bị gián đoạn. Vui lòng thử lại.", { cause });
  }
  if (response.status === 401 && retry && !endpoint.startsWith("/auth/")) {
    const rotate = async () => {
      // Another tab may already have replaced the shared cookies while we waited.
      try {
        await apiRequest("/users/me", {}, false);
        return;
      } catch (error) {
        if (error.status !== 401) throw error;
      }
      await apiRequest("/auth/refresh", { method: "POST" }, false);
    };
    refreshing ||= (
      navigator.locks?.request
        ? navigator.locks.request("nova-session-refresh", rotate)
        : rotate()
    ).finally(() => {
      refreshing = null;
    });
    await refreshing;
    return apiRequest(endpoint, options, false);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      Array.isArray(payload.message)
        ? payload.message.join(", ")
        : payload.message || "Yêu cầu không thành công.",
    );
    error.status = response.status;
    error.code = payload.error || payload.errorCode || payload.code;
    throw error;
  }
  return payload;
}
export const read = async (path) => (await apiRequest(path)).data;
export async function apiList(path, params = {}) {
  const items = [];
  for (let page = 1; ; page++) {
    const data = await read(
      `${path}?${new URLSearchParams({ ...params, limit: 100, page })}`,
    );
    items.push(...data.items);
    if (page >= data.meta.totalPages) return items;
  }
}
export const apiLogin = async (email, password, remember = true) =>
  (
    await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, remember }),
    })
  ).data;
export async function apiRegister(
  email,
  password,
  fullName,
  phone,
  remember = true,
) {
  await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      fullName,
      ...(phone ? { phone } : {}),
    }),
  });
  return apiLogin(email, password, remember);
}
export const memberProfile = (user) => ({
  ...user,
  name: user.fullName,
  points: user.cMemberPoints,
  tier: user.cMemberTier,
});
export const apiGetProfile = () => read("/users/me");
export const apiLogout = () => apiRequest("/auth/logout", { method: "POST" });
export const apiGetMovies = () => apiList("/movies");
export const apiGetCinemas = () => apiList("/cinemas");
export const apiGetShowtimes = (params) => apiList("/showtimes", params);
export const apiGetShowtimeSeats = (id) => read(`/showtimes/${id}/seats`);
export const apiGetGroupSuggestions = (id, quantity = 2) =>
  read(`/showtimes/${id}/group-seat-suggestion?quantity=${quantity}`);
export const apiHoldSeats = (payload, key) =>
  readCommand("/bookings/hold", payload, key ? { "Idempotency-Key": key } : {});
export const apiGetMyBookings = () => apiList("/bookings/me");
export const apiGetMyTickets = () => apiList("/tickets/me");
export const apiGetBooking = (id) => read(`/bookings/${id}`);
export const apiCancelBooking = (id) => readCommand(`/bookings/${id}/cancel`);
export const apiPaymentStatus = (id) => read(`/payments/${id}/status`);
export const apiCheckout = (id) =>
  readCommand("/payments/create-sandbox-url", {
    bookingId: id,
    returnUrl: window.location.origin + "/?booking=" + id,
  });
export async function apiInstantPay(orderId) {
  const checkout = await apiCheckout(orderId);
  const checkoutUrl = new URL(checkout.url);
  const params = Object.fromEntries(checkoutUrl.searchParams.entries());
  await fetch("/api/v1/payments/sandbox/complete", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...params,
      result: "SUCCESS",
    }),
  });
  return true;
}
export async function readCommand(
  path,
  payload,
  headers = {},
  method = "POST",
) {
  return (
    await apiRequest(path, {
      method,
      headers,
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    })
  ).data;
}
export const apiGetAdminOverview = () => read("/admin/reports/overview");
export const apiGetAdminRevenue = (from, to, cinemaId, movieId) =>
  read(
    `/admin/reports/revenue?${new URLSearchParams({ from, to, ...(cinemaId ? { cinemaId } : {}), ...(movieId ? { movieId } : {}) })}`,
  );
export const apiGetAdminUsers = () => read("/admin/reports/users");
export const apiPurgeOutbox = (daysOld = 7) =>
  readCommand("/admin/reports/purge-outbox", { daysOld });
export const apiGetHealth = () => read("/health");
