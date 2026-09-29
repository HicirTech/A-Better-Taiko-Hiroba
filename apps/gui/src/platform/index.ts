import { Capacitor } from "@capacitor/core";

import type { HirobaSessionPort } from "../session-port";
import type { SystemBack } from "./system-back";

export type { SystemBack } from "./system-back";

declare global {
  interface Window {
    /** Exposed by the Electron preload; absent everywhere else. */
    readonly abth?: HirobaSessionPort;
  }
}

/**
 * Which shell the bundle runs in, with its port and what that shell alone has: Android's Back. The
 * interface only uses the shell to describe what the shell keeps.
 */
export type Platform =
  | { readonly shell: "desktop"; readonly port: HirobaSessionPort }
  | { readonly shell: "android"; readonly port: HirobaSessionPort; readonly back: SystemBack };

/**
 * Picks the platform layer this bundle is running on. The same bundle ships in both shells: the
 * Electron preload exposes `window.abth`, and Capacitor reports its native platform. The Android
 * modules are loaded only on Android, so the desktop never loads the in-app browser code.
 *
 * `closeLabel` words the in-app browser's close button, asked for each time the browser opens.
 */
export async function connectPlatform({
  closeLabel,
}: {
  readonly closeLabel: () => string;
}): Promise<Platform | null> {
  if (window.abth !== undefined) {
    return { shell: "desktop", port: window.abth };
  }
  if (Capacitor.getPlatform() === "android") {
    const [{ createAndroidPort }, { androidBack }] = await Promise.all([
      import("./android"),
      import("./android-back"),
    ]);
    const port = await createAndroidPort({ closeLabel, indexedDb: indexedDB });
    return { shell: "android", port, back: androidBack };
  }
  return null;
}
