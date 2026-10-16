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
  const keep = () => {
    const leftmost = Math.min(0, ...screen.getAllDisplays().map((display) => display.bounds.x));
    const { x, y, width } = window.getBounds();
    const left = leftmost - width - GAP_PX;
    if (x !== left || y !== 0) {
      window.setPosition(left, 0);
    }
  };
  keep();
  window.showInactive();
  // A display that sleeps or goes moves windows; this one goes back. Resized off every display a
  // window loses its frame, so its size is left alone: the e2e holds the page's size itself.
  window.on("move", keep);
}
