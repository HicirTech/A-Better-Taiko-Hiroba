import { App } from "@capacitor/app";

import type { SystemBack } from "./system-back";

/**
 * Android's Back, through Capacitor's App plugin. The plugin takes Back from Android whether anyone
 * hears it or not, and with no one hearing it a press does nothing: the window hears it for as long
 * as it is open, and leaves the app as Android 12 and later do, to the background.
 */
export const androidBack: SystemBack = {
  listen: (onPress) => {
    const heard = App.addListener("backButton", () => onPress());
    return () => void heard.then((handle) => handle.remove());
  },
  leave: () => void App.minimizeApp(),
};
