import { playOptionIcons, type RecentPlay, type ScoreRank } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";
import { Box, Skeleton, Stack } from "@mui/material";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

import {
  DIFFICULTY_LABEL,
  GENRE_COLOUR,
  GENRE_LABEL,
  LEVEL_DIFFICULTY,
} from "../favorites/genre-look";
import { ScrollingText } from "../favorites/scrolling-text";
import { HIROBA_LANG } from "../language/hiroba-lang";
import type { LongPressHandlers } from "../my-page/use-long-press";
import { HirobaIcon } from "../pictures/hiroba-icon";
import type { PictureLane } from "../pictures/picture-lane";
import type { CrownKind } from "../session-port";
import { COURSE_ICON_PX, CourseIcon } from "../songs/course-icon";
import { SupportIcon } from "../ui/icons";
import type { RowPlace } from "../ui/row-list";

export const CROWN_KEY = {
  silver: "crowns.silver",
  gold: "crowns.gold",
  donderful: "crowns.donderful",
} as const satisfies Record<CrownKind, MessageKey>;

const RANK_KEY = {
  2: "scoreRank.2",
  3: "scoreRank.3",
  4: "scoreRank.4",
  5: "scoreRank.5",
  6: "scoreRank.6",
  7: "scoreRank.7",
  8: "scoreRank.8",
} as const satisfies Record<ScoreRank, MessageKey>;

const MARK_PX = 20;
// The art's proportions: a crown is taller than wide, a rank wider than tall, an option square.
export const CROWN_RATIO = 52 / 59;
const CROWN_WIDTH_PX = Math.round(MARK_PX * CROWN_RATIO);
const RANK_WIDTH_PX = Math.round((MARK_PX * 128) / 96);

const ONE_LINE = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;
// A bar as tall as its row.
const STRETCHED = { height: "auto" } as const;
const PLAIN_LIST = { listStyle: "none", m: 0, p: 0 } as const;
const SKELETON_ROWS = [...Array(9).keys()];
const NO_GENRE = { backgroundColor: "currentColor", opacity: 0.25 } as const;
/** About how tall a row draws, before a list measures it. */
export const HISTORY_ROW_PX = 78;
const ROW = {
  display: "flex",
  gap: 1.5,
  minWidth: 0,
  px: 2,
  py: 0.75,
  "& .song-bars": { display: "flex", gap: "2px", flexShrink: 0, alignSelf: "stretch" },
  "& .song-bar": { width: 4, borderRadius: "2px" },
  "& .song-text": { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.25 },
  "& .song-head": { display: "flex", alignItems: "center", gap: 1, minWidth: 0 },
  "& .song-name": { ...ONE_LINE, flex: 1, minWidth: 0, lineHeight: 1.4 },
  "& .play-marks": { display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 },
  "& .song-facts": { color: "text.secondary", fontSize: "0.8125rem", lineHeight: 1.45 },
} as const;

const OPENABLE_ROW = {
  ...ROW,
  cursor: "pointer",
  "&:hover, &:focus-visible": { bgcolor: "action.hover" },
} as const;

/** What a row answers besides being shown: its details, its own menu, what a test finds it by. */
export interface RowProps extends Partial<LongPressHandlers> {
  readonly onClick?: () => void;
  readonly onKeyDown?: (event: KeyboardEvent) => void;
  readonly onContextMenu?: (event: MouseEvent) => void;
  readonly role?: "button";
  readonly tabIndex?: number;
  readonly "aria-haspopup"?: "dialog";
  readonly "data-song-no"?: string;
  readonly "data-level"?: number;
}

/** A row a click, Enter or Space opens, as a button that opens a dialog. */
export function opensOnPress(onOpen: () => void): RowProps {
  return {
    role: "button",
    tabIndex: 0,
    "aria-haspopup": "dialog",
    onClick: onOpen,
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen();
      }
    },
  };
}

