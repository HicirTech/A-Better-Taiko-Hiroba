import { Capacitor } from "@capacitor/core";

import { type HirobaSessionPort, settledPort } from "../shared/session-port";
import { desktopLink } from "./desktop-link";
import { type DesktopPictures, desktopShare } from "./desktop-share";
import type { SystemBack } from "./system-back";
import type { SystemLink } from "./system-link";
import type { SystemShare } from "./system-share";
import type { SystemToast } from "./system-toast";

export type { SystemBack } from "./system-back";
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

/** Which shell the bundle runs in, with its port, link and share, and Android's Back and Toast. */
export type Platform =
  | {
      readonly shell: "desktop";
      readonly port: HirobaSessionPort;
      readonly link: SystemLink;
      readonly share: SystemShare;
    }
  | {
      readonly shell: "android";
      readonly port: HirobaSessionPort;
      readonly link: SystemLink;
      readonly share: SystemShare;
      readonly back: SystemBack;
      readonly toast: SystemToast;
    };

/** Picks the platform layer; one bundle ships in both shells. Android's modules load only there,
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
      shell: "desktop",
      port: settledPort(abth),
      link: desktopLink,
      share: desktopShare(abthPictures),
    };
  }
  if (Capacitor.getPlatform() === "android") {
    const [
      { createAndroidPort },
      { androidBack },
      { androidLink },
      { androidShare },
      { androidToast },
    ] = await Promise.all([
      import("./android"),
      import("./android-back"),
      import("./android-link"),
      import("./android-share"),
      import("./android-toast"),
    ]);
    const port = settledPort(await createAndroidPort({ closeLabel, indexedDb: indexedDB }));
    return {
      shell: "android",
      port,
      link: androidLink,
      share: androidShare,
      back: androidBack,
      toast: androidToast,
    };
  }
  return null;
}
