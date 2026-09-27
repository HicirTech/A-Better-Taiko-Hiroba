import { SCORE_RANK_NAMES, SCORE_RANK_TIERS, type ScoreRank } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import { Fragment } from "react";

import type { ProfileView } from "../session-port";

/**
 * Each rank's colour, from its icon: the name is the only other thing that tells two ranks of one
 * tier apart. White is drawn grey so its bar shows on a light background.
 */
const RANK_COLOUR: Readonly<Record<ScoreRank, string>> = {
  2: "#bdbdbd",
  3: "#b87333",
  4: "#8fa9bd",
  5: "#d4a017",
  6: "#f48fb1",
  7: "#9c6ade",
  8: "linear-gradient(90deg, #ff5f6d, #ffc371, #47e891, #4facfe, #a86cf5)",
};

/** Ids for the tier totals, so a test can find them without a kanji in a selector. */
const TIER_ID: Readonly<Record<string, string>> = { 粋: "iki", 雅: "miyabi", 極: "kiwami" };

/**
 * The seven score ranks as a ladder, best first, with a total per tier (粋, 雅, 極) and one for 雅
 * and above. Each bar is scaled to the largest rank, so the bars compare ranks with each other.
 *
 * The heading does not say which charts the panel covers, and nothing here changes with the number
 * on the panel's image: that the image's 5 means おに and おに裏 is an inference checked on one
 * account, so the number is shown as data and the footnote says how far the check went. Nor does
 * this subtract crowns from ranks: the difference is negative on most panels on disk.
 */
export function RanksCard({ panel, i18n }: { panel: ProfileView["panel"]; i18n: Translator }) {
  const { t, locale } = i18n;
  const { ranks } = panel;
  const largest = Math.max(...Object.values(ranks));
  const sum = (of: readonly ScoreRank[]) => of.reduce((total, rank) => total + ranks[rank], 0);
  return (
    <Card id="ranks" variant="outlined">
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 500 }}>
            {t("panel.heading")}
          </Typography>
          <Typography id="panel-level" variant="body2" color="text.secondary">
            {t("panel.level", { level: panel.countLevel })}
          </Typography>
        </Stack>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            columnGap: 1.5,
            rowGap: 0.75,
            alignItems: "center",
            mt: 1,
          }}
        >
          {[...SCORE_RANK_TIERS].reverse().map((tier) => (
            <Fragment key={tier.name}>
              {[...tier.ranks].reverse().map((rank) => (
                <Fragment key={rank}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Box
                      aria-hidden
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "3px",
                        background: RANK_COLOUR[rank],
                      }}
                    />
                    <Typography variant="body2">{SCORE_RANK_NAMES[rank]}</Typography>
                  </Stack>
                  <Box
                    aria-hidden
                    sx={{ height: 8, borderRadius: 4, bgcolor: "action.hover", overflow: "hidden" }}
                  >
                    <Box
                      sx={{
                        height: 1,
                        width: `${largest === 0 ? 0 : (ranks[rank] / largest) * 100}%`,
                        background: RANK_COLOUR[rank],
                      }}
                    />
                  </Box>
                  <Typography
                    id={`rank-${rank}`}
                    variant="body2"
                    sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}
                  >
                    {ranks[rank].toLocaleString(locale)}
                  </Typography>
                </Fragment>
              ))}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ gridColumn: "1 / 3", mb: 0.5 }}
              >
                {t("panel.tierTotal", { tier: tier.name })}
              </Typography>
              <Typography
                id={`ranks-${TIER_ID[tier.name] ?? tier.name}`}
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums", mb: 0.5 }}
              >
                {sum(tier.ranks).toLocaleString(locale)}
              </Typography>
            </Fragment>
          ))}
        </Box>
        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="body2">{t("panel.miyabiOrBetter")}</Typography>
          <Typography
            id="ranks-miyabi-or-better"
            variant="body2"
            sx={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}
          >
            {sum([5, 6, 7, 8]).toLocaleString(locale)}
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5 }}>
          {t("panel.footnote")}
        </Typography>
      </CardContent>
    </Card>
  );
}
