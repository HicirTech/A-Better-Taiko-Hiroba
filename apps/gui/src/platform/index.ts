import { Capacitor } from "@capacitor/core";

import type { HirobaSessionPort } from "../session-port";

declare global {
  interface Window {
    /** Exposed by the Electron preload; absent everywhere else. */
    readonly abth?: HirobaSessionPort;
  }
}

/** Which shell the bundle runs in. The interface only uses it to describe what the shell keeps. */
export type Shell = "desktop" | "android";

export interface Platform {
  readonly shell: Shell;
  readonly port: HirobaSessionPort;
}

/**
 * Picks the platform layer this bundle is running on. The same bundle ships in both shells: the
 * Electron preload exposes `window.abth`, and Capacitor reports its native platform. The Android
 * module is loaded only on Android, so the desktop never loads the in-app browser code.
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
    const { createAndroidPort } = await import("./android");
    const port = await createAndroidPort({ closeLabel, indexedDb: indexedDB });
    return { shell: "android", port };
  }
  return null;
}
