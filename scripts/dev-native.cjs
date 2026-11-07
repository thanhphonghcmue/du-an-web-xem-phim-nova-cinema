// Chạy cùng launcher, bắt buộc giữ PostgreSQL/Redis làm nguồn dữ liệu.
process.env.NOVA_REQUIRE_DATABASE = "true";
process.env.NOVA_BACKEND_MODE = "postgres";
require("./dev-fullstack.cjs");
