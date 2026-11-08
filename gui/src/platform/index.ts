import { Capacitor } from "@capacitor/core";

import { type HirobaSessionPort, settledPort } from "../shared/session-port";
import { desktopLink } from "./desktop-link";
import { type DesktopPictures, desktopShare } from "./desktop-share";
import type { SystemBack } from "./system-back";
import type { SystemCamera } from "./system-camera";
import type { SystemLaunch } from "./system-launch";
import type { SystemLink } from "./system-link";
import type { SystemShare } from "./system-share";
import type { SystemToast } from "./system-toast";

export type { SystemBack } from "./system-back";
export type { SystemCamera } from "./system-camera";
export type { SystemLaunch } from "./system-launch";
export type { SystemLink } from "./system-link";
export type { PictureWay, SystemShare } from "./system-share";
export type { SystemToast } from "./system-toast";

declare global {
  interface Window {
    /** Exposed by the Electron preload; absent everywhere else. */
    readonly abth?: HirobaSessionPort;
    /** Exposed by the Electron preload beside the port; absent everywhere else. */
    readonly abthPictures?: DesktopPictures;
  }
}

const IOS_VIEWPORT =
  "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

/** What the shell gives: port, link, share, and Capacitor's Back, Toast, camera and launch. */
export interface Platform {
  readonly port: HirobaSessionPort;
  readonly link: SystemLink;
  readonly share: SystemShare;
  readonly back?: SystemBack;
  readonly toast?: SystemToast;
  readonly camera?: SystemCamera;
  readonly launch?: SystemLaunch;
}

/** Picks the platform layer; one bundle ships in all shells. Capacitor's modules load only there,
 * so the desktop never loads the in-app browser code. `closeLabel` is asked each time it opens. */
export async function connectPlatform({
  closeLabel,
}: {
  readonly closeLabel: () => string;
}): Promise<Platform | null> {
  // The preload lays both out together.
  const { abth, abthPictures } = window;
  if (abth !== undefined && abthPictures !== undefined) {
    return {
      port: settledPort(abth),
      link: desktopLink,
      share: desktopShare(abthPictures),
    };
  }
  const os = Capacitor.getPlatform();
  if (os === "ios") {
    // iOS draws under its notch and home bar only when told to, and only then says their insets.
    document.querySelector('meta[name="viewport"]')?.setAttribute("content", IOS_VIEWPORT);
  }
  if (os === "android" || os === "ios") {
    const [
      { createCapacitorPort },
      { capacitorBack, onScreenBack },
      { capacitorCamera },
      { capacitorLaunch },
      { capacitorLink },
      { capacitorShare },
      { capacitorToast },
    ] = await Promise.all([
      import("./capacitor"),
      import("./capacitor-back"),
      import("./capacitor-camera"),
      import("./capacitor-launch"),
      import("./capacitor-link"),
      import("./capacitor-share"),
      import("./capacitor-toast"),
    ]);
    const port = settledPort(await createCapacitorPort({ os, closeLabel, indexedDb: indexedDB }));
    return {
      port,
      link: capacitorLink,
      share: await capacitorShare(os),
      back: os === "ios" ? onScreenBack : capacitorBack,
      toast: capacitorToast,
      camera: capacitorCamera,
      launch: capacitorLaunch,
    };
  }
  return null;
}
