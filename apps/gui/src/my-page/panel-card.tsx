import type { Translator } from "@abth/i18n";
import { Card, CardContent, Divider, Stack, Typography } from "@mui/material";

import type { ProfileView } from "../session-port";
import { CrownCounts } from "./crown-counts";
import { RankLadder } from "./rank-ladder";

/**
 * Hiroba's overall panel: the crown counts and the score ranks, which the page gives in one block,
 * div.total_score, over the same charts. One heading and one footnote cover both, so the crown
 * totals do not read as the account's clears at every level: the wiki's Reading-Profile-and-MyDon
 * reconciles one capture's panel with fewer crowns than every level together holds.
 *
 * The heading does not say which charts the panel covers, and nothing here changes with the number
 * on the panel's image: that the image's 5 means おに and おに裏 is an inference checked on one
 * account, so the number is shown as data and the footnote says how far the check went. Nor does
 * this subtract crowns from ranks: the difference is negative on most panels on disk.
 */
export function PanelCard({
  crowns,
  panel,
  i18n,
}: {
  crowns: ProfileView["crowns"];
  panel: ProfileView["panel"];
  i18n: Translator;
}) {
  const { t } = i18n;
  return (
    <Card id="panel" variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "baseline", mb: 1.5 }}
        >
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 500 }}>
            {t("panel.heading")}
          </Typography>
          <Typography id="panel-level" variant="body2" color="text.secondary">
            {t("panel.level", { level: panel.countLevel })}
          </Typography>
        </Stack>
        <CrownCounts crowns={crowns} i18n={i18n} />
        <Divider sx={{ my: 2 }} />
        <RankLadder ranks={panel.ranks} i18n={i18n} />
        <Typography
          id="panel-footnote"
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{ mt: 1.5 }}
        >
          {t("panel.footnote")}
        </Typography>
      </CardContent>
    </Card>
  );
}
