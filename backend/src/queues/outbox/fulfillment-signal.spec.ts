import { Logger } from "@nestjs/common";
import { FulfillmentSignal } from "./fulfillment-signal";

describe("post-commit fulfillment signal", () => {
  it("coalesces bursts and unsubscribes stopped consumers", async () => {
    const signal = new FulfillmentSignal();
    const listener = jest.fn();
    const unsubscribe = signal.subscribe(listener);
    for (let index = 0; index < 20; index++) signal.notify();
    expect(listener).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    signal.notify();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("isolates a failed wake listener from committed payment and other consumers", async () => {
    const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    const signal = new FulfillmentSignal();
    signal.subscribe(() => {
      throw new Error("Unavailable worker");
    });
    const healthy = jest.fn();
    signal.subscribe(healthy);
    expect(() => {
      signal.notify();
    }).not.toThrow();
    await Promise.resolve();
    expect(healthy).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "Fulfillment wake deferred to durable polling.",
    );
  });
});
