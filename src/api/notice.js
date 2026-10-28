export function notifyApiError(message) {
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent("nova:api-error", { detail: { message } }),
    );
}
