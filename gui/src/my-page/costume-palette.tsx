import type { Translator } from "@abth/i18n";
import { Box, ButtonBase } from "@mui/material";

import type { CostumeEditorView } from "../session-port";
import type { ColourPart } from "./costume-parts";
import { pickRing } from "./pick-ring";
import { CLEAR_OF_STUCK } from "./stuck-clearance";

const SWATCH_PX = 32;
const WIDE_SWATCH_PX = 44;

export interface PaletteProps {
  readonly editor: CostumeEditorView;
  readonly part: ColourPart;
  readonly chosen: number;
  /** A wide window: larger swatches. */
  readonly wide: boolean;
  readonly i18n: Translator;
  readonly onPick: (id: number) => void;
}

// Each swatch is framed in one black pixel, as on Hiroba's own grid (#palette .color).
export function Palette({ editor, part, chosen, wide, i18n, onPick }: PaletteProps) {
  const { t } = i18n;
  const side = wide ? WIDE_SWATCH_PX : SWATCH_PX;
  return (
    <Box
      id="costume-palette"
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, ${side}px)`,
        justifyContent: "center",
        gap: wide ? 1 : 0.75,
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
              width: side,
              height: side,
              bgcolor: swatch.hex,
              border: "1px solid",
              borderColor: "common.black",
              ...pickRing(picked, "text.primary"),
              ...CLEAR_OF_STUCK,
            }}
          />
        );
      })}
    </Box>
  );
}
