import pack from "virtual:abth-story-pack";
import type { RecentPlay } from "@abth/core";

import type {
  CostumeEditorView,
  FavoritesView,
  ListedChartsView,
  PictureView,
  ProfileView,
  ScoresView,
  TitleEditorView,
} from "../session-port";
import { pictureOf } from "./picture-of";

// Each read once, as the stories load: a pack picture that is no PNG stops them all.
const VIEWS: ReadonlyMap<string, PictureView> = new Map(
  Object.entries(pack?.pictures ?? {}).map(([key, base64]) => [
    key,
    pictureOf(
      Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)),
      `The resource pack's ${key}`,
    ),
  ]),
);

/** The resource pack's picture under `key` (a lane's `wantKey`, or `danLabel/<board>`), or null
 * when no pack is named or it holds none. */
export const packView = (key: string): PictureView | null => VIEWS.get(key) ?? null;

/** The keys the pack holds that begin with `prefix`, such as `costumeItem/2/`. */
export const packKeys = (prefix: string): readonly string[] =>
  [...VIEWS.keys()].filter((key) => key.startsWith(prefix));

/** What each of a pack's data files holds: a feed's own text, or what the app's port answers for
 * a page. The pack's builder writes them with this app's own parsers; nothing here checks them. */
export interface PackData {
  /** taiko.wiki's song list, as `readSongCatalogue` reads it. */
  readonly songCatalogue: string;
  /** OurTaiko's V1 data, as `readRatingData` reads it. */
  readonly ratingData: string;
  readonly profile: Omit<ProfileView, "dan">;
  readonly costumeEditor: CostumeEditorView;
  readonly titleEditor: TitleEditorView;
  readonly favorites: FavoritesView;
  readonly recentPlays: readonly RecentPlay[];
  readonly scores: ScoresView;
  readonly listedCharts: ListedChartsView;
}

/** The pack's data files: names and whether each holds a feed's text rather than JSON. */
export const PACK_DATA: Readonly<Record<keyof PackData, "text" | "json">> = {
  songCatalogue: "text",
  ratingData: "text",
  profile: "json",
  costumeEditor: "json",
  titleEditor: "json",
  favorites: "json",
  recentPlays: "json",
  scores: "json",
  listedCharts: "json",
};

const read = new Map<keyof PackData, unknown>();

/** The pack's data file `name`, or null when no pack is named or it holds none. */
export function packData<K extends keyof PackData>(name: K): PackData[K] | null {
  const text = pack?.data[name];
  if (text === undefined) {
    return null;
  }
  if (!read.has(name)) {
    read.set(name, PACK_DATA[name] === "text" ? text : JSON.parse(text));
  }
  return read.get(name) as PackData[K];
}

/** The named pack's label, or null when the stories draw stand-ins alone. */
export const PACK_LABEL: string | null = pack?.label ?? null;
