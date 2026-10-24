import { useCatalog } from "../catalog.js";
import { useI18n } from "../i18n.js";
import QuickChoice from "./QuickChoice.jsx";
export default function CinemaPicker({
  value,
  onChange,
  label = "Chọn cụm rạp",
  scheduledOnly = false,
}) {
  const { t } = useI18n();
  const { cinemas, rooms, isLive } = useCatalog();
  return (
    <QuickChoice
      disabled={!isLive}
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
          detail: `${rooms.filter((room) => room.cinemaId === cinema.id).length} ${t("phòng chiếu")} · ${cinema.formats || "NOVA Cinema"}`,
        }))}
    />
  );
}
