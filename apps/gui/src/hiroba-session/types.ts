import type { WriteDeps } from "@abth/core";

/** A write's options beyond the transport and Hiroba's origin, which it is given. A throw from
 * `beginUndo` stops the write unsent. */
export type WriteOptions<S> = Omit<WriteDeps<S>, "transport" | "hirobaOrigin">;

/** The sites the app asks things of: the two a sign-in walks through, and the one picture host. */
export interface HirobaEndpoints {
  /** Scheme, host and port, no trailing slash: `https://donderhiroba.jp`. */
  readonly hirobaOrigin: string;
  /** The Bandai Namco ID host the sign-in form lives on. */
  readonly idpHost: string;
  /** The walk crosses several hosts of this domain (OAuth on `www.`, the form on `account.`), so
   * the domain is allowed, not one host. */
  readonly idpDomain: string;
  /** The one host off Hiroba my page's pictures come from (`https://img.taiko-p.jp`, the My Don
   * portrait); never sent the session. Null when there is none: then nothing is asked of it. */
  readonly imgOrigin: string | null;
}

/** Where a URL seen during sign-in is, judged by origin and path only, never by substring. */
export type SignInStep =
  /** login.php or login_process.php: the user has not reached the ID form yet. */
  | "hirobaLogin"
  /** A host on the Bandai Namco ID domain, on Hiroba's scheme: the OAuth hop, form or passkeys. */
  | "idp"
  /** login_select.php: a card is still to be chosen; leaving now ends the card session. */
  | "cardSelect"
  /** index.php: the one page the walked sign-in lands on. The only step that counts as done. */
  | "landed"
  /** Any other Hiroba page, including the callback hop whose name nobody has recorded. */
  | "otherHiroba"
  /** Neither site, including either one on another scheme or port. */
  | "elsewhere";
