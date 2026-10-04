/** Opens a web page in the system's own browser, outside the app. */
export interface SystemLink {
  open(url: string): void;
}
