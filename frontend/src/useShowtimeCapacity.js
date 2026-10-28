import { useEffect, useState } from "react";
import { apiRequest } from "./api/client.js";

/** Only counts for the current cards; never fetch every show's full seat map. */
export function useShowtimeCapacity(ids) {
  const key = [...new Set(ids)].sort().join(",");
  const [snapshot, setSnapshot] = useState({ key: "", items: new Map() });
  useEffect(() => {
    if (!key) return;
    let stopped = false,
      active,
      pending = false;
    async function load() {
      if (stopped || document.hidden) return;
      if (active) {
        pending = true;
        return;
      }
      const controller = new AbortController();
      active = controller;
      try {
        const entries = [],
          values = key.split(",");
        for (let i = 0; i < values.length; i += 50) {
          const result = await apiRequest(
            `/showtimes/capacities?ids=${values.slice(i, i + 50).join(",")}`,
            { signal: controller.signal },
          );
          if (!Array.isArray(result.data))
            throw new Error("Capacity snapshot unavailable");
          entries.push(
            ...result.data.filter(
              (item) =>
                Number.isInteger(item.available) &&
                Number.isInteger(item.total) &&
                item.available >= 0 &&
                item.available <= item.total,
            ),
          );
        }
        if (!stopped)
          setSnapshot({
            key,
            items: new Map(entries.map((item) => [item.showtimeId, item])),
          });
      } catch {
        // Unknown availability stays unknown; stale counts are not presented as live.
        if (!stopped) setSnapshot({ key, items: new Map() });
      } finally {
        if (active === controller) active = undefined;
        if (pending && !stopped) {
          pending = false;
          void load();
        }
      }
    }
    void load();
    const interval = setInterval(load, 30000);
    const visible = () => {
      if (!document.hidden) void load();
    };
    window.addEventListener("focus", visible);
    window.addEventListener("nova-seat-capacity-change", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      stopped = true;
      clearInterval(interval);
      active?.abort();
      window.removeEventListener("focus", visible);
      window.removeEventListener("nova-seat-capacity-change", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [key]);
  return snapshot.key === key ? snapshot.items : new Map();
}
