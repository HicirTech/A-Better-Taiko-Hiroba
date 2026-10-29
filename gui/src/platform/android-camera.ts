import type { SystemCamera } from "./system-camera";

/** The back camera through the WebView, which asks the player's leave the first time. */
export const androidCamera: SystemCamera = {
  async open() {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
    } catch {
      return null;
    }
  },
};
