/**
 * ==============================================================================
 * TỆP TIN: src/app/api/seat-events/[id]/route.js
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Kênh phát sự kiện thay đổi ghế thời gian thực (SSE - Server-Sent Events).
 *   - Kết nối tới NestJS Socket.IO Gateway (`/seats namespace`) ở backend và
 *     chuyển đổi thành luồng HTTP Streaming chuẩn SSE gửi về trình duyệt của khách hàng.
 *   - Lợi ích: Trình duyệt không cần thư viện Socket.IO nặng nề, chỉ cần `EventSource` nguyên bản.
 *   - Đảm bảo 2 khách hàng ở 2 máy tính khác nhau khi cùng mở một suất chiếu sẽ thấy ngay
 *     khi có người khác vừa khóa ghế hoặc mua vé mà không cần bấm F5 tải lại trang.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Trình duyệt khởi tạo `new EventSource("/api/seat-events/<showtimeId>")`.
 *   2. Route này kết nối Socket.IO tới Backend và gửi sự kiện `join_showtime`.
 *   3. Khi có sự kiện `seat_locked`, `seat_released`, `seat_sold`: phát `data: {"type": "resync"}\n\n`.
 *   4. Định kỳ mỗi 15 giây gửi gói tin `: heartbeat\n\n` giữ kết nối không bị nhà mạng ngắt.
 *   5. Khi tab đóng hoặc chuyển trang: dọn dẹp kết nối socket và hủy luồng stream.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Màn hình chọn ghế (`SeatBooking`) của khách hàng.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Bổ sung gửi kèm danh sách mã ghế cụ thể bị khóa thay vì chỉ gửi tín hiệu resync chung.
 *   - Thêm bộ đếm số lượng người đang cùng xem suất chiếu này ("Đang có 12 người cùng xem phòng này").
 * ==============================================================================
 */

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
