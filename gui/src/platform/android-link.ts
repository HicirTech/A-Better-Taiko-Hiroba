import { InAppBrowser } from "@capacitor/inappbrowser";

import type { SystemLink } from "./system-link";

/** Android's: the default browser, through Capacitor's In-App Browser plugin. */
export const androidLink: SystemLink = {
  open: (url) => void InAppBrowser.openInExternalBrowser({ url }),
};
