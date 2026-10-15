import { io } from "socket.io-client";
export const dynamic = "force-dynamic";
export async function GET(request, context) {
  const { id } = await context.params;
  if (!/^[a-f0-9-]{36}$/i.test(id))
    return new Response("Invalid showtime", { status: 400 });
  const origin = new URL(
    process.env.BACKEND_API_URL || "http://127.0.0.1:4000/api/v1",
  ).origin;
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const emit = (data) => {
        if (!closed)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
      };
      const socket = io(origin + "/seats", {
        transports: ["websocket"],
        reconnection: true,
      });
      const timer = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15000);
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        socket.disconnect();
        request.signal.removeEventListener("abort", cleanup);
        controller.close();
      };
      socket.on("connect", () =>
        socket.emit("join_showtime", { showtimeId: id }, (ack) =>
          emit({ type: ack?.success === false ? "unavailable" : "resync" }),
        ),
      );
      for (const event of [
        "seat_locked",
        "seat_released",
        "seat_sold",
        "resync_required",
      ])
        socket.on(event, () => emit({ type: "resync" }));
      socket.on("disconnect", () => emit({ type: "unavailable" }));
      socket.on("connect_error", () => emit({ type: "unavailable" }));
      request.signal.addEventListener("abort", cleanup, { once: true });
      if (request.signal.aborted) cleanup();
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
