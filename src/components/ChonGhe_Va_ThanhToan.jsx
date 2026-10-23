// Giữ hai kho tách biệt: chọn một luồng duy nhất theo chế độ API đã cấu hình.
import { useCatalog } from "../catalog.js";
import DatVeBackend from "./DatVeBackend.jsx";
import DatVeDemo from "./DatVeDemo.jsx";
export default function ChonGhe_Va_ThanhToan(props) {
  const { runtimeMode } = useCatalog();
  return runtimeMode === "standalone" ? (
    <DatVeDemo {...props} />
  ) : (
    <DatVeBackend {...props} />
  );
}