/** One recent play: the difficulty and the song, its marks as Hiroba's icons, then its counts. */
export function HistoryRow({
  play,
  lane,
  order,
  i18n,
  name,
  rowProps,
  place,
  heading,
  lead,
}: {
  readonly play: RecentPlay;
  readonly lane: PictureLane;
  readonly order: number;
  readonly i18n: Translator;
  /** The song's name as shown, and its language; Hiroba's own title by default. */
  readonly name?: { readonly text: string; readonly lang: string };
  readonly rowProps?: RowProps;
  /** Where a long list put the row. */
  readonly place?: RowPlace;
  /** The title's id where the row heads a chart's details, which list its hits below it. */
  readonly heading?: string;
  /** Shown first in the row, before the genre's bar: what the page rates the chart. */
  readonly lead?: ReactNode;
}) {
  const { t, number } = i18n;
  const difficulty = LEVEL_DIFFICULTY[play.level];
  const { record } = play;
  const { options } = record;
  const genre = play.genre === null ? null : t(GENRE_LABEL[play.genre]);
  const optionLabel = {
    random: t(options.random === "detarame" ? "history.detarame" : "history.kimagure"),
    abekobe: t("history.abekobe"),
    doron: t("history.doron"),
    speed: t("history.speed", { speed: number(options.speed) }),
  } as const;
  const score = [
    number(record.highScore),
    labeled(t("history.combo"), record.maxCombo, number),
  ].filter((part) => part !== null);
  const hits = [
    labeled(t("history.good"), record.good, number),
    labeled(t("history.ok"), record.ok, number),
    labeled(t("history.bad"), record.bad, number),
    labeled(t("history.roll"), record.drumroll, number),
  ].filter((part) => part !== null);
  return (
    <Box
      component={heading === undefined ? "li" : "div"}
      className="history-row"
      sx={rowProps?.onClick === undefined ? ROW : OPENABLE_ROW}
      {...rowProps}
      {...place}
    >
      {lead}
      <span
        className="song-bars"
        {...(genre === null ? { "aria-hidden": true } : { role: "img", "aria-label": genre })}
        title={genre ?? undefined}
      >
        <span
          className="song-bar"
          style={play.genre === null ? NO_GENRE : { backgroundColor: GENRE_COLOUR[play.genre] }}
        />
      </span>
      <span className="song-text">
        <span className="song-head">
          <CourseIcon
            difficulty={difficulty}
            lane={lane}
            order={order}
            label={t(DIFFICULTY_LABEL[difficulty])}
          />
          {heading === undefined ? (
            <span className="song-name" lang={name?.lang ?? HIROBA_LANG}>
              {name?.text ?? play.songTitle}
            </span>
          ) : (
            <ScrollingText id={heading} className="song-name" lang={name?.lang ?? HIROBA_LANG}>
              {name?.text ?? play.songTitle}
            </ScrollingText>
          )}
          <span className="play-marks">
            {play.crown !== "none" && play.crown !== "played" && (
              <HirobaIcon
                want={{ kind: "crownIcon", crown: play.crown }}
                width={CROWN_WIDTH_PX}
                height={MARK_PX}
                label={t(CROWN_KEY[play.crown])}
                lane={lane}
                order={order}
              />
            )}
            {play.scoreRank !== null && (
              <HirobaIcon
                want={{ kind: "rankIcon", rank: play.scoreRank }}
                width={RANK_WIDTH_PX}
                height={MARK_PX}
                label={t(RANK_KEY[play.scoreRank])}
                lane={lane}
                order={order}
              />
            )}
            {playOptionIcons(options).map(({ option, code }) => (
              <HirobaIcon
                key={code}
                want={{ kind: "optionIcon", option: code }}
                width={MARK_PX}
                height={MARK_PX}
                label={optionLabel[option]}
                lane={lane}
                order={order}
              />
            ))}
            {options.supportChart === true && (
              // Hiroba's own picture of the support chart is not known: Material's stands in.
              <SupportIcon
                aria-label={t("history.support")}
                titleAccess={t("history.support")}
                sx={{ fontSize: MARK_PX }}
              />
            )}
          </span>
        </span>
        <span className="song-facts">{score.join(" · ")}</span>
        {heading === undefined && <span className="song-facts">{hits.join(" · ")}</span>}
      </span>
    </Box>
  );
}

/** A play row's shape while a page's first read runs. */
export function HistoryRowSkeleton() {
  return (
    <Box component="li" aria-hidden sx={ROW}>
      <span className="song-bars">
        <Skeleton variant="rectangular" className="song-bar" sx={STRETCHED} />
      </span>
      <span className="song-text">
        <span className="song-head">
          <Skeleton variant="circular" width={COURSE_ICON_PX} height={COURSE_ICON_PX} />
          <span className="song-name">
            <Skeleton width="55%" />
          </span>
          <span className="play-marks">
            <Skeleton variant="rounded" width={CROWN_WIDTH_PX} height={MARK_PX} />
            <Skeleton variant="rounded" width={RANK_WIDTH_PX} height={MARK_PX} />
          </span>
        </span>
        <Skeleton className="song-facts" width="35%" />
        <Skeleton className="song-facts" width="55%" />
      </span>
    </Box>
  );
}

/** As many play rows' shapes as fill a window, while a page's first read runs. */
export function HistoryRowsSkeleton() {
  return (
    <Stack component="ul" spacing={0} aria-hidden sx={PLAIN_LIST}>
      {SKELETON_ROWS.map((key) => (
        <HistoryRowSkeleton key={key} />
      ))}
    </Stack>
  );
}

function labeled(
  name: string,
  count: number | null,
  number: (value: number) => string,
): string | null {
  return count === null ? null : `${name} ${number(count)}`;
}
