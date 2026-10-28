/** Opt-in browser probe. No DOM contents, URLs, credentials or QR values collected. */
export function startUiFreezeObserver() {
  globalThis.novaUiProbe?.stop();
  let frames = [],
    tasks = [],
    previous,
    raf,
    observer;
  const frame = (now) => {
    if (!document.hidden && previous !== undefined) {
      frames.push({ at: now, ms: now - previous });
      if (frames.length > 7200) frames.shift();
    }
    previous = document.hidden ? undefined : now;
    raf = requestAnimationFrame(frame);
  };
  if (
    globalThis.PerformanceObserver?.supportedEntryTypes?.includes("longtask")
  ) {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        tasks.push({ at: entry.startTime, ms: entry.duration });
      tasks = tasks.slice(-500);
    });
    observer.observe({ type: "longtask", buffered: false });
  }
  const percentile = (values, fraction) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.length
      ? +sorted[Math.ceil(sorted.length * fraction) - 1].toFixed(2)
      : null;
  };
  const visibility = () => {
    previous = undefined;
  };
  document.addEventListener("visibilitychange", visibility);
  raf = requestAnimationFrame(frame);
  globalThis.novaUiProbe = {
    mark: () => performance.now(),
    snapshot: (since = 0) => {
      const selectedFrames = frames.filter((f) => f.at >= since),
        selectedTasks = tasks.filter((t) => t.at >= since);
      const total = selectedFrames.reduce((n, f) => n + f.ms, 0);
      return {
        frameSamples: selectedFrames.length,
        fps: total
          ? +((1000 * selectedFrames.length) / total).toFixed(2)
          : null,
        frameP95Ms: percentile(
          selectedFrames.map((f) => f.ms),
          0.95,
        ),
        longTasks: selectedTasks.length,
        longTaskTotalMs: +selectedTasks
          .reduce((n, t) => n + t.ms, 0)
          .toFixed(2),
        longestTaskMs: selectedTasks.length
          ? Math.max(...selectedTasks.map((t) => t.ms))
          : 0,
      };
    },
    stop: () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      frames = [];
      tasks = [];
    },
  };
}
