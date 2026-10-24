import { playOptionIcons, type RecentPlay, type ScoreRank } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";

import { HirobaIcon } from "../pictures/hiroba-icon";
import type { PictureLane } from "../pictures/picture-lane";
import type { CrownKind } from "../shared/session-port";
import { SupportIcon } from "../ui/icons";
import { CHART_MARK_PX } from "./chart-level";

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

// The art's proportions: a crown is taller than wide, a rank wider than tall, an option square.
export const CROWN_RATIO = 52 / 59;
const CROWN_WIDTH_PX = Math.round(CHART_MARK_PX * CROWN_RATIO);
const RANK_WIDTH_PX = Math.round((CHART_MARK_PX * 128) / 96);

/** A play's marks as Hiroba's icons: its crown, its rank and its options. */
export function PlayMarks({
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
  const { options } = play.record;
  const optionLabel = {
    random: t(options.random === "detarame" ? "history.detarame" : "history.kimagure"),
    abekobe: t("history.abekobe"),
    doron: t("history.doron"),
    speed: t("history.speed", { speed: number(options.speed) }),
  } as const;
  return (
    <>
      {play.crown !== "none" && play.crown !== "played" && (
        <HirobaIcon
          want={{ kind: "crownIcon", crown: play.crown }}
          width={CROWN_WIDTH_PX}
          height={CHART_MARK_PX}
          label={t(CROWN_KEY[play.crown])}
          lane={lane}
          order={order}
        />
      )}
      {play.scoreRank !== null && (
        <HirobaIcon
          want={{ kind: "rankIcon", rank: play.scoreRank }}
          width={RANK_WIDTH_PX}
          height={CHART_MARK_PX}
          label={t(RANK_KEY[play.scoreRank])}
          lane={lane}
          order={order}
        />
      )}
      {playOptionIcons(options).map(({ option, code }) => (
        <HirobaIcon
          key={code}
          want={{ kind: "optionIcon", option: code }}
          width={CHART_MARK_PX}
          height={CHART_MARK_PX}
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
          sx={{ fontSize: CHART_MARK_PX }}
        />
      )}
    </>
  );
}

/** A play's marks' shape while a page's first read runs: a crown's and a rank's. */
export const PLAY_MARKS_SKELETON = [CROWN_WIDTH_PX, RANK_WIDTH_PX] as const;
