import type { Translator } from "@abth/i18n";
import type { ShareItem } from "../my-page/share-block";
import { CROWN_COLOUR, RANK_COLOUR, RANKS_WORST_FIRST } from "../shared/panel-colours";
import { STORY_PROFILE } from "./profile";

/** The made-up player's score ranks as the Overview's legend lists them. */
export const rankShares = ({ t }: Translator): readonly ShareItem[] =>
  RANKS_WORST_FIRST.map((rank) => ({
    id: `rank-${rank}`,
    name: t(`scoreRank.${rank}`),
    count: STORY_PROFILE.panel.ranks[rank],
    colour: RANK_COLOUR[rank],
    icon: { kind: "rankIcon", rank },
  }));

/** The made-up player's crowns as the Overview's legend lists them. */
export const crownShares = ({ t }: Translator): readonly ShareItem[] =>
  (["silver", "gold", "donderful"] as const).map((crown) => ({
    id: `crowns-${crown}`,
    name: t(`crowns.${crown}`),
    count: STORY_PROFILE.crowns[crown],
    colour: CROWN_COLOUR[crown],
    icon: { kind: "crownIcon", crown },
  }));
