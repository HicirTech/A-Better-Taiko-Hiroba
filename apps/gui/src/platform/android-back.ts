import { App } from "@capacitor/app";

import type { SystemBack } from "./system-back";

/** Android's Back via Capacitor's App plugin, which takes Back from Android whether or not anyone
 * hears it: with no listener a press does nothing. Leaving minimises, as Android 12+ does. */
export const androidBack: SystemBack = {
  listen: (onPress) => {
    const heard = App.addListener("backButton", () => onPress());
    return () => void heard.then((handle) => handle.remove());
  },
  leave: () => void App.minimizeApp(),
};
