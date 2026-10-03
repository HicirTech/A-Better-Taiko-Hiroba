import type { Translator } from "@abth/i18n";
import { Box, ButtonBase } from "@mui/material";

import type { CostumeEditorView } from "../session-port";
import type { ColourPart } from "./costume-parts";
import { pickRing } from "./pick-ring";

const SWATCH_PX = 32;
const WIDE_SWATCH_PX = 44;

export interface PaletteProps {
  readonly editor: CostumeEditorView;
  readonly part: ColourPart;
  readonly chosen: number;
  /** A wide window: larger swatches, as many to a row as fit. */
  readonly wide: boolean;
  readonly i18n: Translator;
  readonly onPick: (id: number) => void;
}

// Hiroba's own grid (#palette .color): nine to a row, each swatch framed in one black pixel.
export function Palette({ editor, part, chosen, wide, i18n, onPick }: PaletteProps) {
  const { t } = i18n;
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: wide
          ? `repeat(auto-fill, minmax(${WIDE_SWATCH_PX}px, 1fr))`
          : `repeat(9, ${SWATCH_PX}px)`,
        alignContent: "start",
        gap: wide ? 1 : 0.75,
        p: wide ? 0.75 : 0.5,
        ...(wide && { flex: "1 1 0", minHeight: 0, overflowY: "auto" }),
      }}
    >
      {editor.palette.map((swatch) => {
        const picked = chosen === swatch.id;
        return (
          <ButtonBase
            key={swatch.id}
            id={`swatch-${part}-${swatch.id}`}
            aria-label={t("costume.id", { id: swatch.id })}
            aria-pressed={picked}
            title={t("costume.id", { id: swatch.id })}
            onClick={() => onPick(swatch.id)}
            sx={{
              width: 1,
              aspectRatio: "1",
              bgcolor: swatch.hex,
              border: "1px solid",
              borderColor: "common.black",
              ...pickRing(picked, "text.primary"),
            }}
          />
        );
      })}
    </Box>
  );
}
