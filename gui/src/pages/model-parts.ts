import type { PictureWant } from "../shared/session-port";
import type { EditorReads, EveryRead, PageState } from "./page-model";

/** An editor read for the first time: nothing of Hiroba's held to show meanwhile. */
export const readsFirst = ({ step }: EditorReads) =>
  step.name === "unread" || (step.name === "loading" && step.held === null);
// A first read waits for any write to end rather than rely on the request queue alone.
export const dueFirst = (editor: EditorReads, writing: boolean) =>
  editor.step.name === "unread" && !writing ? editor.read : null;
/** A whole read of the scores runs: it holds the pages showing them; one song's does not. */
export const scoresRead = ({ scores }: PageState): boolean =>
  scores.reading && scores.song === null;
// Not waited for: a read of the scores can run for minutes, and Read again on another page
// must not wait.
export const readScores = (state: PageState) => void state.scores.read();
export const readMyPage = (state: PageState) => state.session.read(false, true);

/** Hiroba's pictures of `kinds` read again from Hiroba, in place of those the device keeps. */
export const picturesOf = (kinds: readonly PictureWant["kind"][]): EveryRead => ({
  can: () => true,
  asks: true,
  read: async ({ lane }) => lane.readAgain(kinds),
});
