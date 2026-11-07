/** The system's Back (Android's), or the app's own where there is none (iOS). While the app hears
 * it, a press does only what the app does with it. */
export interface SystemBack {
  /** The system has no Back, so the app draws one. */
  readonly onScreen: boolean;
  /** Hears each press of Back; the function returned stops hearing it. */
  listen(onPress: () => void): () => void;
  /** Leaves the app as Back does with nothing to go back to: to the background, kept as it is. */
  leave(): void;
}
