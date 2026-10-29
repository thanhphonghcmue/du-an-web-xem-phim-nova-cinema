import { Injectable, Logger } from "@nestjs/common";

// Chỉ đánh thức worker sau commit; outbox PostgreSQL vẫn là nguồn bền vững.
@Injectable()
export class FulfillmentSignal {
  private readonly listeners = new Set<() => void>();
  private readonly logger = new Logger("FulfillmentSignal");
  private pending = false;

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(): void {
    if (this.pending) return;
    this.pending = true;
    queueMicrotask(() => {
      this.pending = false;
      for (const listener of this.listeners) {
        try {
          listener();
        } catch {
          // Một listener lỗi không biến payment đã commit thành HTTP500.
          this.logger.warn("Fulfillment wake deferred to durable polling.");
        }
      }
    });
  }
}
