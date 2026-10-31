/** The app's launch and its returns, where the shell has a launch screen of its own (Android). */
export interface SystemLaunch {
  /** The app's own cover is drawn, so the system's launch screen goes. */
  covered(): void;
  /** Hears each return from the background with how long the app was away; returns a stop. */
  listenReturns(onReturn: (awayMs: number) => void): () => void;
}
