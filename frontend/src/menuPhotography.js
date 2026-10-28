// Existing photographs, stored locally. Sources and upstream revisions are in
// public/images/food-photography/sources.json. These are menu reference photos.
const path = (file) => `/images/food-photography/${file}`;
export const foodPhotos = {
  bucket: {
    src: path("popcorn-bucket.png"),
    label: "Bắp rang",
    fit: "contain",
  },
  plain: { src: path("popcorn-plain.webp"), label: "Bắp rang", fit: "cover" },
  cheese: {
    src: path("popcorn-cheese.webp"),
    label: "Bắp phô mai",
    fit: "cover",
  },
  caramel: {
    src: path("popcorn-caramel.webp"),
    label: "Bắp caramel",
    fit: "cover",
  },
  mix: {
    src: path("popcorn-denver-mix.webp"),
    label: "Bắp hai vị",
    fit: "cover",
  },
  spicy: {
    src: path("popcorn-spicy-hot-cheese.webp"),
    label: "Bắp phô mai cay",
    fit: "cover",
  },
  savory: {
    src: path("popcorn-white-cheddar.webp"),
    label: "Bắp rang mặn",
    fit: "cover",
  },
  chocolate: {
    src: path("popcorn-dark-chocolate.webp"),
    label: "Bắp chocolate",
    fit: "cover",
  },
  cola: { src: path("coca.png"), label: "Nước ngọt", fit: "contain" },
  water: { src: path("dasani.png"), label: "Nước suối", fit: "contain" },
  peach: { src: path("fruit-tea.png"), label: "Trà trái cây", fit: "cover" },
  lime: { src: path("citrus-tea.png"), label: "Trà chanh", fit: "cover" },
  berry: {
    src: path("berry-drink.png"),
    label: "Đồ uống vị dâu",
    fit: "contain",
  },
  hotdog: { src: path("hotdog.png"), label: "Hotdog", fit: "contain" },
  nachos: { src: path("nachos.jpg"), label: "Nachos", fit: "cover" },
  fries: { src: path("fries.jpeg"), label: "Khoai tây chiên", fit: "contain" },
  nuggets: {
    src: path("nuggets-reference.png"),
    label: "Gà viên",
    fit: "nuggets",
  },
};
const part = (photo, quantity = 1) => ({
  ...foodPhotos[photo],
  key: photo,
  quantity,
});
const recipes = {
  party69: [part("bucket"), part("cola", 2)],
  solo: [part("bucket"), part("cola")],
  couple: [part("mix"), part("cola", 2), part("nachos")],
  family: [part("bucket", 2), part("cola", 4), part("hotdog", 2)],
  festival: [part("mix"), part("cola")],
  infinity: [part("bucket"), part("cola", 2)],
  "pop-sweet": [part("plain")],
  "pop-cheese": [part("cheese")],
  "pop-caramel": [part("caramel")],
  "pop-mix": [part("mix")],
  cola: [part("cola")],
  peach: [part("peach")],
  water: [part("water")],
  hotdog: [part("hotdog")],
  nachos: [part("nachos")],
  fries: [part("fries")],
  "pop-spicy": [part("spicy")],
  "pop-seaweed": [part("savory")],
  "pop-chocolate": [part("chocolate")],
  strawberry: [part("berry")],
  lime: [part("lime")],
  nuggets: [part("nuggets")],
  "green-pair": [part("savory"), part("peach")],
  "berry-date": [part("cheese", 2), part("berry", 2)],
};
export function menuPhotographs(item) {
  const custom = item?.imageUrl || item?.image;
  // Older seeds persisted SVG illustrations. Do not let those replace the new
  // photographs; genuine administrator uploads still take precedence.
  const legacy =
    /^\/images\/menu\/(?:[a-z0-9-]+\.svg|nova-menu-studio\.webp|nova-sharing-hero\.webp)(?:[?#].*)?$/i.test(
      custom || "",
    ) ||
    /^\/images\/campaigns\/nova-(?:dream-city|movie-night)\.png(?:[?#].*)?$/i.test(
      custom || "",
    );
  if (custom && !legacy)
    return [
      {
        src: custom,
        label: item.name,
        fit: "contain",
        key: "custom",
        quantity: 1,
      },
    ];
  return recipes[item?.key] || [];
}
export const foodHeroPhoto = path("popcorn-sharing.webp");
