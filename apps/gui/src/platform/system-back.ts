/**
 * The system's Back button or gesture, where the shell has one (Android). While the app hears it,
 * a press does only what the app does with it.
 */
export interface SystemBack {
  /** Hears each press of Back; the function returned stops hearing it. */
  listen(onPress: () => void): () => void;
  /** Leaves the app as Back does with nothing to go back to: to the background, kept as it is. */
  leave(): void;
}
