import { type EnabledWrite, WRITE_KINDS, type WriteKind } from "../session-port";

/** The shells that can write, each with a list of its own in `VERIFIED_WRITES`. */
export type WritePlatform = "desktop" | "android";

/**
 * The kinds whose first real write from the app has been made, by the user, on each platform, and
 * recorded. Only these can be sent from a packaged build of that platform. Both lists are empty
 * until the user's first costume write on the platform; a kind joins its list in a commit of its
 * own once it has been. The lists are apart on purpose: a write Hiroba accepted from the desktop's
 * network stack says nothing of Android's, nor of its cookie store.
 */
export const VERIFIED_WRITES: Readonly<Record<WritePlatform, readonly WriteKind[]>> = {
  desktop: [],
  android: [],
};

/** What decides whether a run may send a write not yet verified. */
export interface WriteGateInput {
  readonly platform: WritePlatform;
  /**
   * Whether the build is packaged: Electron's `app.isPackaged`; on Android, any build but the
   * debug one (`com.hicirtech.taikohiroba.debug`).
   */
  readonly isPackaged: boolean;
  /** The desktop's environment; on Android, only what the web bundle was built with. */
  readonly env: Readonly<Record<string, string | undefined>>;
}

/**
 * Whether this run may send writes that are not verified yet: only an unpackaged dev run started
 * with ABTH_UNVERIFIED_WRITES=1, and on Android only the debug build, made with that setting. A
 * packaged build never may, whatever its environment says, the same way it never takes the
 * development endpoint overrides.
 */
export function unverifiedWritesOpen({ isPackaged, env }: WriteGateInput): boolean {
  return !isPackaged && env.ABTH_UNVERIFIED_WRITES === "1";
}

/**
 * The kinds of write this run may send: the verified ones of its platform, and, when the gate is
 * open, every other kind too, marked as not verified. A write verb checks this itself before it
 * sends anything; hiding a button is not the gate.
 *
 * `verified` is the platform's list, which only a test replaces, to try a kind that is in it.
 */
export function enabledWrites(
  input: WriteGateInput,
  verified: readonly WriteKind[] = VERIFIED_WRITES[input.platform],
): readonly EnabledWrite[] {
  const open = unverifiedWritesOpen(input);
  return WRITE_KINDS.flatMap((kind) => {
    const isVerified = verified.includes(kind);
    return isVerified || open ? [{ kind, verified: isVerified }] : [];
  });
}
