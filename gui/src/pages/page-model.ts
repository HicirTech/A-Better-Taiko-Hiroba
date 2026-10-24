import type { MessageKey, TranslateParams } from "@abth/i18n";

import type { PickableReading } from "../favorites/use-pickable-songs";
import type { SongCatalogue } from "../favorites/use-song-catalogue";
import type { RecentPlaysState } from "../history/use-recent-plays";
import type { NameEditor } from "../name-title/use-name-editor";
import type { TitleEditor } from "../name-title/use-title-editor";
import type { Page } from "../navigation/pages";
import type { RatingDataState } from "../rating/use-rating-data";
import type { ScoresState } from "../scores/use-scores";
import type { ListedChartsView, ProfileView, ReadFailureKind } from "../shared/session-port";

/** Where the window stands with the player's session. */
export type Screen =
  | { readonly name: "checking" }
  | {
      readonly name: "signedOut";
      readonly notice: MessageKey | null;
      readonly noticeParams?: TranslateParams;
    }
  | { readonly name: "signingIn" }
  | { readonly name: "reading" }
  | { readonly name: "profile"; readonly profile: ProfileView }
  | { readonly name: "readFailed"; readonly kind: ReadFailureKind; readonly detail?: string };

/** The read the Read again button follows: it turns with it and waits for it. */
export interface ReadFollowed {
  readonly reading: boolean;
  readonly canRead: boolean;
}

/** An editor as a page's reads see it: its step, its read and its unsaved edits. */
export interface EditorReads extends ReadFollowed {
  readonly step: { readonly name: string; readonly held?: unknown };
  readonly read: (refreshFirst?: boolean) => Promise<void>;
  readonly dropEdits: () => void;
}

/** The session as a page's reads see it: the screen, and the read of my page. */
export interface SessionReads {
  readonly screen: Screen;
  /** My page is read for the page shown, not behind it after a title write. */
  readonly myPageInView: boolean;
  /** Reads my page: behind the page after a title write, after Hiroba's refresh for Read again. */
  readonly read: (behindThePage?: boolean, refreshFirst?: boolean) => Promise<boolean>;
}

/** What a page's reads see of the window: the session and every kind of data. */
export interface PageState {
  readonly session: SessionReads;
  /** A write to Hiroba runs, from any editor. */
  readonly writing: boolean;
  readonly history: RecentPlaysState;
  readonly scores: ScoresState;
  readonly listed: ListedChartsView | null;
  readonly ratingData: RatingDataState;
  readonly catalogue: SongCatalogue;
  readonly pickable: PickableReading;
  readonly editor: EditorReads;
  readonly titleEditor: Pick<TitleEditor, "dropEdits" | "forgetList">;
  readonly nameEditor: Pick<NameEditor, "dropEdits">;
  readonly favorites: EditorReads;
}

/** All of a page's data read again from nothing, asked for by a six-second hold. */
export interface EveryRead {
  /** Whether a copy is kept to clear: where none is, the hold asks nothing. */
  can(state: PageState): boolean;
  read(state: PageState): Promise<unknown>;
}

/** What a page reads, and when: the part of a page that draws nothing. */
export interface PageModel {
  /** Its name in the navigation. */
  readonly label: MessageKey;
  /** What its skeleton says is read, where that is not my page. */
  readonly readLabel?: MessageKey;
  /** It names songs: Read again also reads taiko.wiki's song list when the one kept is old. */
  readonly namesSongs: boolean;
  /** It shows taiko.wiki's song list, which is read once it opens. */
  readonly needsSongs: boolean;
  /** Drawn on its own whatever the session: no sign-in, skeleton, pull or failure of my page. */
  readonly standsAlone?: boolean;
  /** It draws a failed first read of my page itself, in place of its content. */
  readonly drawsFailure?: boolean;
  /** The reads a visit starts as the page opens, once. */
  opens?(state: PageState): readonly (() => void)[];
  /** Its first read while that is due, so the window starts it once nothing is in its way. */
  firstRead?(state: PageState): (() => unknown) | null;
  /** Nothing to show yet: a first visit waits for its reads. */
  waits(state: PageState): boolean;
  /** Its own data is being read: the page is shut, and its skeleton soon stands in for it. */
  reading(state: PageState): boolean;
  readAgain(state: PageState): Promise<unknown> | undefined;
  follows?(state: PageState): ReadFollowed;
  /** The edits dropped as another page opens; what was read is kept. */
  leaves?(state: PageState): readonly (() => void)[];
  readonly readsEvery?: EveryRead;
}

/** An editor read for the first time: nothing of Hiroba's held to show meanwhile. */
const readsFirst = ({ step }: EditorReads) =>
  step.name === "unread" || (step.name === "loading" && step.held === null);
// A first read waits for any write to end rather than rely on the request queue alone.
const dueFirst = (editor: EditorReads, writing: boolean) =>
  editor.step.name === "unread" && !writing ? editor.read : null;
