import type { EnabledWrite, WriteKind } from "../session-port";

/** Every kind of write the app can send, whether or not this run may send it. */
export const WRITE_KINDS: readonly WriteKind[] = ["costume"];

/**
 * The kinds whose first real write from the app has been made, by the user, on the desktop, and
 * recorded. Only these can be sent from a packaged build. Empty until the user's first costume
 * write; a kind joins in a commit of its own once it has been.
 *
 * Android has no entry: writes are the desktop's alone for now (the user's call, 2026-09-27), and
 * Android's port enables none.
 */
export const VERIFIED_WRITES: Readonly<{ desktop: readonly WriteKind[] }> = { desktop: [] };

/** What decides whether a run may send a write not yet verified. */
export interface WriteGateInput {
  /** Electron's `app.isPackaged`. */
  readonly isPackaged: boolean;
  readonly env: Readonly<Record<string, string | undefined>>;
}

/**
 * Whether this run may send writes that are not verified yet: only an unpackaged dev run started
 * with ABTH_UNVERIFIED_WRITES=1. A packaged build never may, whatever its environment says, the
 * same way it never takes the development endpoint overrides.
 */
export function unverifiedWritesOpen({ isPackaged, env }: WriteGateInput): boolean {
  return !isPackaged && env.ABTH_UNVERIFIED_WRITES === "1";
}

/**
 * The kinds of write this desktop run may send: the verified ones, and, when the gate is open,
 * every other kind too, marked as not verified. A write verb checks this itself before it sends
 * anything; hiding a button is not the gate.
 */
export function enabledWrites(input: WriteGateInput): readonly EnabledWrite[] {
  const open = unverifiedWritesOpen(input);
  return WRITE_KINDS.flatMap((kind) => {
    const verified = VERIFIED_WRITES.desktop.includes(kind);
    return verified || open ? [{ kind, verified }] : [];
  });
}
