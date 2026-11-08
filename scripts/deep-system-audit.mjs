// scripts/deep-system-audit.mjs
// Exhaustive end-to-end audit of NOVA Cinema live production and database

const FRONTEND_URL = "https://du-an-web-xem-phim-nova-cinema.vercel.app";
const BACKEND_URL = "https://nova-cinema-backend.onrender.com";

const ACCOUNTS = {
  admin: { email: "admin@nova.vn", pass: "nova@12345", expectedRole: "ADMIN" },
  staff: { email: "staff@nova.vn", pass: "nova@12345", expectedRole: "STAFF" },
  cmember: { email: "cmember@nova.vn", pass: "nova@12345", expectedRole: "CUSTOMER" }
};

const PAGES_TO_TEST = [
  "/",
  "/phim",
  "/sap-chieu",
  "/rap",
  "/dat-ve",
  "/booking",
  "/bap-nuoc",
  "/checkout",
  "/thanh-toan",
  "/ve",
  "/tickets",
  "/dang-nhap",
  "/tai-khoan",
  "/hoi-vien",
  "/uu-dai",
  "/chinh-sach",
  "/gioi-thieu",
  "/huong-dan",
  "/ho-tro",
  "/lien-he",
  "/quan-tri",
  "/admin",
  "/admin/combos",
  "/soat-ve",
  "/staff",
  "/xem-truoc"
];

async function fetchWithTimeout(url, options = {}, timeoutMs = 25000, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) throw err;
      console.log(`       [RETRY ${attempt}/${retries}] ${url} (${err.message})...`);
      await new Promise(r => setTimeout(r, 1500 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }
}

