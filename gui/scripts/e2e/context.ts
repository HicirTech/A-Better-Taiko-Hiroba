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

/** The lanes a run splits its sections into: each runs in a process, app and stand-in of its own. */
export const LANES = ["profile", "costume", "names", "songs"] as const;
export type Lane = (typeof LANES)[number];

type SectionBody = {
  name: string;
  keys: readonly string[];
  run: (ctx: Ctx) => Promise<void>;
};

/** A section reads `Shared` values and app state only from earlier sections of its lane. */
export type LaneSection = SectionBody & { phase: Exclude<Phase, "after">; lane: Lane };
/** A section that reads what every lane left on disk, once they have all stopped. */
export type AfterSection = SectionBody & { phase: "after" };
export type Section = LaneSection | AfterSection;
