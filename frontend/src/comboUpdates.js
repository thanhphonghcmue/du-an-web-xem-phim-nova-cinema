const eventName = "nova:combos-updated";
const channelName = "nova-catalogue";
export function publishComboUpdate() {
  window.dispatchEvent(new Event(eventName));
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(channelName);
  channel.postMessage(eventName);
  channel.close();
}
export function subscribeComboUpdates(refresh) {
  window.addEventListener(eventName, refresh);
  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(channelName);
  if (channel)
    channel.onmessage = (event) => {
      if (event.data === eventName) refresh();
    };
  return () => {
    window.removeEventListener(eventName, refresh);
    channel?.close();
  };
}