async function runAudit() {
  console.log("===============================================================");
  console.log("       NOVA CINEMA - DEEP END-TO-END PRODUCTION AUDIT          ");
  console.log("===============================================================");
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Backend URL:  ${BACKEND_URL}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. BACKEND DIRECT HEALTH & CATALOG
  console.log("\n--- 1. BACKEND DIRECT ENDPOINTS ---");
  try {
    const rootRes = await fetchWithTimeout(`${BACKEND_URL}/`);
    assert(rootRes.status === 200, `Root health / -> HTTP ${rootRes.status}`);

    const healthRes = await fetchWithTimeout(`${BACKEND_URL}/api/v1/health`);
    assert(healthRes.status === 200, `API Health /api/v1/health -> HTTP ${healthRes.status}`);

    const moviesRes = await fetchWithTimeout(`${BACKEND_URL}/api/v1/movies?limit=30`);
    const moviesData = await moviesRes.json();
    const movieList = moviesData?.data?.items || moviesData?.items || moviesData?.data || [];
    assert(moviesRes.status === 200, `Movies list -> HTTP ${moviesRes.status}`);
    assert(movieList.length >= 24, `Movies count in DB -> ${movieList.length} (Expected >= 24)`);

    const nowShowing = movieList.filter(m => m.status === "NOW_SHOWING");
    const comingSoon = movieList.filter(m => m.status === "COMING_SOON");
    console.log(`       -> ${nowShowing.length} Phim đang chiếu, ${comingSoon.length} Phim sắp chiếu`);
    assert(nowShowing.length >= 16, `NOW_SHOWING movies: ${nowShowing.length} >= 16`);
    assert(comingSoon.length >= 8, `COMING_SOON movies: ${comingSoon.length} >= 8`);

    const cinemasRes = await fetchWithTimeout(`${BACKEND_URL}/api/v1/cinemas`);
    const cinemasData = await cinemasRes.json();
    const cinemaList = cinemasData?.data?.items || cinemasData?.items || cinemasData?.data || [];
    assert(cinemasRes.status === 200, `Cinemas list -> HTTP ${cinemasRes.status}`);
    assert(cinemaList.length === 4, `Cinemas count -> ${cinemaList.length} (Expected 4: Landmark 81, Sala, West Lake, Riverside)`);

    const combosRes = await fetchWithTimeout(`${BACKEND_URL}/api/v1/combos`);
    const combosData = await combosRes.json();
    const comboList = combosData?.data?.items || combosData?.items || combosData?.data || [];
    assert(combosRes.status === 200, `Combos list -> HTTP ${combosRes.status}`);
    assert(comboList.length >= 6, `Combos count -> ${comboList.length} (Expected >= 6)`);

    const showtimesRes = await fetchWithTimeout(`${BACKEND_URL}/api/v1/showtimes?limit=50`);
    const showtimesData = await showtimesRes.json();
    const showtimeList = showtimesData?.data?.items || showtimesData?.items || showtimesData?.data || [];
    assert(showtimesRes.status === 200, `Showtimes list -> HTTP ${showtimesRes.status}`);
    assert(showtimeList.length > 0, `Showtimes available -> ${showtimeList.length} fetched`);

    // 2. VERCEL API PROXY
    console.log("\n--- 2. VERCEL API PROXY (BFF) ---");
    const proxyMoviesRes = await fetchWithTimeout(`${FRONTEND_URL}/api/v1/movies?limit=24`);
    const proxyMoviesData = await proxyMoviesRes.json();
    const proxyMovieList = proxyMoviesData?.data?.items || proxyMoviesData?.items || proxyMoviesData?.data || [];
    assert(proxyMoviesRes.status === 200, `Proxy /api/v1/movies -> HTTP ${proxyMoviesRes.status}`);
    assert(proxyMovieList.length >= 24, `Proxy Movies count -> ${proxyMovieList.length} >= 24`);

    const proxyCinemasRes = await fetchWithTimeout(`${FRONTEND_URL}/api/v1/cinemas`);
    assert(proxyCinemasRes.status === 200, `Proxy /api/v1/cinemas -> HTTP ${proxyCinemasRes.status}`);

    const proxyCombosRes = await fetchWithTimeout(`${FRONTEND_URL}/api/v1/combos`);
    assert(proxyCombosRes.status === 200, `Proxy /api/v1/combos -> HTTP ${proxyCombosRes.status}`);

    // 3. AUTHENTICATION & ROLE-BASED ACCESS
    console.log("\n--- 3. AUTHENTICATION & ROLES ---");
    const tokens = {};
    for (const [key, acc] of Object.entries(ACCOUNTS)) {
      const loginRes = await fetchWithTimeout(`${BACKEND_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: acc.email, password: acc.pass })
      });
      const loginData = await loginRes.json();
      const token = loginData?.data?.accessToken || loginData?.accessToken || loginData?.data?.token;
      const role = loginData?.data?.user?.role || loginData?.user?.role;
      assert(loginRes.status === 200, `Login ${acc.email} -> HTTP ${loginRes.status}`);
      assert(role === acc.expectedRole, `User ${acc.email} role is ${role} (Expected ${acc.expectedRole})`);
      tokens[key] = token;
    }

    // 4. ADMIN PROTECTED ENDPOINTS
    console.log("\n--- 4. ADMIN PROTECTED ROUTES ---");
    if (tokens.admin) {
      const overviewRes = await fetchWithTimeout(`${BACKEND_URL}/api/v1/admin/reports/overview`, {
        headers: { Authorization: `Bearer ${tokens.admin}` }
      });
      assert(overviewRes.status === 200, `Admin overview /api/v1/admin/reports/overview -> HTTP ${overviewRes.status}`);

      const revenueRes = await fetchWithTimeout(`${BACKEND_URL}/api/v1/admin/reports/revenue?from=2026-11-01&to=2026-11-30`, {
        headers: { Authorization: `Bearer ${tokens.admin}` }
      });
      assert(revenueRes.status === 200, `Admin revenue /api/v1/admin/reports/revenue -> HTTP ${revenueRes.status}`);

      const adminBookingsRes = await fetchWithTimeout(`${BACKEND_URL}/api/v1/admin/bookings`, {
        headers: { Authorization: `Bearer ${tokens.admin}` }
      });
      assert(adminBookingsRes.status === 200, `Admin bookings /api/v1/admin/bookings -> HTTP ${adminBookingsRes.status}`);
    }

    // 5. STAFF PROTECTED ENDPOINTS
    console.log("\n--- 5. STAFF PROTECTED ROUTES ---");
    if (tokens.staff) {
      const demoFixturesRes = await fetchWithTimeout(`${BACKEND_URL}/api/v1/staff/demo-fixtures`, {
        headers: { Authorization: `Bearer ${tokens.staff}` }
      });
      assert(demoFixturesRes.status === 200, `Staff demo fixtures /api/v1/staff/demo-fixtures -> HTTP ${demoFixturesRes.status}`);
      const fixturesData = await demoFixturesRes.json();
      const fixtures = fixturesData?.data || fixturesData || [];
      console.log(`       -> Staff has ${Array.isArray(fixtures) ? fixtures.length : Object.keys(fixtures).length} demo ticket fixtures available`);
    }

    // 6. SEAT MAP & PRICING
    console.log("\n--- 6. SEAT MAP & CAPACITY ---");
    if (showtimeList.length > 0) {
      const firstShowtime = showtimeList[0];
      const seatsRes = await fetchWithTimeout(`${BACKEND_URL}/api/v1/showtimes/${firstShowtime.id}/seats`);
      const seatsData = await seatsRes.json();
      const seatMap = seatsData?.data || seatsData;
      assert(seatsRes.status === 200, `Seat map for showtime ${firstShowtime.id} -> HTTP ${seatsRes.status}`);
      const seats = seatMap?.seats || seatMap?.items || [];
      assert(seats.length > 0, `Seats count -> ${seats.length} seats in room`);

      // Verify seat types
      const types = new Set(seats.map(s => s.type));
      console.log(`       -> Seat types found: ${Array.from(types).join(", ")}`);
      assert(types.has("STANDARD") || types.has("VIP"), `Contains standard/VIP seats`);
    }

    // 7. FRONTEND USER-FACING PAGES
    console.log("\n--- 7. FRONTEND PAGES AUDIT (26 ROUTES) ---");
    for (const route of PAGES_TO_TEST) {
      const pageRes = await fetchWithTimeout(`${FRONTEND_URL}${route}`);
      const isOk = pageRes.status === 200;
      assert(isOk, `Route ${route} -> HTTP ${pageRes.status}`);
    }

    // 8. DYNAMIC MOVIE DETAIL PAGE
    console.log("\n--- 8. DYNAMIC MOVIE DETAIL ROUTE ---");
    if (movieList.length > 0) {
      const sampleMovie = movieList[0];
      const detailRes = await fetchWithTimeout(`${FRONTEND_URL}/phim/${sampleMovie.id}`);
      assert(detailRes.status === 200, `Dynamic Route /phim/${sampleMovie.id} (${sampleMovie.title}) -> HTTP ${detailRes.status}`);
    }

    // 9. POSTER IMAGE ASSETS CHECK (ALL 24 LIVE MOVIES)
    console.log("\n--- 9. POSTER IMAGE ASSETS ACCESSIBILITY ---");
    let postersAllOk = true;
    for (const m of movieList) {
      if (m.posterUrl) {
        const imgUrl = `${FRONTEND_URL}${m.posterUrl}`;
        const imgRes = await fetchWithTimeout(imgUrl);
        const ok = imgRes.status === 200;
        assert(ok, `Poster for "${m.title}" -> ${m.posterUrl} -> HTTP ${imgRes.status}`);
        if (!ok) postersAllOk = false;
      }
    }
    assert(postersAllOk, `All ${movieList.length} movie posters are accessible on Vercel`);

  } catch (err) {
    console.error("Audit encountered an error:", err);
    failed++;
  }

  console.log("\n===============================================================");
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("===============================================================");

  if (failed === 0) {
    console.log("SUCCESS: ALL 100% PRODUCTION AUDITS PASSED WITH ZERO ERRORS!");
    process.exit(0);
  } else {
    console.error(`ATTENTION: ${failed} CHECKS FAILED!`);
    process.exit(1);
  }
}

runAudit();
