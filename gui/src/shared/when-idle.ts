// Safari has no idle callback, so its work waits about as long as a page takes to settle.
const SETTLE_MS = 200;

/** Runs `work` once the window is idle; what it gives back calls that off. */
export function whenIdle(work: () => void): () => void {
  if ("requestIdleCallback" in globalThis) {
    const idle = requestIdleCallback(() => work());
    return () => cancelIdleCallback(idle);
  }
  const waiting = setTimeout(work, SETTLE_MS);
  return () => clearTimeout(waiting);
}
