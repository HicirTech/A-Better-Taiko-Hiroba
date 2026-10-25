import type { Translator } from "@abth/i18n";
import type { ComponentType, ReactNode } from "react";

import type { FavoritesEditor } from "../favorites/use-favorites";
import type { CostumeEditor } from "../my-page/use-costume-editor";
import type { NameEditor } from "../name-title/use-name-editor";
import type { TitleEditor } from "../name-title/use-title-editor";
import type { NavEntry } from "../navigation/app-frame";
import type { Page } from "../navigation/pages";
import type { PictureLane } from "../pictures/picture-lane";
import type { SystemLink, SystemShare, SystemToast } from "../platform";
import type { ReadStatus } from "../shared/reads/read-run";
import type { SortChoice } from "../shared/scores/score-order";
import type { HirobaSessionPort, ReadFailure } from "../shared/session-port";
import type { FavoriteSets } from "../shared/sets/use-favorite-sets";
import type { ChartSource } from "../shared/song-catalogue/chart-source";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import type { UpdateReminder } from "../shared/updates/use-update-reminder";
import type { KeptSearches } from "../song-search/use-kept-searches";
import type { ModalLook } from "../ui/large-modal";
import type { SkeletonProgress } from "../ui/page-skeleton";
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
  /** The window is wide enough for the side panel. */
  readonly wide: boolean;
  readonly modalLook: ModalLook;
  /** The navigation's menu is open over the page. */
  readonly menuOpen: boolean;
  /** The pipelines page lies over the page. */
  readonly pipelinesShown: boolean;
  /** The difficulty whose level songs show in front, as Settings chose it. */
  readonly shownDifficulty: ShownDifficulty;
  readonly onShownDifficulty: (next: ShownDifficulty) => void;
  /** What Scores is sorted by as it opens, as Settings chose it. */
  readonly startingSort: SortChoice;
  readonly onStartingSort: (next: SortChoice) => void;
  /** Where a song's details take their chart pictures from, as Settings chose it. */
  readonly chartSource: ChartSource;
  readonly onChartSource: (next: ChartSource) => void;
  /** The shell's Toast, where it has one. */
  readonly toast: SystemToast | undefined;
  /** The shell's ways out for a picture the app made of a page. */
  readonly share: SystemShare;
  /** Settings' language section, drawn by the window that holds the language. */
  readonly language: ReactNode;
  /** Settings' appearance section, drawn by the window that holds the theme. */
  readonly appearance: ReactNode;
  readonly navigate: (page: Page) => void;
  readonly version: string;
  readonly updates: UpdateReminder;
  readonly session: SessionView;
  readonly editor: CostumeEditor;
  readonly titleEditor: TitleEditor;
  readonly nameEditor: NameEditor;
  readonly favorites: FavoritesEditor;
  readonly keptSets: FavoriteSets;
  readonly keptSearches: KeptSearches;
  /** The song search opened: the song list is read from then on. */
  readonly wantSongs: () => void;
  /** The song search opened or closed. */
  readonly onSongSearchOpen: (open: boolean) => void;
}

/** A page of the window: what it reads, and how the navigation lists it and the window draws it. */
/** What a page's skeleton is drawn by: the screen it stands on. */
export interface SkeletonProps {
  readonly touchFirst: boolean;
  readonly wide: boolean;
}

export interface PageEntry extends PageModel, NavEntry {
  /** Its shape in grey while it waits; none for a page that never waits. */
  readonly skeleton: ComponentType<SkeletonProps> | null;
  /** Drawn in the frame's wider width, page and skeleton, as the costume's columns need. */
  readonly wider?: true;
  /** How far its read has come, for the skeleton's bar. */
  progress?(data: PageData): SkeletonProgress | null;
  /** The question before `readsEvery`, open while `open`; without it the hold reads at once. */
  askEvery?(data: PageData, open: boolean, onAnswer: (confirmed: boolean) => void): ReactNode;
  draw(data: PageData): ReactNode;
}
