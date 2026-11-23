/**
 * Leaving a gift for another page needs a connection: without one the browser puts its own error
 * page where the gift was, and Back brings the gift at its first screen, to be played again. So a
 * tap that leaves ("Send one back") is held here while the phone says it is offline.
 *
 * `go` runs at once when there is a connection, or when one comes back, if that is within `ms`.
 * After that the wait is over and `go` never runs: a page that changed by itself minutes after the
 * tap would be a surprise. The function returned gives the wait up early. `go` runs once at most.
 *
 * `navigator.onLine` only knows whether the phone is on a network at all. A network that leads
 * nowhere (a hotel's sign-in page, a train in a tunnel) still says "online", and the tap goes ahead.
 */
type Online = Pick<Window, "addEventListener" | "removeEventListener" | "setTimeout" | "clearTimeout"> & { navigator: { onLine: boolean } };

export function whenOnline(go: () => void, ms: number, w: Online = window): () => void {
  // Only a plain "no" holds the tap: a browser that doesn't say is taken to be online.
  if (w.navigator.onLine !== false) {
    go();
    return () => {};
  }
  let timer = 0;
  const stop = () => {
    w.removeEventListener("online", back);
    w.clearTimeout(timer);
  };
  function back() {
    stop();
    go();
  }
  w.addEventListener("online", back);
  timer = w.setTimeout(stop, ms);
  return stop;
}
