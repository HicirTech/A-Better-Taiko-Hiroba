import type { MessageKey, TranslateParams } from "@abth/i18n";

import type { PickableReading } from "../favorites/use-pickable-songs";
import type { NameEditor } from "../name-title/use-name-editor";
import type { TitleEditor } from "../name-title/use-title-editor";
import type { RatingDataState } from "../rating/use-rating-data";
import type { ScoresState } from "../shared/scores/use-scores";
import type {
  ListedChartsView,
  PictureWant,
  ProfileView,
  ReadFailureKind,
} from "../shared/session-port";
import type { SongCatalogue } from "../shared/song-catalogue/use-song-catalogue";

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
  readonly scores: ScoresState;
  readonly listed: ListedChartsView | null;
  readonly ratingData: RatingDataState;
  readonly catalogue: SongCatalogue;
  readonly pickable: PickableReading;
  readonly editor: EditorReads;
  readonly titleEditor: Pick<TitleEditor, "dropEdits" | "forgetList">;
  readonly nameEditor: Pick<NameEditor, "dropEdits">;
  readonly favorites: EditorReads;
  /** The sets kept on this device, read again as a page that shows them opens. */
  readonly keptSets: { readonly reload: () => void };
  /** The searches kept on this device, read again as the Overview opens. */
  readonly keptSearches: { readonly reload: () => void };
  /** The Overview's song search stands open. */
  readonly songSearchOpen: boolean;
  /** Hiroba's pictures as the window asks for them. */
  readonly lane: { readonly readAgain: (kinds: readonly PictureWant["kind"][]) => void };
}

/** All of a page's data read again from nothing, asked for by a six-second hold. */
export interface EveryRead {
  /** Whether there is anything to read again: where not, the hold does nothing. */
  can(state: PageState): boolean;
  /** The page's question comes first: the read is long, or replaces what the device keeps. */
  readonly asks: boolean;
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
  /** What a six-second hold reads again on the page as it stands. */
  readsEvery?(state: PageState): EveryRead;
}
