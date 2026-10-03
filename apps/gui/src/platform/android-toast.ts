import { Toast } from "@capacitor/toast";

import type { SystemToast } from "./system-toast";

/** Android's own Toast, through Capacitor's Toast plugin. */
export const androidToast: SystemToast = {
  show: (text) => void Toast.show({ text, duration: "short" }),
};
