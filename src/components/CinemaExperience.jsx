"use client";
import dynamic from "next/dynamic";
const NovaClient = dynamic(() => import("./NovaClient.jsx"), {
  ssr: false,
  loading: () => (
    <main className="initial-screen">
      <img
        src="/images/dune-scene.jpg"
        alt="Dune: Part Two — thế giới điện ảnh"
        width="1920"
        height="804"
      />
      <div>
        <span>NOVA CINEMA</span>
        <h1>
          Điện ảnh.
          <br />
          Không giới hạn.
        </h1>
        <p>Phim hay, ghế đẹp và những trải nghiệm đáng nhớ.</p>
        <span className="loading-bar" aria-label="Đang chuẩn bị trải nghiệm" />
      </div>
    </main>
  ),
});
export default function CinemaExperience() {
  return <NovaClient />;
}
