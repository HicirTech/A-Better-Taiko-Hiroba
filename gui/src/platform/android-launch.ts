import { SplashScreen } from "@capacitor/splash-screen";

import type { SystemLaunch } from "./system-launch";

/** Android's launch screen, held by Capacitor's SplashScreen plugin. */
export const androidLaunch: SystemLaunch = {
  covered: () => void SplashScreen.hide(),
};
