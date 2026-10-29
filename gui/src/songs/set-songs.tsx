import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";

import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { CARD_ROWS } from "../ui/section-card";
import { type DetailsOpener, SongLookRow } from "./song-look-row";

/** Songs as a set shows them while it is not edited, a press on one opening its details. */
export function SetSongs({
  id,
  songs,
  look,
  shownDifficulty,
  i18n,
  openDetails,
  scrolling = true,
}: {
  /** Gives `<id>-songs` to the list and `<id>-song-<song number>` to each row. */
  readonly id: string;
  readonly songs: readonly string[];
  readonly look: (songNo: string) => SongLook;
  /** The difficulty whose level the songs show in front of the others. */
  readonly shownDifficulty: ShownDifficulty;
  readonly i18n: Translator;
  /** None leaves the rows to be read only. */
  readonly openDetails?: DetailsOpener;
  /** A name too long for its row scrolls; a picture cuts it short instead. */
  readonly scrolling?: boolean;
}) {
  return (
    <Box component="ul" id={`${id}-songs`} sx={CARD_ROWS}>
      {songs.map((songNo) => (
        <SongLookRow
          key={songNo}
          id={`${id}-song-${songNo}`}
          data-key={songNo}
          look={look(songNo)}
          shownDifficulty={shownDifficulty}
          i18n={i18n}
          scrolling={scrolling}
          onOpen={openDetails?.(songNo)}
        />
      ))}
    </Box>
  );
}
