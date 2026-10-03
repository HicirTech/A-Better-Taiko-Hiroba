/** A short message the system draws over the app, where the shell has one (Android's Toast). */
export interface SystemToast {
  show(text: string): void;
}
