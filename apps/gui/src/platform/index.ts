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
 * Picks the platform layer this bundle is running on. The same bundle ships in both shells; the
 * Electron preload exposes `window.abth`. Anywhere else there is no platform layer yet.
 */
export function connectPlatform(): Platform | null {
  if (window.abth !== undefined) {
    return { shell: "desktop", port: window.abth };
  }
  return null;
}
