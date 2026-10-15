// API Client kết nối Frontend Next.js với Backend NestJS (port 4000)
const API_BASE = "http://localhost:4000/api/v1";

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nova_access_token") || sessionStorage.getItem("nova_access_token");
}

export function setAuthToken(token, remember = true) {
  if (typeof window === "undefined") return;
  if (token) {
    (remember ? localStorage : sessionStorage).setItem("nova_access_token", token);
  } else {
    localStorage.removeItem("nova_access_token");
    sessionStorage.removeItem("nova_access_token");
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message || `Lỗi yêu cầu: ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.response = data;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.status) throw error;
    // Lỗi mạng hoặc server không phản hồi
    throw new Error(
      `Không thể kết nối đến máy chủ Backend (${API_BASE}). Vui lòng kiểm tra cổng 4000.`,
      { cause: error },
    );
  }
}

// 1. Auth APIs
export async function apiLogin(email, password) {
  const res = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (res.data?.accessToken) {
    setAuthToken(res.data.accessToken, true);
  }
  return res.data;
}

export async function apiRegister(email, password, fullName, phone) {
  const res = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, fullName, phone }),
  });
  if (res.data?.accessToken) {
    setAuthToken(res.data.accessToken, true);
  }
  return res.data;
}

export async function apiGetProfile() {
  const res = await apiRequest("/users/me");
  return res.data;
}

export async function apiLogout() {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } finally {
    setAuthToken(null);
  }
}

// 2. Catalog APIs
export async function apiGetMovies() {
  const res = await apiRequest("/movies");
  return res.data;
}

export async function apiGetCinemas() {
  const res = await apiRequest("/cinemas");
  return res.data;
}

export async function apiGetShowtimes(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await apiRequest(`/showtimes${query ? `?${query}` : ""}`);
  return res.data;
}

export async function apiGetShowtimeSeats(showtimeId) {
  const res = await apiRequest(`/showtimes/${showtimeId}/seats`);
  return res.data;
}

export async function apiGetGroupSuggestions(showtimeId, groupSize = 2) {
  const res = await apiRequest(`/showtimes/${showtimeId}/group-seat-suggestion?groupSize=${groupSize}`);
  return res.data;
}

// 3. Booking & Payment APIs
export async function apiHoldSeats(payload) {
  const res = await apiRequest("/bookings/hold", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function apiGetMyBookings() {
  const res = await apiRequest("/bookings/me");
  return res.data;
}

export async function apiGetMyTickets() {
  const res = await apiRequest("/tickets/me");
  return res.data;
}

// 4. Admin Reports & Management APIs
export async function apiGetAdminOverview() {
  const res = await apiRequest("/admin/reports/overview");
  return res.data;
}

export async function apiGetAdminRevenue(from, to, cinemaId, movieId) {
  const params = new URLSearchParams({ from, to });
  if (cinemaId) params.append("cinemaId", cinemaId);
  if (movieId) params.append("movieId", movieId);
  const res = await apiRequest(`/admin/reports/revenue?${params.toString()}`);
  return res.data;
}

export async function apiGetAdminUsers() {
  const res = await apiRequest("/admin/reports/users");
  return res.data;
}

export async function apiPurgeOutbox(daysOld = 1) {
  const res = await apiRequest("/admin/reports/purge-outbox", {
    method: "POST",
    body: JSON.stringify({ daysOld }),
  });
  return res.data;
}

// 5. Check Health API
export async function apiGetHealth() {
  const res = await apiRequest("/health");
  return res.data;
}
