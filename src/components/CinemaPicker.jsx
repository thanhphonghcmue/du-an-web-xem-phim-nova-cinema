import { useCatalog } from "../catalog.js";
import QuickChoice from "./QuickChoice.jsx";
export default function CinemaPicker({
  value,
  onChange,
  label = "Chọn cụm rạp",
  scheduledOnly = false,
}) {
  const { cinemas, rooms } = useCatalog();
  return (
    <QuickChoice
      label={label}
      title="Chọn rạp cho cuộc hẹn"
      value={value}
      onChange={onChange}
      placeholder="Chọn rạp NOVA"
      items={cinemas
        .filter((cinema) => !scheduledOnly || cinema.movies.length)
        .map((cinema) => ({
          id: cinema.id,
          name: cinema.name,
          description: `${cinema.city} · ${cinema.address}`,
          detail: `${rooms.filter((room) => room.cinemaId === cinema.id).length} phòng chiếu · ${cinema.formats || "NOVA Cinema"}`,
        }))}
    />
  );
}
