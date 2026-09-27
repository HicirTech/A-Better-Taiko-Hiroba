import { SCORE_RANK_NAMES, SCORE_RANK_TIERS, type ScoreRank } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, Divider, Stack, Typography } from "@mui/material";
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

/**
 * The tiers the "or better" total adds up: every tier above the lowest, 粋, so 雅 and 極. Taken
 * from SCORE_RANK_TIERS, like the tier totals, so the ladder writes out no tier of its own.
 */
const OR_BETTER_TIERS = SCORE_RANK_TIERS.slice(1);

/** A total's id names the ranks it adds up, so a test finds it without a kanji in a selector. */
const totalId = (of: readonly ScoreRank[]) => `ranks-total-${of.join("-")}`;

/**
 * The panel's seven score ranks as a ladder, best first, with a total per tier (粋, 雅, 極) and one
 * for 雅 and above. Each bar is scaled to the largest rank, so the bars compare ranks with each
 * other.
 */
export function RankLadder({
  ranks,
  i18n,
}: {
  ranks: ProfileView["panel"]["ranks"];
  i18n: Translator;
}) {
  const { t, locale } = i18n;
  const largest = Math.max(...Object.values(ranks));
  const sum = (of: readonly ScoreRank[]) => of.reduce((total, rank) => total + ranks[rank], 0);
  const orBetterFrom = OR_BETTER_TIERS[0];
  const orBetterRanks = OR_BETTER_TIERS.flatMap((tier) => tier.ranks);
  return (
    <Box id="ranks" component="section">
      <Typography variant="subtitle2" component="h3">
        {t("panel.ranks")}
      </Typography>
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
              id={totalId(tier.ranks)}
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums", mb: 0.5 }}
            >
              {sum(tier.ranks).toLocaleString(locale)}
            </Typography>
          </Fragment>
        ))}
      </Box>
      {orBetterFrom !== undefined && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography variant="body2">
              {t("panel.tierOrBetter", { tier: orBetterFrom.name })}
            </Typography>
            <Typography
              id={totalId(orBetterRanks)}
              variant="body2"
              sx={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}
            >
              {sum(orBetterRanks).toLocaleString(locale)}
            </Typography>
          </Stack>
        </>
      )}
    </Box>
  );
}
