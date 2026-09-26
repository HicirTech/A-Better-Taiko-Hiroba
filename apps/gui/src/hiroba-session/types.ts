/** The two hosts a sign-in walks through. Production values live in `endpoints.ts`. */
export interface HirobaEndpoints {
  /** Scheme, host and port, no trailing slash: `https://donderhiroba.jp`. */
  readonly hirobaOrigin: string;
  /** The Bandai Namco ID host the sign-in form lives on. */
  readonly idpHost: string;
}

/** Where a URL seen during sign-in is, judged by origin and path only, never by substring. */
export type SignInStep =
  /** login.php or login_process.php: the user has not reached the ID form yet. */
  | "hirobaLogin"
  /** The Bandai Namco ID host on Hiroba's scheme: the form, the passkey interstitial. */
  | "idp"
  /** login_select.php: a card is still to be chosen; leaving now ends the card session. */
  | "cardSelect"
  /** index.php: the one page the walked sign-in lands on. The only step that counts as done. */
  | "landed"
  /** Any other Hiroba page, including the callback hop whose name nobody has recorded. */
  | "otherHiroba"
  /** Neither origin, including either host on another scheme or port. */
  | "elsewhere";
