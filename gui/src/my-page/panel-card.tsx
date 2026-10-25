import type { Translator } from "@abth/i18n";
import { Stack } from "@mui/material";

import type { PictureLane } from "../pictures/picture-lane";
import type { SystemToast } from "../platform";
import { ShareBlock, type ShareItem } from "../profile/share-block";
import { CROWN_COLOUR, RANK_COLOUR, RANKS_WORST_FIRST } from "../shared/panel-colours";
import type { ProfileView } from "../shared/session-port";

/** The first of the Miyabi ranks, on Hiroba's scale of score ranks. */
const MIYABI = 5;

export function PanelCard({
  crowns,
  ranks,
  lane,
  toast,
  i18n,
}: {
  crowns: ProfileView["crowns"];
  ranks: ProfileView["panel"]["ranks"];
  lane: PictureLane;
  toast: SystemToast | undefined;
  i18n: Translator;
}) {
  const { t } = i18n;
  const rankItems: ShareItem[] = RANKS_WORST_FIRST.map((rank) => ({
    id: `rank-${rank}`,
    name: t(`scoreRank.${rank}`),
    count: ranks[rank],
    colour: RANK_COLOUR[rank],
    icon: { kind: "rankIcon", rank },
    // In two lines, Miyabi's three and Kiwami first, then Iki's three.
    line: rank >= MIYABI ? 1 : 2,
  }));
  const crownItems: ShareItem[] = (["silver", "gold", "donderful"] as const).map((crown) => ({
    id: `crowns-${crown}`,
    name: t(`crowns.${crown}`),
    count: crowns[crown],
    colour: CROWN_COLOUR[crown],
    icon: { kind: "crownIcon", crown },
  }));
  return (
    <Stack id="panel" spacing={3}>
      <ShareBlock
        id="ranks"
        heading={t("panel.ranks")}
        items={rankItems}
        lane={lane}
        toast={toast}
        i18n={i18n}
      />
      <ShareBlock
        id="crowns"
        heading={t("crowns.heading")}
        items={crownItems}
        lane={lane}
        toast={toast}
        i18n={i18n}
      />
    </Stack>
  );
}
