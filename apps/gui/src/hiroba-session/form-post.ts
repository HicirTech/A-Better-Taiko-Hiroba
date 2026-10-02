/**
 * How a form goes to Hiroba, the same on both shells: the redirects a post may follow, the type of
 * its body and the body itself, so the desktop and Android send identical bytes. Each shell's
 * transport does the sending.
 */
import type { TransportPost } from "@abth/core";

/** The redirects a browser follows after a post, with a GET that has no body. */
export const POST_FOLLOWED_AS_GET: ReadonlySet<number> = new Set([301, 302, 303]);

/** What a browser sends with a form, and what jQuery sends with the ajax posts Hiroba makes. */
export const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded; charset=UTF-8";

/** The form as a browser encodes it: each pair in the order given, spaces as `+`. */
export function encodeForm(form: TransportPost["form"]): string {
  const encoded = new URLSearchParams();
  for (const [name, value] of form) {
    encoded.append(name, value);
  }
  return encoded.toString();
}

/** Where a redirect's `Location` leads from `from`; null unless it is an http or https address. */
export function resolveRedirect(location: string, from: string): string | null {
  try {
    const next = new URL(location, from);
    return next.protocol === "https:" || next.protocol === "http:" ? next.href : null;
  } catch {
    return null;
  }
}
