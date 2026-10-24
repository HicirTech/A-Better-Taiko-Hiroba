import type { Translator } from "@abth/i18n";
import { Box, ButtonBase, Skeleton } from "@mui/material";

import type { CostumeEditorView } from "../shared/session-port";
import type { ColourPart } from "./costume-parts";
import { pickRing } from "./pick-ring";
import { CLEAR_OF_STUCK } from "./stuck-clearance";

const SWATCH_PX = 32;
const WIDE_SWATCH_PX = 44;
// Hiroba's palette, as many swatches as a skeleton draws in their place.
const PALETTE_SIZE = 63;
const sideOf = (wide: boolean) => (wide ? WIDE_SWATCH_PX : SWATCH_PX);
const gridOf = (wide: boolean) =>
  ({
    display: "grid",
    gridTemplateColumns: `repeat(auto-fill, ${sideOf(wide)}px)`,
    justifyContent: "center",
    gap: wide ? 1 : 0.75,
  }) as const;

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
  const side = sideOf(wide);
  return (
    <Box id="costume-palette" sx={gridOf(wide)}>
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

const SWATCHES = [...Array(PALETTE_SIZE).keys()];

/** The palette's shape while the page's first read runs. */
export function PaletteSkeleton({ wide }: { readonly wide: boolean }) {
  const side = sideOf(wide);
  return (
    <Box aria-hidden sx={gridOf(wide)}>
      {SWATCHES.map((at) => (
        <Skeleton key={at} variant="rectangular" width={side} height={side} />
      ))}
    </Box>
  );
}
