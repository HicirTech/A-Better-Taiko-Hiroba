import { recentPlayKey } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Stack, Typography } from "@mui/material";
import { useEffect } from "react";

import { LoadFailed, Waiting } from "../my-page/editor-parts";
import type { PictureLane } from "../pictures/picture-lane";
import { HistoryRow } from "./history-row";
import type { RecentPlaysState } from "./use-recent-plays";

const LIST = { listStyle: "none", m: 0, p: 0 } as const;

/** The recent-plays page: the stored walk, read again by a pull, Read again or its keys. */
export function HistoryPage({
  history,
  lane,
  touchFirst,
  i18n,
}: {
  readonly history: RecentPlaysState;
  readonly lane: PictureLane;
  /** Whether a pull reads again here, or Read again does. */
  readonly touchFirst: boolean;
  readonly i18n: Translator;
}) {
  const { plays, reading, page, failure, load } = history;
  useEffect(load, [load]);
  const rows = plays ?? [];
  return (
    <Stack spacing={2} id="history-page">
      {reading && rows.length === 0 && (
        <Waiting id="history-reading">{i18n.t("history.readingPage", { page: page ?? 1 })}</Waiting>
      )}
      {failure !== null && (
        <LoadFailed id="history-failure" failure={failure} i18n={i18n}>
          {failure.page !== undefined && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {i18n.t("history.failedPage", { page: failure.page })}
            </Typography>
          )}
        </LoadFailed>
      )}
      {plays !== null && rows.length === 0 && !reading && (
        <Typography id="history-empty" color="text.secondary">
          {i18n.t(touchFirst ? "history.emptyPull" : "history.emptyReadAgain")}
        </Typography>
      )}
      <Stack component="ul" id="history-list" spacing={0} sx={LIST}>
        {rows.map((play, index) => (
          <HistoryRow key={recentPlayKey(play)} play={play} lane={lane} order={index} i18n={i18n} />
        ))}
      </Stack>
    </Stack>
  );
}
