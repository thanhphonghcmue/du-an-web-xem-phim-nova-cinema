import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { ExpiryOutboxRelay } from "../../queues/outbox/expiry-outbox-relay.service";
import { SeatBookingService } from "./seat-booking.service";
@Injectable()
export class BookingMaintenanceService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private timer: ReturnType<typeof setInterval> | undefined;
  private active: Promise<void> | undefined;
  private ticks = 4;
  private readonly logger = new Logger("BookingMaintenance");
  constructor(
    private readonly relay: ExpiryOutboxRelay,
    private readonly seats: SeatBookingService,
  ) {}
  onApplicationBootstrap(): void {
    this.start();
  }
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.runOnce().catch(() => {
        this.logger.warn(
          "Booking recovery will retry after infrastructure becomes available.",
        );
      });
    }, 1000);
    this.timer.unref();
    void this.runOnce().catch(() => {
      this.logger.warn("Initial booking recovery deferred.");
    });
  }
  runOnce(forceSweep = false): Promise<void> {
    if (this.active) return this.active;
    this.active = this.work(forceSweep).finally(() => {
      this.active = undefined;
    });
    return this.active;
  }
  private async work(forceSweep: boolean): Promise<void> {
    if (++this.ticks % 5 === 0 || forceSweep) await this.seats.sweepExpired();
    await this.relay.flush();
  }
  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    await this.active?.catch(() => undefined);
  }
  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }
}
