import {
  isRecord,
  isWholeNumber,
  type RenameState,
  SCORE_RANK_NAMES,
  type ScoreRank,
} from "@abth/core";

import type { ProfileView } from "../shared/session-port";
import { type KeptPictureSources, keptSourcesIn, keptSourcesOf } from "./picture-sources";
import { keptDanIn, TAIKO_NO } from "./read-dan";
import type { OwnProfileRead } from "./read-profile";

/** The shape a kept read is written in: a record of another is read as none. */
export const KEPT_PROFILE_VERSION = 1;

/** My page as the device keeps it: never the どんメダル, so nothing of it reaches the disk. */
export type KeptProfileView = Omit<ProfileView, "medal">;

/** The last good read of my page, kept until the session ends. */
export interface KeptProfile {
  readonly taikoNo: string;
  readonly view: KeptProfileView;
  readonly pictures: KeptPictureSources;
}

/** Where a shell keeps that read: each call is done as it is made, and none throws. */
export interface KeptProfileStore {
  /** The read kept; null for none, or for one that does not read. */
  load(): Promise<KeptProfile | null>;
  /** Keeps `kept`, or deletes what is kept for null. */
  save(kept: KeptProfile | null): Promise<void>;
}

/** What a good read leaves on the device: each part copied by name, and the どんメダル left out. */
export function keptProfileOf({ taikoNo, view, pictures }: OwnProfileRead): KeptProfile {
  const {
    nickname,
    title,
    rename,
    region,
    dan,
    crowns,
    panel,
    favoriteSong,
    favoriteFolder,
    fetchedAt,
  } = view;
  return {
    taikoNo,
    view: {
      nickname,
      title,
      rename,
      region,
      dan,
      crowns,
      panel,
      favoriteSong,
      favoriteFolder,
      fetchedAt,
    },
    pictures: keptSourcesOf(pictures),
  };
}

/** The kept read in `kept`, every part checked and copied by name; null for anything else. */
export function keptProfileIn(kept: Record<string, unknown>): KeptProfile | null {
  const { taikoNo, view, pictures } = kept;
  const keptView = isRecord(view) ? viewIn(view) : null;
  const keptPictures = keptSourcesIn(pictures);
  return typeof taikoNo === "string" &&
    TAIKO_NO.test(taikoNo) &&
    keptView !== null &&
    keptPictures !== null
    ? { taikoNo, view: keptView, pictures: keptPictures }
    : null;
}

const RENAMES = { open: true, closed: true, unknown: true } as const satisfies Record<
  RenameState,
  true
>;
const RANKS = Object.keys(SCORE_RANK_NAMES);

const isRename = (value: unknown): value is RenameState =>
  typeof value === "string" && Object.hasOwn(RENAMES, value);
const isTextOrNone = (value: unknown): value is string | null =>
  value === null || typeof value === "string";
const isTexts = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const isMoment = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

function viewIn(view: Record<string, unknown>): KeptProfileView | null {
  const { nickname, title, rename, region, dan, favoriteSong, favoriteFolder, fetchedAt } = view;
  const keptDan = dan === null ? null : keptDanIn(dan);
  const crowns = crownsIn(view.crowns);
  const panel = panelIn(view.panel);
  if (
    typeof nickname !== "string" ||
    typeof title !== "string" ||
    !isRename(rename) ||
    !isTextOrNone(region) ||
    (dan !== null && keptDan === null) ||
    crowns === null ||
    panel === null ||
    !isTextOrNone(favoriteSong) ||
    !isTexts(favoriteFolder) ||
    !isMoment(fetchedAt)
  ) {
    return null;
  }
  return {
    nickname,
    title,
    rename,
    region,
    dan: keptDan,
    crowns,
    panel,
    favoriteSong,
    favoriteFolder,
    fetchedAt,
  };
}

function crownsIn(value: unknown): ProfileView["crowns"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const { silver, gold, donderful } = value;
  return isWholeNumber(silver) && isWholeNumber(gold) && isWholeNumber(donderful)
    ? { silver, gold, donderful }
    : null;
}

function panelIn(value: unknown): ProfileView["panel"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const { countLevel, ranks } = value;
  if (!isWholeNumber(countLevel) || !isRecord(ranks)) {
    return null;
  }
  const counts = RANKS.map((rank) => [rank, ranks[rank]] as const);
  return counts.every(([, count]) => isWholeNumber(count))
    ? { countLevel, ranks: Object.fromEntries(counts) as Record<ScoreRank, number> }
    : null;
}
