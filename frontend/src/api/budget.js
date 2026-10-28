export const REQUEST_TIMEOUT_MS = 8000;

export function requestBudget(callerSignal, milliseconds = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const cancel = () => controller.abort(callerSignal.reason);
  if (callerSignal?.aborted) cancel();
  else callerSignal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(
    () =>
      controller.abort(
        new DOMException("Request deadline exceeded", "TimeoutError"),
      ),
    milliseconds,
  );
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", cancel);
    },
  };
}

// Bound waits as well as fetch: session locks and a shared refresh cannot keep a
// component submitting after its own eight-second budget has elapsed.
export function abortable(task, signal) {
  return new Promise((resolve, reject) => {
    const clean = () => signal.removeEventListener("abort", cancel);
    const cancel = () => {
      clean();
      reject(signal.reason || new DOMException("Aborted", "AbortError"));
    };
    Promise.resolve(task).then(
      (value) => {
        clean();
        resolve(value);
      },
      (error) => {
        clean();
        reject(error);
      },
    );
    if (signal.aborted) cancel();
    else signal.addEventListener("abort", cancel, { once: true });
  });
}
