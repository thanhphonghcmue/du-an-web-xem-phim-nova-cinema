/**
 * ==============================================================================
 * TỆP TIN: backend/src/main.ts
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Điểm khởi động chính của máy chủ API NestJS (Backend Application Bootstrap Entrypoint).
 *   - Khởi tạo ứng dụng NestJS thông qua `createApplication()`.
 *   - Lắng nghe tại cổng cấu hình (mặc định cổng 4000, host 0.0.0.0).
 *   - Bắt lỗi khi cơ sở dữ liệu PostgreSQL hoặc Redis chưa sẵn sàng và ghi log chi tiết.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Đọc biến môi trường từ `.env` qua `dotenv/config`.
 *   2. Tạo ứng dụng NestJS, cấu hình CORS, bảo mật Cookie, Swagger API docs.
 *   3. Lắng nghe HTTP requests từ Next.js BFF Proxy và Socket.IO clients.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Máy chủ API Backend phục vụ toàn bộ hệ sinh thái NOVA Cinema.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Bổ sung cơ chế Graceful Shutdown đóng kết nối Prisma và Redis an toàn khi nhận tín hiệu SIGTERM/SIGINT.
 * ==============================================================================
 */

import "dotenv/config";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createApplication } from "./bootstrap";
import { AppSettings } from "./config/app.config";
async function bootstrap(): Promise<void> {
  const app = await createApplication();
  const config = app.get(ConfigService).getOrThrow<AppSettings>("app");
  try {
    await app.listen(config.port, config.host);
  } catch {
    await app.close();
    throw new Error("Backend startup failed.");
  }
  Logger.log(
    `NOVA backend Phase 10 listening on port ${String(config.port)}`,
    "Bootstrap",
  );
}
bootstrap().catch(() => {
  Logger.error(
    "Unable to start backend. Verify environment configuration and PostgreSQL/Redis availability.",
    undefined,
    "Bootstrap",
  );
  process.exitCode = 1;
});
