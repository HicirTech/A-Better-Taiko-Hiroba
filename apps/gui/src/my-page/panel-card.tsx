import { SCORE_RANK_TIERS, type ScoreRank } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Card, CardContent, Stack, Typography } from "@mui/material";

import type { ProfileView } from "../session-port";
import { CROWN_COLOUR, RANK_COLOUR } from "./panel-colours";
import { ShareBlock, type ShareItem } from "./share-block";

const RANKS_WORST_FIRST: readonly ScoreRank[] = SCORE_RANK_TIERS.flatMap((tier) => tier.ranks);

// One card and footnote for both: the panel's crowns are not the account's clears at every level.
export function PanelCard({
  crowns,
  ranks,
  i18n,
}: {
  crowns: ProfileView["crowns"];
  ranks: ProfileView["panel"]["ranks"];
  i18n: Translator;
}) {
  const { t } = i18n;
  const rankItems: ShareItem[] = RANKS_WORST_FIRST.map((rank) => ({
    id: `rank-${rank}`,
    name: t(`scoreRank.${rank}`),
    count: ranks[rank],
    colour: RANK_COLOUR[rank],
  }));
  const crownItems: ShareItem[] = (["silver", "gold", "donderful"] as const).map((crown) => ({
    id: `crowns-${crown}`,
    name: t(`crowns.${crown}`),
    count: crowns[crown],
    colour: CROWN_COLOUR[crown],
  }));
  return (
    <Card id="panel" variant="outlined">
      <CardContent>
        <Stack spacing={2.5}>
          <ShareBlock id="ranks" heading={t("panel.ranks")} items={rankItems} i18n={i18n} />
          <ShareBlock id="crowns" heading={t("crowns.heading")} items={crownItems} i18n={i18n} />
          <Typography id="panel-footnote" variant="caption" color="text.secondary" component="p">
            {t("panel.footnote")}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