/** A whole read of the scores runs: it holds the pages showing them; one song's does not. */
export const scoresRead = ({ scores }: PageState): boolean =>
  scores.reading && scores.song === null;
// A read of the scores walks the plays, and a walk notes its plays in the scores. Neither is
// waited for: either can run for minutes, and Read again on another page must not wait.
const readScores = (state: PageState) => void state.scores.read().then(state.history.markStale);
const readMyPage = (state: PageState) => state.session.read(false, true);

/** Every recent play read again from the first page, in place of those kept. */
const EVERY_PLAY: EveryRead = {
  can: ({ history }) => (history.plays?.length ?? 0) > 0,
  read: ({ history, scores }) => history.readEvery().then(scores.markStale),
};

/** Every score read again, its details too. */
const EVERY_SCORE: EveryRead = {
  can: ({ scores }) => (scores.view?.scores.length ?? 0) > 0,
  read: ({ scores, history }) => scores.readEvery().then(history.markStale),
};

/** What each page reads, and when. */
export const PAGE_MODELS: Readonly<Record<Page, PageModel>> = {
  overview: {
    label: "nav.overview",
    namesSongs: true,
    needsSongs: false,
    drawsFailure: true,
    waits: () => false,
    reading: ({ session }) => session.myPageInView,
    readAgain: readMyPage,
  },
  history: {
    label: "nav.history",
    namesSongs: true,
    needsSongs: true,
    opens: ({ history, scores }) => [history.load, scores.load],
    waits: ({ history }) => history.plays === null,
    reading: ({ history }) => history.reading,
    readAgain: ({ history, scores }) => void history.read().then(scores.markStale),
    follows: ({ history }) => history,
    readsEvery: EVERY_PLAY,
  },
  scores: {
    label: "nav.scores",
    namesSongs: true,
    needsSongs: true,
    opens: ({ scores }) => [scores.load],
    waits: ({ scores }) => scores.view === null,
    reading: scoresRead,
    readAgain: readScores,
    follows: ({ scores }) => scores,
    readsEvery: EVERY_SCORE,
  },
  rating: {
    label: "nav.rating",
    readLabel: "rating.readingData",
    namesSongs: true,
    needsSongs: true,
    opens: ({ scores, ratingData }) => [scores.load, ratingData.load],
    waits: ({ scores, ratingData }) =>
      scores.view === null || (ratingData.data === null && ratingData.failure === null),
    reading: (state) => scoresRead(state) || state.ratingData.reading,
    readAgain: (state) => {
      readScores(state);
      void state.ratingData.read();
      return undefined;
    },
    // The button turns while the rating data is read too, but waits only for the scores.
    follows: ({ scores, ratingData }) => ({
      reading: scores.reading || ratingData.reading,
      canRead: scores.canRead,
    }),
  },
  knowYourself: {
    label: "nav.knowYourself",
    readLabel: "picker.loading",
    namesSongs: true,
    needsSongs: true,
    // A song list that could not be read is read again as the page opens.
    opens: ({ scores, catalogue }) => [scores.load, catalogue.readIfFailed],
    waits: ({ scores, listed, catalogue }) =>
      scores.view === null || listed === null || catalogue.state === "loading",
    reading: scoresRead,
    readAgain: readScores,
    follows: ({ scores }) => scores,
  },
  costume: {
    label: "nav.costume",
    readLabel: "costume.reading",
    namesSongs: false,
    needsSongs: false,
    firstRead: ({ editor, writing }) => dueFirst(editor, writing),
    waits: ({ editor }) => readsFirst(editor),
    reading: ({ editor }) => editor.reading,
    readAgain: ({ editor }) => editor.read(true),
    follows: ({ editor }) => editor,
    leaves: ({ editor }) => [editor.dropEdits],
  },
  nameTitle: {
    label: "nav.nameTitle",
    namesSongs: false,
    needsSongs: false,
    waits: () => false,
    reading: ({ session }) => session.myPageInView,
    readAgain: async (state) => {
      // The titles are read again when the picker next opens.
      if (await readMyPage(state)) {
        state.titleEditor.forgetList();
      }
    },
    leaves: ({ titleEditor, nameEditor }) => [titleEditor.dropEdits, nameEditor.dropEdits],
  },
  favorites: {
    label: "nav.favorites",
    readLabel: "favorites.reading",
    namesSongs: true,
    needsSongs: true,
    firstRead: ({ favorites, writing }) => dueFirst(favorites, writing),
    waits: ({ favorites }) => readsFirst(favorites),
    reading: ({ favorites }) => favorites.reading,
    readAgain: ({ pickable, favorites }) => {
      // The pickers' list is read again when a picker next opens.
      pickable.markStale();
      return favorites.read(true);
    },
    follows: ({ favorites }) => favorites,
    leaves: ({ favorites }) => [favorites.dropEdits],
  },
  settings: {
    label: "nav.settings",
    namesSongs: false,
    needsSongs: false,
    standsAlone: true,
    waits: () => false,
    reading: () => false,
    readAgain: readMyPage,
  },
};
