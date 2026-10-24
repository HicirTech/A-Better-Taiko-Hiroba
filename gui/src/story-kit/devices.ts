import type { Viewport } from "storybook/viewport";

import { WINDOW_CONTENT_PX } from "../platform/desktop-window";
import type { ModalLook } from "../ui/large-modal";
import { REDUCED_MOTION } from "../ui/window-move";

/** The toolbar's devices: the PC's window as it opens, and two Android touch screens. */
export const DEVICES = {
  pc: {
    name: "PC",
    styles: { width: `${WINDOW_CONTENT_PX.width}px`, height: `${WINDOW_CONTENT_PX.height}px` },
    type: "desktop",
  },
  phone: { name: "Android phone", styles: { width: "412px", height: "915px" }, type: "mobile" },
  tablet: { name: "Android tablet", styles: { width: "1280px", height: "800px" }, type: "tablet" },
} as const satisfies Record<string, Viewport>;

export type Device = keyof typeof DEVICES;

const isDevice = (value: unknown): value is Device =>
  typeof value === "string" && Object.hasOwn(DEVICES, value);

/** The device a story is seen on, from the viewport global; a PC's when the toolbar has none. */
export function deviceOf(globals: { readonly viewport?: unknown }): Device {
  const { viewport } = globals;
  const value =
    typeof viewport === "object" && viewport !== null && "value" in viewport
      ? viewport.value
      : viewport;
  return isDevice(value) ? value : "pc";
}

export const isTouchScreen = (device: Device): boolean => DEVICES[device].type !== "desktop";

/** Whether the story is seen on a touch screen, where the app reads a long press. */
export const touchOf = (globals: { readonly viewport?: unknown }): boolean =>
  isTouchScreen(deviceOf(globals));

/** Whether the story's window is wide enough for the side panel, as all but the phone's are. */
export const wideOf = (globals: { readonly viewport?: unknown }): boolean =>
  deviceOf(globals) !== "phone";

/** How a large modal is drawn on the story's device: whole on a phone, with no pipelines page. */
export const modalLookOf = (globals: { readonly viewport?: unknown }): ModalLook => ({
  phone: deviceOf(globals) === "phone",
  reducedMotion: matchMedia(REDUCED_MOTION).matches,
  covered: false,
});

/** A story pinned to a device, which the toolbar then leaves as it is. */
export const onDevice = (device: Device) => ({ viewport: { value: device, isRotated: false } });
