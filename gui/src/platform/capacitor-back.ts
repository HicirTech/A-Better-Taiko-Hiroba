import { App } from "@capacitor/app";

import type { SystemBack } from "./system-back";

/** Android's Back via Capacitor's App plugin, which takes Back from Android whether or not anyone
 * hears it: with no listener a press does nothing. Leaving minimises, as Android 12+ does. */
export const capacitorBack: SystemBack = {
  onScreen: false,
  listen: (onPress) => {
    const heard = App.addListener("backButton", () => onPress());
    return () => void heard.then((handle) => handle.remove());
  },
  leave: () => void App.minimizeApp(),
};

/** iOS has no Back to hear, and no app leaves itself there: the app's button is all there is. */
export const onScreenBack: SystemBack = {
  onScreen: true,
  listen: () => () => undefined,
  leave: () => undefined,
};
