/** The two sites a sign-in walks through. Production values live in `endpoints.ts`. */
export interface HirobaEndpoints {
  /** Scheme, host and port, no trailing slash: `https://donderhiroba.jp`. */
  readonly hirobaOrigin: string;
  /** The Bandai Namco ID host the sign-in form lives on. */
  readonly idpHost: string;
  /**
   * The domain every Bandai Namco ID hop is on. The walk crosses more than one of its hosts — the
   * OAuth hop is on `www.`, the form on `account.` — so the domain is allowed, not one host.
   */
  readonly idpDomain: string;
}

/** Where a URL seen during sign-in is, judged by origin and path only, never by substring. */
export type SignInStep =
  /** login.php or login_process.php: the user has not reached the ID form yet. */
  | "hirobaLogin"
  /** A host on the Bandai Namco ID domain, on Hiroba's scheme: the OAuth hop, the form, passkeys. */
  | "idp"
  /** login_select.php: a card is still to be chosen; leaving now ends the card session. */
  | "cardSelect"
  /** index.php: the one page the walked sign-in lands on. The only step that counts as done. */
  | "landed"
  /** Any other Hiroba page, including the callback hop whose name nobody has recorded. */
  | "otherHiroba"
  /** Neither site, including either one on another scheme or port. */
  | "elsewhere";
