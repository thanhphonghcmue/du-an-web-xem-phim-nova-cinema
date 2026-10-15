import { createContext, useContext } from "react";
export const CatalogContext = createContext(null);
export const useCatalog = () => useContext(CatalogContext);
export const dayKey = (value) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
export const timeLabel = (value) =>
  new Date(value).toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
