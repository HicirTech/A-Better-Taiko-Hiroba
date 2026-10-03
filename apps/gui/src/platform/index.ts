import { Capacitor } from "@capacitor/core";

import type { HirobaSessionPort } from "../session-port";
import type { SystemBack } from "./system-back";
import type { SystemToast } from "./system-toast";

export type { SystemBack } from "./system-back";
export type { SystemToast } from "./system-toast";

declare global {
  interface Window {
    /** Exposed by the Electron preload; absent everywhere else. */
    readonly abth?: HirobaSessionPort;
  }
}

/** Which shell the bundle runs in, with its port and what Android alone has: Back and the Toast. */
export type Platform =
  | { readonly shell: "desktop"; readonly port: HirobaSessionPort }
  | {
      readonly shell: "android";
      readonly port: HirobaSessionPort;
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
    return { shell: "desktop", port: window.abth };
  }
  if (Capacitor.getPlatform() === "android") {
    const [{ createAndroidPort }, { androidBack }, { androidToast }] = await Promise.all([
      import("./android"),
      import("./android-back"),
      import("./android-toast"),
    ]);
    const port = await createAndroidPort({ closeLabel, indexedDb: indexedDB });
    return { shell: "android", port, back: androidBack, toast: androidToast };
  }
  return null;
}
