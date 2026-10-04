import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { ReactNode } from "react";

import { HIROBA_LANG } from "../language/hiroba-lang";
import { GENRE_COLOUR } from "./genre-look";
import { LevelBadges } from "./level-badges";
import type { SongLook } from "./song-look";

const ONE_LINE = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;
// The row's parts are plain elements: a picker draws hundreds of them.
const ROW = {
  display: "flex",
  alignItems: "stretch",
  gap: 1,
  minWidth: 0,
  "& .song-bar": { width: 4, flexShrink: 0, borderRadius: "2px" },
  "& .song-text": { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", py: 0.25 },
  "& .song-name": { ...ONE_LINE, lineHeight: 1.4 },
  "& .song-artists": {
    ...ONE_LINE,
    color: "text.secondary",
    fontSize: "0.8125rem",
    lineHeight: 1.4,
  },
  "& .song-end": { alignSelf: "center", display: "flex", alignItems: "center", gap: 0.5 },
} as const;

export interface SongRowProps {
  readonly look: SongLook;
  readonly i18n: Translator;
  /** The name as marked up, such as a search marks the part it found; the plain name otherwise. */
  readonly name?: ReactNode;
  /** After the badges: such as a button that takes the song out. */
  readonly end?: ReactNode;
  readonly id?: string;
}

export function SongRow({ look, i18n, name, end, id }: SongRowProps) {
  const { genre } = look;
  return (
    <Box component="span" id={id} className="song-row" data-song-no={look.songNo} sx={ROW}>
      <span
        className="song-bar"
        aria-hidden
        style={
          genre === null
            ? { backgroundColor: "currentColor", opacity: 0.25 }
            : { backgroundColor: GENRE_COLOUR[genre] }
        }
      />
      <span className="song-text">
        <span className="song-name" lang={look.lang}>
          {name ?? look.name}
        </span>
        {look.artists.length > 0 && (
          <span className="song-artists" lang={HIROBA_LANG}>
            {look.artists.join(", ")}
          </span>
        )}
      </span>
      {(look.levels !== null || end !== undefined) && (
        <span className="song-end">
          {look.levels !== null && <LevelBadges levels={look.levels} i18n={i18n} />}
          {end}
        </span>
      )}
    </Box>
  );
}
