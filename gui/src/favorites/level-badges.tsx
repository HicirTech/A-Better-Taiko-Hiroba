import type { Translator } from "@abth/i18n";

import { DIFFICULTIES } from "../song-catalogue/types";
import { DIFFICULTY_COLOUR, DIFFICULTY_LABEL, DIFFICULTY_TEXT } from "./genre-look";
import type { SongLook } from "./song-look";

const BADGES = { display: "inline-flex", alignItems: "center", gap: 2, flexShrink: 0 } as const;
const BADGE = {
  boxSizing: "border-box",
  minWidth: 20,
  height: 20,
  padding: "0 3px",
  borderRadius: 4,
  color: DIFFICULTY_TEXT,
  fontSize: "0.6875rem",
  fontWeight: 700,
  lineHeight: "20px",
  textAlign: "center",
} as const;

/** One badge for each chart the song has; plain elements, as a page draws hundreds of rows. */
export function LevelBadges({
  levels,
  i18n,
}: {
  levels: NonNullable<SongLook["levels"]>;
  i18n: Translator;
}) {
  const { t } = i18n;
  return (
    <span style={BADGES}>
      {DIFFICULTIES.map((difficulty) => {
        const level = levels[difficulty];
        if (level === null) {
          return null;
        }

        const label = t("song.level", { difficulty: t(DIFFICULTY_LABEL[difficulty]), level });
        return (
          <span
            key={difficulty}
            role="img"
            aria-label={label}
            title={label}
            data-difficulty={difficulty}
            style={{ ...BADGE, backgroundColor: DIFFICULTY_COLOUR[difficulty] }}
          >
            {level}
          </span>
        );
      })}
    </span>
  );
}
