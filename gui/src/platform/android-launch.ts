import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";

import type { SystemLaunch } from "./system-launch";

/** Android's launch screen, held by Capacitor's SplashScreen plugin, and the app's pauses. */
export const androidLaunch: SystemLaunch = {
  covered: () => void SplashScreen.hide(),
  listenReturns: (onReturn) => {
    // The wall clock: the steady one stands still while the device sleeps.
    let leftAt: number | null = null;
    const left = App.addListener("pause", () => {
      leftAt = Date.now();
    });
    const back = App.addListener("resume", () => {
      if (leftAt !== null) {
        onReturn(Date.now() - leftAt);
      }
      leftAt = null;
    });
    return () => {
      void left.then((handle) => handle.remove());
      void back.then((handle) => handle.remove());
    };
  },
};
