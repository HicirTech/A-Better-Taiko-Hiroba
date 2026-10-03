import type { WriteKind } from "../session-port";

export type WritePlatform = "desktop" | "android";

/** Kinds of write made for real from each platform and read back as planned; any other also reads
 * another page before and after. They are apart: a desktop success says nothing of Android's. */
export const LIVE_CHECKED_WRITES: Readonly<Record<WritePlatform, readonly WriteKind[]>> = {
  desktop: ["costume"],
  android: [],
};
