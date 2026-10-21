import { CHART_BRANCHES, type ChartBranch, type ChartDensity, type NoteDensity } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";
import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useState } from "react";

import type { SongDensityRead } from "../song-catalogue/types";
import { ProgressBar } from "../ui/progress-bar";
import { ReadFailureAlert } from "../ui/read-failure-alert";
import { SubsectionTitle } from "../ui/section-title";
import { StatusNote } from "../ui/status-note";
import { clockText, DensityLine, peakOf } from "./density-line";

const BRANCH_LABEL: Readonly<Record<ChartBranch, MessageKey>> = {
  normal: "details.branch.normal",
  advanced: "details.branch.advanced",
  master: "details.branch.master",
};

/** A song's density as its details last read it. */
export interface DensityState {
  readonly reading: boolean;
  readonly read: SongDensityRead | null;
  readonly failure: string | null;
}

/** The path taiko.wiki's max combo counts: a branched chart's master branch. */
export const masterOf = (density: ChartDensity): NoteDensity =>
  density.branched ? density.lines.master : density.line;

/** A chart's note density over the song, drawn only once its notes match taiko.wiki's count. */
export function ChartDensitySection({
  state,
  density,
  maxCombo,
  i18n,
}: {
  readonly state: DensityState;
  /** The chosen chart's, if its TJA holds it. */
  readonly density: ChartDensity | undefined;
  readonly maxCombo: number | null;
  readonly i18n: Translator;
}) {
  const { t } = i18n;
  const [branch, setBranch] = useState<ChartBranch>("master");
  const checked = density !== undefined && masterOf(density).notes === maxCombo;
  const line = checked ? (density.branched ? density.lines[branch] : density.line) : null;
  const peak = line === null ? null : peakOf(line);
  const failed = state.failure !== null && state.failure !== "noChart";
  return (
    <Box component="section" id="song-density" aria-labelledby="song-density-title">
      <SubsectionTitle
        id="song-density-title"
        end={
          <>
            {peak !== null && (
              <Typography id="song-density-peak" variant="body2" color="text.secondary">
                {t("details.densityPeak", { value: peak.count })}
              </Typography>
            )}
            {checked && density.branched && (
              <ToggleButtonGroup
                id="song-density-branches"
                size="small"
                exclusive
                value={branch}
                onChange={(_event, chosen: ChartBranch | null) =>
                  chosen !== null && setBranch(chosen)
                }
                aria-label={t("details.branch")}
                sx={{ ml: "auto" }}
              >
                {CHART_BRANCHES.map((each) => (
                  <ToggleButton
                    key={each}
                    id={`song-density-branch-${each}`}
                    value={each}
                    sx={{ py: 0.25, px: 1, textTransform: "none" }}
                  >
                    {t(BRANCH_LABEL[each])}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            )}
          </>
        }
      >
        {t("details.density")}
      </SubsectionTitle>
      {line !== null && peak !== null ? (
        <DensityLine
          density={line}
          label={t("details.densityLine", { peak: peak.count, at: clockText(peak.at) })}
        />
      ) : state.reading && state.read === null ? (
        <ProgressBar id="song-density-reading" label={t("details.densityReading")} />
      ) : (
        !failed && <StatusNote id="song-density-none">{t("details.noDensity")}</StatusNote>
      )}
      {failed && (
        <ReadFailureAlert
          id="song-density-failure"
          message={t("details.densityFailed")}
          code={state.failure}
          i18n={i18n}
        />
      )}
    </Box>
  );
}
