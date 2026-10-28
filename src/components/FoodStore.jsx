"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CupSoda,
  Flame,
  Minus,
  Plus,
  Popcorn,
  Search,
  ShoppingBag,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import { useCatalog } from "../catalog.js";
import { menuCategories, menuDetails } from "../commerce.js";
import { money } from "../data.js";
import { matchesFood, readFoodCart, saveFoodCart } from "../foodCart.js";
import MenuImage from "./MenuImage.jsx";
import { foodHeroPhoto } from "../menuPhotography.js";
import Modal from "./Modal.jsx";

const flavors = [
  ["all", "Mọi khẩu vị"],
  ["savory", "Mặn & phô mai"],
  ["sweet", "Ngọt ngào"],
  ["spicy", "Cay nhẹ"],
  ["fresh", "Thanh mát"],
];
const categoryOrder = {
  combo: 0,
  limited: 1,
  popcorn: 2,
  drinks: 3,
  snacks: 4,
};

export function FoodHero() {
  const { combos, isLive } = useCatalog();
  return (
    <header className="page-banner food-hero">
      <div className="content-width food-hero-inner">
        <div className="food-hero-copy">
          <nav className="page-breadcrumb" aria-label="Đường dẫn">
            <Link href="/">NOVA Cinema</Link>
            <ChevronRight size={13} />
            <span>Bắp & nước</span>
          </nav>
          <p className="nova-kicker">
            <Popcorn size={15} /> BẮP, NƯỚC & COMBO
          </p>
          <h1>
            Bắp nóng.
            <br />
            <em>Phim hay.</em>
          </h1>
          <p className="food-hero-description">
            Chọn bắp bạn thích, thêm nước mát và đồ ăn kèm. Có combo cho một
            người, hai người và cả nhóm — thêm vào vé chỉ trong vài bước.
          </p>
          <div className="food-hero-actions">
            <a className="button button-primary" href="#food">
              Khám phá thực đơn <ArrowDown size={17} />
            </a>
            <span>
              <i />{" "}
              {isLive
                ? `${combos.length} món đang phục vụ`
                : "Khám phá vị ngon NOVA"}
            </span>
          </div>
          <div className="food-hero-note">
            <Ticket size={17} />
            <span>Chọn món trước. Thêm vào vé sau.</span>
          </div>
        </div>
        <div className="food-hero-art">
          <img
            className="food-hero-photo"
            src={foodHeroPhoto}
            width="1536"
            height="1024"
            alt="Ảnh chụp cận cảnh bắp rang bơ"
            fetchPriority="high"
            decoding="async"
          />
          <div className="food-floating-note">
            <Popcorn size={18} />
            <span>
              Hội bạn đông?<strong>Có combo cho cả nhóm.</strong>
            </span>
          </div>
        </div>
      </div>
      <div className="content-width food-rituals">
        {[
          [
            Popcorn,
            "Giòn theo cách bạn thích",
            "Từ bơ truyền thống đến rong biển, caramel và chocolate.",
          ],
          [
            CupSoda,
            "Một ngụm thật đã",
            "Cola, trà trái cây và soda cho mỗi tâm trạng.",
          ],
          [
            Flame,
            "Chia nhau chút ngon",
            "Hotdog, nachos, khoai giòn và gà viên cho cả hội.",
          ],
        ].map(([Icon, title, description]) => (
          <div key={title}>
            <Icon size={25} />
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
          </div>
        ))}
      </div>
    </header>
  );
}

