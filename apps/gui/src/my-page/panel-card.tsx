import { SCORE_RANK_NAMES, SCORE_RANK_TIERS, type ScoreRank } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Card, CardContent, Stack, Typography } from "@mui/material";

import { HIROBA_LANG } from "../language/show-language";
import type { ProfileView } from "../session-port";
import { CROWN_COLOUR, RANK_COLOUR } from "./panel-colours";
import { ShareBlock, type ShareItem } from "./share-block";

/** The seven ranks from 白粋 to 虹極, left to right (the user's call, 2026-09-29). */
const RANKS_WORST_FIRST: readonly ScoreRank[] = SCORE_RANK_TIERS.flatMap((tier) => tier.ranks);

/**
 * The counts of Hiroba's overall panel, drawn as GitHub's "Languages" box (the user's call,
 * 2026-09-28): one block for the score ranks and one for the crowns, each count as its share of its
 * block. Hiroba's panel art is not fetched.
 *
 * The panel gives both over the same charts, which is why they share a card and a footnote: the
 * crowns are not the account's clears at every level. The wiki's Reading-Profile-and-MyDon
 * reconciles one capture's panel with fewer crowns than every level together holds, and what the
 * panel covers was checked on one account, which the footnote says.
 */
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
    name: SCORE_RANK_NAMES[rank],
    lang: HIROBA_LANG,
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
