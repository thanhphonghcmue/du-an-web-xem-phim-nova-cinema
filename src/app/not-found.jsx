import Link from "next/link";
export default function NotFound() {
  return (
    <main className="not-found">
      <span>NOVA CINEMA / 404</span>
      <h1>
        Suất chiếu này
        <br />
        không tồn tại.
      </h1>
      <p>Quay lại NOVA để tìm câu chuyện tiếp theo của bạn.</p>
      <Link href="/" className="button button-primary">
        Về trang chủ →
      </Link>
    </main>
  );
}
