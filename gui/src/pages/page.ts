import type { Translator } from "@abth/i18n";
import type { ComponentType, ReactNode } from "react";

import type { FavoritesEditor } from "../favorites/use-favorites";
import type { CostumeEditor } from "../my-page/use-costume-editor";
import type { NameEditor } from "../name-title/use-name-editor";
import type { TitleEditor } from "../name-title/use-title-editor";
import type { NavEntry } from "../navigation/app-frame";
import type { Page } from "../navigation/pages";
import type { PictureLane } from "../pictures/picture-lane";
import type { SystemLink, SystemToast } from "../platform";
import type { ReadStatus } from "../shared/reads/read-run";
import type { HirobaSessionPort, ReadFailure } from "../shared/session-port";
import type { SkeletonProgress } from "../ui/page-skeleton";
import type { UpdateReminder } from "../updates/use-update-reminder";
import type { PageModel, PageState, SessionReads } from "./page-model";

/** The session as a page sees it: the screen, the read of my page, and the way out. */
export interface SessionView extends SessionReads {
  readonly myPage: ReadStatus<ReadFailure, never>;
  readonly signOut: () => Promise<void>;
}

/** What a page sees of the window: its means, the session and every kind of data. */
export interface PageData extends PageState {
  readonly port: HirobaSessionPort;
  readonly link: SystemLink;
  readonly i18n: Translator;
  readonly lane: PictureLane;
  readonly touchFirst: boolean;
  /** The shell's Toast, where it has one. */
  readonly toast: SystemToast | undefined;
  /** Settings' language section, drawn by the window that holds the language. */
  readonly language: ReactNode;
  readonly navigate: (page: Page) => void;
  readonly version: string;
  readonly updates: UpdateReminder;
  readonly session: SessionView;
  readonly editor: CostumeEditor;
  readonly titleEditor: TitleEditor;
  readonly nameEditor: NameEditor;
  readonly favorites: FavoritesEditor;
  /** The song search opened: the song list is read from then on. */
  readonly wantSongs: () => void;
}

/** A page of the window: what it reads, and how the navigation lists it and the window draws it. */
export interface PageEntry extends PageModel, NavEntry {
  /** Its shape in grey while it waits; none for a page that never waits. */
  readonly skeleton: ComponentType | null;
  /** How far its read has come, for the skeleton's bar. */
  progress?(data: PageData): SkeletonProgress | null;
  /** The question before `readsEvery`, open while `open`; without it the hold reads nothing. */
  askEvery?(data: PageData, open: boolean, onAnswer: (confirmed: boolean) => void): ReactNode;
  draw(data: PageData): ReactNode;
}
