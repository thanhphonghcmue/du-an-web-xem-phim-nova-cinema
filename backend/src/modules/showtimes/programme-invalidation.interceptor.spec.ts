import { CallHandler, ExecutionContext, Logger } from "@nestjs/common";
import { defer, firstValueFrom, of, throwError } from "rxjs";
import { ProgrammeInvalidationInterceptor } from "./programme-invalidation.interceptor";
import { ProgrammeSnapshotService } from "./programme-snapshot.service";

function http(path: string, method = "DELETE"): ExecutionContext {
  return {
    getType: () => "http",
    switchToHttp: () => ({ getRequest: () => ({ path, method }) }),
  } as unknown as ExecutionContext;
}
function setup() {
  const invalidate = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
  const snapshots = { invalidate } as unknown as ProgrammeSnapshotService;
  return {
    invalidate,
    interceptor: new ProgrammeInvalidationInterceptor(snapshots),
  };
}

describe("programme cache invalidation after committed catalogue writes", () => {
  it.each(["PATCH", "DELETE"])(
    "invalidates a top-level seat %s only after the service commits",
    async (method) => {
      const { invalidate, interceptor } = setup();
      const stages: string[] = [];
      const committed = { id: "owned-seat", deleted: method === "DELETE" };
      invalidate.mockImplementation(() => {
        stages.push("invalidated");
        return Promise.resolve();
      });
      const next: CallHandler<unknown> = {
        handle: () =>
          defer(() => {
            stages.push("committed");
            return Promise.resolve(committed);
          }),
      };
      const result = await firstValueFrom(
        interceptor.intercept(http("/api/v1/seats/owned-seat", method), next),
      );
      expect(result).toBe(committed);
      expect(stages).toEqual(["committed", "invalidated"]);
      expect(invalidate).toHaveBeenCalledTimes(1);
    },
  );

  it("does not invalidate when the protected service rejects the mutation", async () => {
    const { invalidate, interceptor } = setup();
    const failure = new Error("Seat has booking history");
    const next: CallHandler<unknown> = {
      handle: () => throwError(() => failure),
    };
    await expect(
      firstValueFrom(
        interceptor.intercept(http("/api/v1/seats/owned-seat"), next),
      ),
    ).rejects.toBe(failure);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("preserves the committed response if Redis invalidation fails instead of making a replay look necessary", async () => {
    const { invalidate, interceptor } = setup();
    const warn = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    invalidate.mockRejectedValue(new Error("Owned Redis fault injection"));
    const committed = { id: "owned-seat", deleted: true };
    const next: CallHandler<unknown> = { handle: () => of(committed) };
    await expect(
      firstValueFrom(
        interceptor.intercept(http("/api/v1/seats/owned-seat"), next),
      ),
    ).resolves.toBe(committed);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not inspect HTTP request fields or touch the cache for a WebSocket event", async () => {
    const { invalidate, interceptor } = setup();
    const switchToHttp = jest.fn(() => {
      throw new Error("Not an HTTP context");
    });
    const context = {
      getType: () => "ws",
      switchToHttp,
    } as unknown as ExecutionContext;
    const event = { joined: true };
    const next: CallHandler<unknown> = { handle: () => of(event) };
    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).resolves.toBe(event);
    expect(switchToHttp).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("does not invalidate read-only catalogue and seat requests", async () => {
    const { invalidate, interceptor } = setup();
    const next: CallHandler<unknown> = { handle: () => of({ items: [] }) };
    await firstValueFrom(
      interceptor.intercept(http("/api/v1/seats/owned-seat", "GET"), next),
    );
    expect(invalidate).not.toHaveBeenCalled();
  });
});
