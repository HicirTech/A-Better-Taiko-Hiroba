import type { SystemLink } from "./system-link";

/** The desktop's: a new window, which the main process opens in the system's browser or refuses. */
export const desktopLink: SystemLink = {
  open: (url) => void window.open(url, "_blank", "noopener,noreferrer"),
};
