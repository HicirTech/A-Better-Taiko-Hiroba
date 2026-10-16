/** What a section is given, and how one is declared. */
import type { App } from "./app";
import type { HistoryEntry } from "./costume-helpers";
import type { PlateAsked } from "./stand-in";

/** Values one section hands to later ones; the note names the section that sets each. */
export type Shared = {
  platesAtSignIn: PlateAsked[]; // overview
  platesAfterRereads: PlateAsked[]; // read-again
  lastUpdated: { text: string; fontSize: string }; // overview
  myDonFailureAtSignIn: boolean; // overview
  myDonsFailed: number; // my-don-failure
  ownedIn: (slot: number) => number[]; // thumbnails
  phoneItems: number[]; // tile-thumbnails
  historyBeforeReopen: HistoryEntry[]; // reopen
};

/** What a section finds when the section that sets a value did not run. */
export const newShared = (): Shared => ({
  platesAtSignIn: [],
  platesAfterRereads: [],
  lastUpdated: { text: "", fontSize: "" },
  myDonFailureAtSignIn: false,
  myDonsFailed: Number.NaN,
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
