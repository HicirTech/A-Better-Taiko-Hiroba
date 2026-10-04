import { Capacitor } from "@capacitor/core";

import type { HirobaSessionPort } from "../session-port";
import { desktopLink } from "./desktop-link";
import type { SystemBack } from "./system-back";
import type { SystemLink } from "./system-link";
import type { SystemToast } from "./system-toast";

export type { SystemBack } from "./system-back";
export type { SystemLink } from "./system-link";
export type { SystemToast } from "./system-toast";

declare global {
  interface Window {
    /** Exposed by the Electron preload; absent everywhere else. */
    readonly abth?: HirobaSessionPort;
  }
}

/** Which shell the bundle runs in, with its port and link, and Android's own Back and Toast. */
export type Platform =
  | { readonly shell: "desktop"; readonly port: HirobaSessionPort; readonly link: SystemLink }
  | {
      readonly shell: "android";
      readonly port: HirobaSessionPort;
      readonly link: SystemLink;
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
  if (window.abth !== undefined) {
    return { shell: "desktop", port: window.abth, link: desktopLink };
  }
  if (Capacitor.getPlatform() === "android") {
    const [{ createAndroidPort }, { androidBack }, { androidLink }, { androidToast }] =
      await Promise.all([
        import("./android"),
        import("./android-back"),
        import("./android-link"),
        import("./android-toast"),
      ]);
    const port = await createAndroidPort({ closeLabel, indexedDb: indexedDB });
    return { shell: "android", port, link: androidLink, back: androidBack, toast: androidToast };
  }
  return null;
}
