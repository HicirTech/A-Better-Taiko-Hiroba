import type { WriteKind } from "../session-port";

/** The shells that write, each with a list of its own in `LIVE_CHECKED_WRITES`. */
export type WritePlatform = "desktop" | "android";

/**
 * The kinds of write that have been made for real from each platform and read back as planned. A
 * write of a kind on its platform's list is the editor, the pre-check, one save and the read-back.
 * One of a kind not on it also reads another page before and after, your title for a costume, to
 * see that nothing but the edited set moved.
 *
 * The list decides that and nothing else: every kind of write is open in every build, on both
 * platforms. A kind joins its platform's list in a commit of its own once its first real write from
 * that platform has been made and recorded. The lists are apart on purpose: a write Hiroba accepted
 * from the desktop's network stack says nothing of Android's, nor of its cookie store.
 */
export const LIVE_CHECKED_WRITES: Readonly<Record<WritePlatform, readonly WriteKind[]>> = {
  desktop: ["costume"],
  android: [],
};
