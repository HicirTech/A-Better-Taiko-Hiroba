import { SCORE_RANK_NAMES, type ScoreRank } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Card, CardContent, Stack, Typography } from "@mui/material";

import type { ProfileView } from "../session-port";
import { ShareBlock, type ShareItem } from "./share-block";

/** 虹極's colours, and the donderful crown's: both are rainbows on Hiroba's icons. */
const RAINBOW = "linear-gradient(90deg, #ff5f6d, #ffc371, #47e891, #4facfe, #a86cf5)";

/**
 * Each rank's colour, from its icon: the name is the only other thing that tells two ranks of one
 * tier apart. White is drawn grey so it shows on a light background.
 */
const RANK_COLOUR: Readonly<Record<ScoreRank, string>> = {
  2: "#bdbdbd",
  3: "#b87333",
  4: "#8fa9bd",
  5: "#d4a017",
  6: "#f48fb1",
  7: "#9c6ade",
  8: RAINBOW,
};

/** The seven ranks, best first, as the user listed them. */
const RANKS_BEST_FIRST: readonly ScoreRank[] = [8, 7, 6, 5, 4, 3, 2];

/**
 * Each crown's colour, the mean of its icon's coloured pixels (reference/crown-icons): silver
 * (171,205,205), gold (227,198,58), and donderful the rainbow it is drawn in.
 */
const CROWN_COLOUR = { silver: "#abcdcd", gold: "#e3c63a", donderful: RAINBOW } as const;

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
  const rankItems: ShareItem[] = RANKS_BEST_FIRST.map((rank) => ({
    id: `rank-${rank}`,
    name: SCORE_RANK_NAMES[rank],
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
