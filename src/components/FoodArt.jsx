import { Infinity as InfinityIcon } from "lucide-react";
// Hình bắp nước dựng bằng CSS để bước combo luôn hiển thị khi mạng ảnh bị chặn.
export default function FoodArt() {
  return (
    <div
      className="combo-visual checkout-food-art"
      aria-label="NOVA popcorn and cold drinks"
    >
      <div className="drink drink-one">
        <div className="drink-straw" />
        <div className="drink-lid" />
        <InfinityIcon size={24} />
        <b>NOVA</b>
        <small>CINEMA</small>
      </div>
      <div className="popcorn-bucket">
        <div className="popcorn-top">
          {Array.from({ length: 26 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 29) % 94}%`,
                top: `${(i * 17) % 58}%`,
                transform: `rotate(${i * 37}deg)`,
              }}
            />
          ))}
        </div>
        <div className="bucket-body">
          <InfinityIcon size={39} />
          <strong>NOVA</strong>
          <small>POPCORN & GOOD TIMES</small>
        </div>
      </div>
      <span className="food-caption">FRESH POPCORN / COLD DRINKS</span>
    </div>
  );
}
