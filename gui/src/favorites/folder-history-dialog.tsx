import type { Translator } from "@abth/i18n";
import { Box, Button, Stack } from "@mui/material";

import type { FolderHistoryEntry } from "../shared/session-port";
import { sameSongs } from "../shared/sets/favorite-sets";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { SongLookRow } from "../songs/song-look-row";
import { FoldCard } from "../ui/fold-card";
import { CheckIcon } from "../ui/icons";
import { LabelChip } from "../ui/label-chip";
import { LargeModal, type ModalLook } from "../ui/large-modal";
import { CARD_GAP, CARD_ROWS } from "../ui/section-card";
import { StatusNote } from "../ui/status-note";

/** How many songs a folded entry names after its count. */
const NAMED_FOLDED = 3;
const ENTRIES = {
  listStyle: "none",
  m: 0,
  p: 0,
  display: "flex",
  flexDirection: "column",
} as const;

export interface FolderHistoryDialogProps {
  readonly open: boolean;
  readonly entries: readonly FolderHistoryEntry[];
  /** The folder's songs on Hiroba now, whose entry is marked. */
  readonly current: readonly string[];
  readonly look: (songNo: string) => SongLook;
  /** The difficulty whose level the songs show in front of the others. */
  readonly shownDifficulty: ShownDifficulty;
  readonly touchFirst: boolean;
  readonly modalLook: ModalLook;
  readonly i18n: Translator;
  readonly onPutBack: (entry: FolderHistoryEntry) => void;
  readonly onSaveAsSet: (entry: FolderHistoryEntry) => void;
  readonly onClose: () => void;
}

/** The folders kept, newest first, each folded to its time and first songs until it is opened. */
export function FolderHistoryDialog({
  open,
  entries,
  current,
  look,
  shownDifficulty,
  touchFirst,
  modalLook,
  i18n,
  onPutBack,
  onSaveAsSet,
  onClose,
}: FolderHistoryDialogProps) {
  const { t, dateTime } = i18n;
  return (
    <LargeModal
      id="favorite-history-dialog"
      open={open}
      title={t("favorites.history.title")}
      touchFirst={touchFirst}
      modalLook={modalLook}
      i18n={i18n}
      onClose={onClose}
    >
      {entries.length === 0 ? (
        <StatusNote id="favorite-history-none">{t("favorites.history.none")}</StatusNote>
      ) : (
        <Box component="ul" id="favorite-history-list" sx={{ ...ENTRIES, gap: CARD_GAP }}>
          {entries.map((entry, index) => {
            const isCurrent = sameSongs(entry.songs, current);
            const named = entry.songs.slice(0, NAMED_FOLDED).map((songNo) => look(songNo).name);
            const time = dateTime(entry.keptAt);
            const songs = [t("favorites.history.songs", { count: entry.songs.length }), ...named];
            return (
              <li key={entry.songs.join(",")}>
                <FoldCard
                  id={`favorite-history-entry-${index}`}
                  level={3}
                  title={entry.setName ?? time}
                  summary={(entry.setName === null ? songs : [time, ...songs]).join(" · ")}
                  end={
                    isCurrent && (
                      <LabelChip
                        id="favorite-history-current"
                        icon={<CheckIcon fontSize="small" />}
                        label={t("favorites.history.current")}
                      />
                    )
                  }
                  details={() => (
                    <>
                      <Box component="ul" sx={CARD_ROWS}>
                        {entry.songs.map((songNo) => (
                          <SongLookRow
                            key={songNo}
                            look={look(songNo)}
                            shownDifficulty={shownDifficulty}
                            i18n={i18n}
                          />
                        ))}
                      </Box>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", pt: 1 }}>
                        <Button
                          id={`favorite-history-put-back-${index}`}
                          variant="outlined"
                          size="small"
                          disabled={isCurrent || entry.songs.length === 0}
                          onClick={() => onPutBack(entry)}
                        >
                          {t("favorites.history.putBack")}
                        </Button>
                        <Button
                          id={`favorite-history-save-set-${index}`}
                          variant="outlined"
                          size="small"
                          aria-haspopup="dialog"
                          onClick={() => onSaveAsSet(entry)}
                        >
                          {t("favorites.history.saveAsSet")}
                        </Button>
                      </Stack>
                    </>
                  )}
                />
              </li>
            );
          })}
        </Box>
      )}
    </LargeModal>
  );
}
