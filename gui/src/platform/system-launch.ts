/** The app's launch, where the shell has a launch screen of its own (Android). */
export interface SystemLaunch {
  /** The app's own cover is drawn, so the system's launch screen goes. */
  covered(): void;
}
