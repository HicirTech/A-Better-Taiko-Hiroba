import type { Translator } from "@abth/i18n";
import {
  Dialog,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";

import { DIFFICULTY_LABEL, GENRE_LABEL, LEVEL_DIFFICULTY } from "../favorites/genre-look";
import { HistoryRow } from "../history/history-row";
import { HIROBA_LANG } from "../language/hiroba-lang";
import { LoadFailed, Waiting } from "../my-page/editor-parts";
import { useLongPress } from "../my-page/use-long-press";
import { useBackCloses } from "../navigation/back-closers";
import type { PictureLane } from "../pictures/picture-lane";
import type { ScoresProgress, ScoresStop, ScoreView } from "../session-port";
import type { ScoresState } from "./use-scores";

const LIST = { listStyle: "none", m: 0, p: 0 } as const;
const ACTIONS_TITLE_ID = "scores-actions-title";

/** The scores page: every played chart's newest reading, read by a pull, Read again or its keys. */
export function ScoresPage({
  scores,
  lane,
  touchFirst,
  i18n,
}: {
  readonly scores: ScoresState;
  readonly lane: PictureLane;
  /** A touch screen: a pull reads, and a long press opens a song's actions. */
  readonly touchFirst: boolean;
  readonly i18n: Translator;
}) {
  const { t, number } = i18n;
  const { view, reading, progress, song, failure, load, readSong } = scores;
  useEffect(load, [load]);
  const [menu, setMenu] = useState<{ score: ScoreView; x: number; y: number } | null>(null);
  const [offering, setOffering] = useState<ScoreView | null>(null);
  const stopOffering = useCallback(() => setOffering(null), []);
  useBackCloses(offering !== null, stopOffering);
  const readAgain = (score: ScoreView) => {
    setMenu(null);
    setOffering(null);
    void readSong(score);
  };
  const rows = view?.scores ?? [];
  const settled = view !== null && !reading && failure === null;
  return (
    <Stack spacing={2} id="scores-page">
      {reading && <Waiting id="scores-reading">{scoresReadingText(i18n, progress, song)}</Waiting>}
      {failure !== null && (
        <LoadFailed id="scores-failure" failure={failure} i18n={i18n}>
          {failure.at !== undefined && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {stopText(i18n, failure.at)}
            </Typography>
          )}
        </LoadFailed>
      )}
      {settled && rows.length === 0 && (
        <Typography id="scores-empty" color="text.secondary">
          {t(touchFirst ? "scores.emptyPull" : "scores.emptyReadAgain")}
        </Typography>
      )}
      {settled && rows.length > 0 && scores.nothingNew && (
        <Typography id="scores-nothing-new" color="text.secondary">
          {t("scores.nothingNew")}
        </Typography>
      )}
      {settled && rows.length > 0 && view.unread > 0 && (
        <Typography id="scores-unread" color="text.secondary">
          {t("scores.unread", { count: number(view.unread) })}
        </Typography>
      )}
      <Stack component="ul" id="scores-list" spacing={0} sx={LIST}>
        {rows.map((score, index) => (
          <ScoreRow
            key={`${score.songNo}/${score.level}`}
            score={score}
            lane={lane}
            order={index}
            byLongPress={touchFirst}
            i18n={i18n}
            onMenu={(x, y) => setMenu({ score, x, y })}
            onHold={() => setOffering(score)}
          />
        ))}
      </Stack>
      <Menu
        id="scores-menu"
        open={menu !== null}
        onClose={() => setMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={menu === null ? undefined : { top: menu.y, left: menu.x }}
      >
        <MenuItem id="scores-menu-read-song" onClick={() => menu && readAgain(menu.score)}>
          {t("scores.readSong")}
        </MenuItem>
      </Menu>
      <Dialog
        id="scores-actions"
        open={offering !== null}
        onClose={stopOffering}
        aria-labelledby={ACTIONS_TITLE_ID}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle id={ACTIONS_TITLE_ID} lang={HIROBA_LANG}>
          {offering?.songTitle}
        </DialogTitle>
        <List disablePadding sx={{ pb: 1 }}>
          <ListItemButton
            id="scores-actions-read-song"
            onClick={() => offering && readAgain(offering)}
          >
            <ListItemText primary={t("scores.readSong")} />
          </ListItemButton>
        </List>
      </Dialog>
    </Stack>
  );
}

/** A chart's row: a right-click on a PC, or a long press on a phone, opens its song's actions. */
function ScoreRow({
  score,
  lane,
  order,
  byLongPress,
  i18n,
  onMenu,
  onHold,
}: {
  readonly score: ScoreView;
  readonly lane: PictureLane;
  readonly order: number;
  readonly byLongPress: boolean;
  readonly i18n: Translator;
  readonly onMenu: (x: number, y: number) => void;
  readonly onHold: () => void;
}) {
  const held = useLongPress(byLongPress, onHold);
  return (
    <HistoryRow
      play={score}
      lane={lane}
      order={order}
      i18n={i18n}
      handlers={
        byLongPress
          ? held
          : {
              onContextMenu: (event) => {
                event.preventDefault();
                onMenu(event.clientX, event.clientY);
              },
            }
      }
    />
  );
}

/** What a read of scores is doing: the walk's page, the lists or charts so far, or one song. */
export function scoresReadingText(
  i18n: Translator,
  progress: ScoresProgress | null,
  song: ScoreView | null,
): string {
  if (song !== null) {
    return i18n.t("scores.readingSong", { song: song.songTitle });
  }
  if (progress === null || progress.step === "recentPlays") {
    return i18n.t("scores.readingPlays", { page: progress?.page ?? 1 });
  }
  const key = progress.step === "lists" ? "scores.readingLists" : "scores.readingCharts";
  return i18n.t(key, { done: i18n.number(progress.done), total: i18n.number(progress.total) });
}

function stopText(i18n: Translator, at: ScoresStop): string {
  switch (at.kind) {
    case "recentPlays":
      return i18n.t("history.failedPage", { page: at.page });
    case "list":
      return i18n.t("scores.failedList", { genre: i18n.t(GENRE_LABEL[at.genre]) });
    case "detail":
      return i18n.t("scores.failedChart", {
        song: at.songTitle ?? at.songNo,
        difficulty: i18n.t(DIFFICULTY_LABEL[LEVEL_DIFFICULTY[at.level]]),
      });
  }
}
