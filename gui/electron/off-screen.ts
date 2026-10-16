import { type BrowserWindow, type BrowserWindowConstructorOptions, screen } from "electron";

const GAP_PX = 100;

/** A window made with these opens hidden and out of the taskbar, for `showOffScreen`. */
export const OFF_SCREEN_OPTIONS: BrowserWindowConstructorOptions = {
  show: false,
  skipTaskbar: true,
};

/** Moves a window left of every display, shows it without taking focus, and keeps it there. */
export function showOffScreen(window: BrowserWindow): void {
  // Made first, then moved: a window made off every display has no frame, so its page grows.
  const { width, height } = window.getBounds();
  const keep = () => {
    const leftmost = Math.min(0, ...screen.getAllDisplays().map((display) => display.bounds.x));
    const place = { x: leftmost - width - GAP_PX, y: 0, width, height };
    const now = window.getBounds();
    if (now.x !== place.x || now.y !== place.y || now.width !== width || now.height !== height) {
      window.setBounds(place);
    }
  };
  keep();
  window.showInactive();
  // A display that sleeps or goes makes Windows move and shrink windows; this one goes back.
  window.on("move", keep);
  window.on("resize", keep);
}
