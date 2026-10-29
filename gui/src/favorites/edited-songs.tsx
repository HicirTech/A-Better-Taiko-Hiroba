import type { Translator } from "@abth/i18n";
import { IconButton } from "@mui/material";

import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { SongLookRow } from "../songs/song-look-row";
import { CloseIcon } from "../ui/icons";
import { TO_THE_CARD_SIDES } from "../ui/section-card";
import { SortableList } from "./sortable-list";

const SORTED_ROWS = { gap: 0, ...TO_THE_CARD_SIDES } as const;

/** Songs being edited: each moved by its handle or a long press, and taken out by its ×. */
export function EditedSongs({
  id,
  songs: songNos,
  look,
  shownDifficulty,
  i18n,
  byLongPress,
  onRemove,
  onMove,
}: {
  /** Gives `<id>-songs` to the list and `<id>-song-<song number>` to each row. */
  readonly id: string;
  readonly songs: readonly string[];
  readonly look: (songNo: string) => SongLook;
  /** The difficulty whose level the songs show in front of the others. */
  readonly shownDifficulty: ShownDifficulty;
  readonly i18n: Translator;
  /** A long press moves a song, as on a phone; otherwise its handle does. */
  readonly byLongPress: boolean;
  readonly onRemove: (songNo: string) => void;
  readonly onMove: (from: number, to: number) => void;
}) {
  const { t } = i18n;
  const songs = songNos.map((songNo) => ({ key: songNo, name: look(songNo).name }));
  return (
    <SortableList
      id={`${id}-songs`}
      items={songs}
      byLongPress={byLongPress}
      i18n={i18n}
      onMove={onMove}
      sx={SORTED_ROWS}
      renderItem={(songNo, handle) => {
        const shown = look(songNo);
        const label = t("favorites.removeSong", { name: shown.name });
        return (
          <SongLookRow
            id={`${id}-song-${songNo}`}
            component="div"
            look={shown}
            shownDifficulty={shownDifficulty}
            i18n={i18n}
            scrolling
            start={handle}
            end={
              <IconButton
                size="small"
                aria-label={label}
                title={label}
                data-song-no={songNo}
                onClick={() => onRemove(songNo)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          />
        );
      }}
    />
  );
}
