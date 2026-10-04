/** What a section is given, and how one is declared. */
import type { App } from "./app";
import type { HistoryEntry } from "./costume-helpers";
import type { Box, Point } from "./harness";
import type { PlateAsked } from "./stand-in";

/** Values one section hands to later ones; the note names the section that sets each. */
export type Shared = {
  platesAtSignIn: PlateAsked[]; // overview
  platesAfterRereads: PlateAsked[]; // read-again
  updatedOnOverview: { text: string; fontSize: string }; // overview
  myDonFailureAtSignIn: boolean; // overview
  overviewScrolls: boolean; // settings
  columnOnOverview: Box; // settings
  columnOnSettings: Box; // settings
  myDonsFailed: number; // my-don-failure
  panelArtFetches: number; // pictures
  iconFetches: number; // pictures
  pull: { pullFrom: Point; pulledBy: (dx: number, dy: number) => Point }; // read-again
  ownedIn: (slot: number) => number[]; // thumbnails
  phoneItems: number[]; // tile-thumbnails
  historyBeforeReopen: HistoryEntry[]; // reopen
};

const NO_BOX: Box = {
  left: Number.NaN,
  top: Number.NaN,
  right: Number.NaN,
  bottom: Number.NaN,
  width: Number.NaN,
  height: Number.NaN,
};
const NO_POINT: Point = { x: 0, y: 0 };

/** What a section finds when the section that sets a value did not run. */
export const newShared = (): Shared => ({
  platesAtSignIn: [],
  platesAfterRereads: [],
  updatedOnOverview: { text: "", fontSize: "" },
  myDonFailureAtSignIn: false,
  overviewScrolls: false,
  columnOnOverview: NO_BOX,
  columnOnSettings: NO_BOX,
  myDonsFailed: Number.NaN,
  panelArtFetches: Number.NaN,
  iconFetches: Number.NaN,
  pull: { pullFrom: NO_POINT, pulledBy: () => NO_POINT },
  ownedIn: () => [],
  phoneItems: [],
  historyBeforeReopen: [],
});

export type Ctx = {
  /** The app now running; a section that relaunches it sets the new one. */
  app: App;
  results: Record<string, unknown>;
  tokens: string[];
  medalIds: string[];
  state: Shared;
};

/** Where the run stands when a section starts: no app yet, signed out, signed in, or closed. */
export type Phase = "none" | "signedOut" | "signedIn" | "after";

export type Section = {
  name: string;
  phase: Phase;
  keys: readonly string[];
  run: (ctx: Ctx) => Promise<void>;
};
