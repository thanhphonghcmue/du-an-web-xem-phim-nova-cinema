/**
 * ==============================================================================
 * TỆP TIN: backend/src/app.module.ts
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Mô-đun Gốc Trung Tâm Của NestJS Backend (Root Application Module).
 *   - Tổng hợp và kết nối toàn bộ 14 mô-đun nghiệp vụ của rạp chiếu phim:
 *     1. ConfigModule & Environment: Cấu hình biến môi trường, xác thực schema.
 *     2. PrismaModule & Database: Tầng dữ liệu PostgreSQL 17 và Transaction Unit-Of-Work.
 *     3. RedisModule & RateLimitModule: Bộ đệm phân tán và bảo vệ chống brute-force / DDoS.
 *     4. AuthModule: Đăng ký, đăng nhập JWT, giải mã phiên, băm mật khẩu Argon2id.
 *     5. Movies, Cinemas, Rooms, Seats, Showtimes: Quản lý danh mục rạp, phim, phòng chiếu, ghế và suất chiếu.
 *     6. BookingsModule: Khóa giữ ghế 5 phút, kiểm tra Orphan Seat, tính giá vé, mã coupon, chiết khấu hạng và cộng điểm C'MEMBER.
 *     7. RealtimeModule: Cổng Socket.IO phát sự kiện ghế thời gian thực (`/seats namespace`).
 *     8. PaymentsModule: Tạo liên kết Sandbox thanh toán có chữ ký số HMAC-SHA512 chống gian lận.
 *     9. NotificationsModule: Hàng đợi BullMQ gửi email vé xem phim có mã QR qua SMTP Mailpit.
 *     10. ReportsModule: Báo cáo tài chính doanh thu, số vé bán và dọn dẹp hàng đợi Outbox.
 *
 * TOÀN BỘ GUARDS & INTERCEPTORS TOÀN CỤC:
 *   - `ResponseInterceptor`: Chuẩn hóa định dạng trả về JSON `{ success: true, data: ..., timestamp }`.
 *   - `ThrottlerGuard`: Giới hạn tần suất gọi API (Rate limiting).
 *   - `JwtAuthGuard`: Kiểm tra và xác thực Access Token JWT.
 *   - `RolesGuard`: Phân quyền dựa trên vai trò (CUSTOMER, STAFF, ADMIN).
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Tích hợp OpenTelemetry / Prometheus để giám sát thời gian phản hồi (APM Tracing).
 * ==============================================================================
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import appConfig from "./config/app.config";
import databaseConfig from "./config/database.config";
import redisConfig from "./config/redis.config";
import jwtConfig from "./config/jwt.config";
import paymentConfig from "./config/payment.config";
import notificationConfig from "./config/notification.config";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { validateEnvironment } from "./config/environment";
import { PrismaModule } from "./database/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { RateLimitModule } from "./redis/rate-limit.module";
import { HealthModule } from "./health/health.module";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { AuthModule } from "./modules/auth/auth.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { MoviesModule } from "./modules/movies/movies.module";
import { CinemasModule } from "./modules/cinemas/cinemas.module";
import { RoomsModule } from "./modules/rooms/rooms.module";
import { SeatsModule } from "./modules/seats/seats.module";
import { ShowtimesModule } from "./modules/showtimes/showtimes.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { ReportsModule } from "./modules/reports/reports.module";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      cache: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        jwtConfig,
        paymentConfig,
        notificationConfig,
      ],
      validate: validateEnvironment,
    }),
    PrismaModule,
    RedisModule,
    RateLimitModule,
    HealthModule,
    AuthModule,
    MoviesModule,
    CinemasModule,
    RoomsModule,
    SeatsModule,
    ShowtimesModule,
    BookingsModule,
    RealtimeModule,
    PaymentsModule,
    NotificationsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: RolesGuard },
  ],
})
export class AppModule {}