function Quantity({ item, count, update, available }) {
  return (
    <div className="quantity-control">
      <button
        type="button"
        aria-label={`Bớt ${item.name}`}
        disabled={!count}
        onClick={() => update(item.id, -1)}
      >
        <Minus size={16} />
      </button>
      <output aria-live="polite" aria-label={`Đã chọn ${item.name}`}>
        {count || 0}
      </output>
      <button
        type="button"
        aria-label={`Thêm ${item.name}`}
        disabled={!available || count >= 20}
        onClick={() => update(item.id, 1)}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export default function FoodStore({ compact = false, onBooking }) {
  const { combos, isLive, error } = useCatalog();
  const loading = !isLive && !error;
  const [category, setCategory] = useState("all");
  const [flavor, setFlavor] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recommended");
  const [cart, setCart] = useState(readFoodCart);
  const [detail, setDetail] = useState(null);
  const [draftNotice, setDraftNotice] = useState("");
  const products = useMemo(
    () =>
      combos
        .map((combo) => ({ ...menuDetails(combo), ...combo }))
        .sort(
          (a, b) =>
            (categoryOrder[a.category] ?? 5) -
              (categoryOrder[b.category] ?? 5) ||
            (a.artIndex ?? 99) - (b.artIndex ?? 99),
        ),
    [combos],
  );
  const filtered = products.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      (flavor === "all" || item.flavor === flavor) &&
      matchesFood(item, query),
  );
  if (sort !== "recommended")
    filtered.sort(
      (a, b) =>
        (Number(a.price) - Number(b.price)) * (sort === "ascending" ? 1 : -1),
    );
  const visible = compact ? filtered.slice(0, 4) : filtered;
  const selected = products.filter((item) => cart[item.id] > 0);
  const quantity = selected.reduce((sum, item) => sum + cart[item.id], 0);
  const total = selected.reduce(
    (sum, item) => sum + Number(item.price) * cart[item.id],
    0,
  );
  function update(id, delta) {
    if (!products.some((item) => item.id === id) || (delta > 0 && !isLive))
      return;
    const next = {
      ...cart,
      [id]: Math.min(20, Math.max(0, (cart[id] || 0) + delta)),
    };
    setCart(next);
    setDraftNotice(
      saveFoodCart(next)
        ? ""
        : "Trình duyệt chưa lưu được món đã chọn. Bạn có thể thêm lại ở bước chọn ghế.",
    );
  }
  function clearCart() {
    setCart({});
    saveFoodCart({});
  }
  function resetFilters() {
    setQuery("");
    setFlavor("all");
    setCategory("all");
  }
  function navigateCategory(event, index) {
    const last = menuCategories.length - 1;
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % menuCategories.length
        : event.key === "ArrowLeft"
          ? (index + last) % menuCategories.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setCategory(menuCategories[next][0]);
    const tabs =
      event.currentTarget.parentElement.querySelectorAll('[role="tab"]');
    tabs[next].focus();
  }
  function continueBooking() {
    onBooking ? onBooking() : window.location.assign("/dat-ve");
  }

  const basket = (
    <aside
      className="food-cart food-basket"
      id="food-basket"
      aria-label="Món đã chọn"
    >
      <div className="food-basket-heading">
        <ShoppingBag size={21} />
        <div>
          <small>GIỎ BẮP NƯỚC</small>
          <h3>Món ngon của bạn</h3>
        </div>
        <span className="food-basket-count">{quantity}</span>
      </div>
      {quantity ? (
        <>
          <ul className="food-basket-items">
            {selected.map((item) => (
              <li key={item.id}>
                <MenuImage item={item} decorative />
                <div>
                  <strong>{item.name}</strong>
                  <small>{money(Number(item.price) * cart[item.id])}</small>
                  <Quantity
                    item={item}
                    count={cart[item.id]}
                    update={update}
                    available={isLive}
                  />
                </div>
              </li>
            ))}
          </ul>
          <button
            className="food-clear"
            type="button"
            aria-label="Xóa giỏ bắp nước"
            onClick={clearCart}
          >
            <Trash2 size={14} /> Xóa món đã chọn
          </button>
          <div className="food-basket-total">
            <span>Tạm tính bắp nước</span>
            <b>{money(total)}</b>
          </div>
          <button
            className="button button-primary"
            disabled={!isLive}
            onClick={continueBooking}
          >
            Chọn suất & thêm vào vé <ArrowRight size={17} />
          </button>
          <p className="food-basket-caption">
            Giá cuối cùng và ưu đãi được xác nhận khi giữ ghế.
          </p>
        </>
      ) : (
        <div className="food-basket-empty">
          <Popcorn size={44} />
          <strong>Buổi phim cần chút vị ngon.</strong>
          <p>
            Chạm dấu + ở món bạn thích. Combo sẽ theo bạn đến bước chọn ghế.
          </p>
          <span>
            <Check size={14} /> Chọn món trước, chưa thanh toán
          </span>
        </div>
      )}
      <div className="food-basket-steps">
        <span>
          <b>01</b> Chọn món
        </span>
        <i />
        <span>
          <b>02</b> Chọn vé
        </span>
        <i />
        <span>
          <b>03</b> Tận hưởng
        </span>
      </div>
    </aside>
  );

  return (
    <section
      id="food"
      className={`content-width discovery-section food-discovery food-studio ${compact ? "food-studio--compact" : ""}`}
    >
      <div className="discovery-heading">
        <div>
          <p className="nova-kicker">THỰC ĐƠN TẠI QUẦY</p>
          <h2>
            Chọn món bạn thích.
            <br className="mobile-only" /> <em>Thêm vào buổi phim.</em>
          </h2>
          <p>Khẩu vị nào cũng có một lựa chọn dành cho bạn.</p>
        </div>
        {compact ? (
          <Link className="discovery-text-link" href="/bap-nuoc">
            Xem thực đơn <ArrowUpRight size={18} />
          </Link>
        ) : (
          <span className="food-menu-count">
            {products.length} lựa chọn · {menuCategories.length - 1} danh mục
          </span>
        )}
      </div>
      {!compact && (
        <>
          <div
            className="discovery-tabs food-tabs"
            role="tablist"
            aria-label="Danh mục bắp nước"
          >
            {menuCategories.map(([id, label], index) => (
              <button
                role="tab"
                id={`food-tab-${id}`}
                aria-label={label}
                aria-selected={category === id}
                aria-controls="food-results"
                tabIndex={category === id ? 0 : -1}
                onKeyDown={(event) => navigateCategory(event, index)}
                onClick={() => setCategory(id)}
                key={id}
              >
                {label}
                <span>
                  {id === "all"
                    ? products.length
                    : products.filter((item) => item.category === id).length}
                </span>
              </button>
            ))}
          </div>
          <div className="food-tools">
            <label className="food-search">
              <Search size={18} />
              <input
                aria-label="Tìm món hoặc khẩu vị"
                type="search"
                placeholder="Bạn đang thèm món gì?"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Xóa từ tìm món"
                  onClick={() => setQuery("")}
                >
                  <X size={16} />
                </button>
              )}
            </label>
            <label className="food-sort">
              <span>Sắp xếp</span>
              <select
                aria-label="Sắp xếp thực đơn"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="recommended">NOVA gợi ý</option>
                <option value="ascending">Giá tăng dần</option>
                <option value="descending">Giá giảm dần</option>
              </select>
            </label>
          </div>
          <div className="food-flavors" role="group" aria-label="Lọc khẩu vị">
            {flavors.map(([id, label]) => (
              <button
                type="button"
                aria-pressed={flavor === id}
                onClick={() => setFlavor(id)}
                key={id}
              >
                {flavor === id && <Check size={13} />}
                {label}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="food-store-layout">
        <div
          id="food-results"
          className="food-results"
          role={compact ? undefined : "tabpanel"}
          aria-labelledby={compact ? undefined : `food-tab-${category}`}
        >
          {!compact && (
            <p className="food-result-count" role="status">
              {loading
                ? "Đang tải thực đơn…"
                : `${filtered.length} món hợp gu bạn`}
            </p>
          )}
          <div className="food-grid">
            {visible.map((item) => (
              <article
                className="food-product"
                key={item.id}
                data-combo-id={item.id}
              >
                <button
                  className="food-image"
                  type="button"
                  aria-label={`Xem chi tiết ${item.name}`}
                  onClick={() => setDetail(item)}
                >
                  <MenuImage item={item} />
                  <span className="food-product-badge">{item.badge}</span>
                  <i className="food-detail-arrow">
                    <ArrowUpRight size={18} />
                  </i>
                </button>
                <div className="food-product-body">
                  <span className="food-taste">
                    {item.taste}
                    {item.serves && ` · ${item.serves}`}
                  </span>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="food-product-bottom">
                    <strong>{money(item.price)}</strong>
                    <Quantity
                      item={item}
                      count={cart[item.id]}
                      update={update}
                      available={isLive}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
          {visible.length === 0 && (
            <div className="discovery-empty">
              <Popcorn size={32} />
              <h3>
                {loading
                  ? "Đang chuẩn bị vị ngon"
                  : "Thực đơn đang được cập nhật"}
              </h3>
              <p>
                {query || flavor !== "all"
                  ? "Thử một từ khóa hoặc khẩu vị khác nhé."
                  : "Hẹn bạn quay lại với những món ngon mới."}
              </p>
              {(query || flavor !== "all" || category !== "all") && (
                <button
                  type="button"
                  className="button button-glass"
                  onClick={resetFilters}
                >
                  Xem lại toàn bộ món
                </button>
              )}
            </div>
          )}
        </div>
        {(!compact || quantity > 0) && basket}
      </div>
      {!isLive && (
        <p role="status" className="discovery-footnote">
          Đặt món sẽ mở khi kết nối đặt vé sẵn sàng.
        </p>
      )}
      {draftNotice && (
        <p role="alert" className="discovery-footnote">
          {draftNotice}
        </p>
      )}
      {!compact && (
        <div className="food-night-guide">
          <span className="nova-kicker">CHỌN MÓN XONG, CHỌN PHIM THÔI</span>
          <h3>Vị ngon đi cùng một bộ phim hay.</h3>
          <p>
            Đã chọn xong món? Tìm phim, chọn giờ và mang theo combo bạn thích.
          </p>
          <Link href="/dat-ve" className="button button-glass">
            Tìm suất chiếu của bạn <ArrowUpRight size={17} />
          </Link>
        </div>
      )}
      <p className="discovery-footnote">
        Ảnh món tham khảo; thành phần và số lượng ghi trong mô tả. Bắp nước mua
        kèm vé, giá cuối cùng được xác nhận trong đơn giữ ghế.
      </p>
      {!compact && quantity > 0 && (
        <div className="food-mobile-bar">
          <a href="#food-basket">
            <ShoppingBag size={19} />
            <span>
              {quantity} món đã chọn<strong>{money(total)}</strong>
            </span>
          </a>
          <button
            className="button button-primary"
            disabled={!isLive}
            onClick={continueBooking}
          >
            Chọn vé <ArrowRight size={16} />
          </button>
        </div>
      )}
      {detail && (
        <Modal
          title={detail.name}
          className="food-detail"
          wide
          onClose={() => setDetail(null)}
          image=""
        >
          <div className="food-detail-content">
            <MenuImage item={detail} priority />
            <div>
              <span className="food-detail-tag">{detail.badge}</span>
              <h3>
                Đúng vị.
                <br />
                Đúng tâm trạng.
              </h3>
              <p>{detail.description}</p>
              <div className="food-detail-facts">
                <span>
                  Khẩu vị<strong>{detail.taste}</strong>
                </span>
                <span>
                  Phù hợp<strong>{detail.serves || "Theo lựa chọn"}</strong>
                </span>
              </div>
              <strong className="food-detail-price">
                {money(detail.price)}
              </strong>
              <Quantity
                item={detail}
                count={cart[detail.id]}
                update={update}
                available={isLive}
              />
              <p className="food-detail-caption">
                Mua cùng vé xem phim. Số lượng tối đa 20 cho mỗi món.
              </p>
              <button
                className="button button-primary"
                onClick={() => setDetail(null)}
              >
                Xong, tiếp tục chọn món <Check size={17} />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
