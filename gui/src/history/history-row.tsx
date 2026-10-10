import { type Level, playOptionIcons, type RecentPlay, type ScoreRank } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";
import { Box, SvgIcon } from "@mui/material";

import { DIFFICULTY_LABEL, GENRE_COLOUR, GENRE_LABEL } from "../favorites/genre-look";
import { HIROBA_LANG } from "../language/hiroba-lang";
import { HirobaIcon } from "../pictures/hiroba-icon";
import type { PictureLane } from "../pictures/picture-lane";
import type { CrownKind } from "../session-port";
import type { Difficulty } from "../song-catalogue/types";
import { CourseIcon } from "../songs/course-icon";

const LEVEL_DIFFICULTY = {
  1: "easy",
  2: "normal",
  3: "hard",
  4: "oni",
  5: "ura",
} as const satisfies Record<Level, Difficulty>;

const CROWN_KEY = {
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
const CROWN_WIDTH_PX = Math.round((MARK_PX * 52) / 59);
const RANK_WIDTH_PX = Math.round((MARK_PX * 128) / 96);

const ONE_LINE = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;
const NO_GENRE = { backgroundColor: "currentColor", opacity: 0.25 } as const;
const ROW = {
  display: "flex",
  gap: 1.5,
  minWidth: 0,
  px: 2,
  py: 0.75,
  contentVisibility: "auto",
  containIntrinsicSize: "auto 72px",
  "& .song-bars": { display: "flex", gap: "2px", flexShrink: 0, alignSelf: "stretch" },
  "& .song-bar": { width: 4, borderRadius: "2px" },
  "& .song-text": { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.25 },
  "& .song-head": { display: "flex", alignItems: "center", gap: 1, minWidth: 0 },
  "& .song-name": { ...ONE_LINE, flex: 1, minWidth: 0, lineHeight: 1.4 },
  "& .play-marks": { display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 },
  "& .song-facts": { color: "text.secondary", fontSize: "0.8125rem", lineHeight: 1.45 },
} as const;

/** One recent play: the difficulty and the song, its marks as Hiroba's icons, then its counts. */
export function HistoryRow({
  play,
  lane,
  order,
  i18n,
}: {
  readonly play: RecentPlay;
  readonly lane: PictureLane;
  readonly order: number;
  readonly i18n: Translator;
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
    <Box component="li" className="history-row" sx={ROW}>
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
          <span className="song-name" lang={HIROBA_LANG}>
            {play.songTitle}
          </span>
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
            {options.supportChart === true && <SupportIcon label={t("history.support")} />}
          </span>
        </span>
        <span className="song-facts">{score.join(" · ")}</span>
        <span className="song-facts">{hits.join(" · ")}</span>
      </span>
    </Box>
  );
}

// Material's "support" icon (Apache 2.0): Hiroba's own picture of the support chart is not known.
function SupportIcon({ label }: { readonly label: string }) {
  return (
    <SvgIcon role="img" aria-label={label} titleAccess={label} sx={{ fontSize: MARK_PX }}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm7.46 7.12-2.78 1.15c-.51-1.36-1.58-2.44-2.95-2.94l1.15-2.78c2.1.8 3.77 2.47 4.58 4.57zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zM9.13 4.54l1.17 2.78c-1.38.5-2.47 1.59-2.98 2.97L4.54 9.13c.81-2.11 2.48-3.78 4.59-4.59zM4.54 14.87l2.78-1.15c.51 1.38 1.59 2.46 2.97 2.96l-1.17 2.78c-2.1-.81-3.77-2.48-4.58-4.59zm10.34 4.59-1.15-2.78c1.37-.51 2.45-1.59 2.95-2.97l2.78 1.17c-.81 2.1-2.48 3.77-4.58 4.58z" />
    </SvgIcon>
  );
}

function labeled(
  name: string,
  count: number | null,
  number: (value: number) => string,
): string | null {
  return count === null ? null : `${name} ${number(count)}`;
}
