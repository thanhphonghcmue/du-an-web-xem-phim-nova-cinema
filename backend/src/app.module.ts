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
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      cache: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
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
