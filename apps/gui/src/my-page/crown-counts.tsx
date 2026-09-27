import type { Translator } from "@abth/i18n";
import { Box, Divider, Typography } from "@mui/material";

import type { ProfileView } from "../session-port";
import { Stat } from "./stat";

const GRID = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 } as const;

/**
 * The panel's three crown counts as it gives them, and two totals added up from them.
 *
 * Each count is exclusive: a chart is counted under its best crown only. So every crowned chart is
 * a clear, and gold and donderful are the full combos. Hiroba's own クリア以上 and フルコンボ以上
 * appear in no capture, so the totals carry English labels. They cover the panel's charts only,
 * not every chart the account has cleared, which is why this sits in the panel card, under its
 * heading and footnote.
 */
export function CrownCounts({ crowns, i18n }: { crowns: ProfileView["crowns"]; i18n: Translator }) {
  const { t, locale } = i18n;
  const { silver, gold, donderful } = crowns;
  return (
    <Box id="crowns" component="section">
      <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
        {t("crowns.heading")}
      </Typography>
      <Box sx={GRID}>
        <Stat id="crowns-silver" label={t("crowns.silver")} value={silver} locale={locale} />
        <Stat id="crowns-gold" label={t("crowns.gold")} value={gold} locale={locale} />
        <Stat
          id="crowns-donderful"
          label={t("crowns.donderful")}
          value={donderful}
          locale={locale}
        />
      </Box>
      <Divider sx={{ my: 1.5 }} />
      <Box sx={GRID}>
        <Stat
          id="crowns-cleared"
          label={t("crowns.clearedOrBetter")}
          value={silver + gold + donderful}
          locale={locale}
        />
        <Stat
          id="crowns-full-combo"
          label={t("crowns.fullComboOrBetter")}
          value={gold + donderful}
          locale={locale}
        />
      </Box>
    </Box>
  );
}
