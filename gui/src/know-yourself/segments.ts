import type { CrownState } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";

import { CROWN_COLOUR, RANK_COLOUR, UNCLEARED_COLOUR } from "../shared/panel-colours";
import type { IconWant } from "../shared/session-port";
import { CLEAR_SEGMENTS, RANK_SEGMENTS } from "./ladder";

/** A part of a share bar: its name, its colour and its icon in the legend. */
export interface Segment {
  readonly id: string;
  readonly name: string;
  readonly colour: string;
  readonly icon?: IconWant;
}

const CROWN_NAME: Readonly<Record<CrownState, MessageKey>> = {
  none: "know.never",
  played: "know.tried",
  silver: "crowns.silver",
  gold: "crowns.gold",
  donderful: "crowns.donderful",
};

export const clearSegments = ({ t }: Translator): Segment[] =>
  CLEAR_SEGMENTS.map((crown) =>
    crown === "none" || crown === "played"
      ? { id: crown, name: t(CROWN_NAME[crown]), colour: UNCLEARED_COLOUR[crown] }
      : {
          id: crown,
          name: t(CROWN_NAME[crown]),
          colour: CROWN_COLOUR[crown],
          icon: { kind: "crownIcon", crown },
        },
  );

export const rankSegments = ({ t }: Translator): Segment[] =>
  RANK_SEGMENTS.map((rank) =>
    rank === "none"
      ? { id: "rank-none", name: t("know.noRank"), colour: UNCLEARED_COLOUR.played }
      : {
          id: `rank-${rank}`,
          name: t(`scoreRank.${rank}`),
          colour: RANK_COLOUR[rank],
          icon: { kind: "rankIcon", rank },
        },
  );
