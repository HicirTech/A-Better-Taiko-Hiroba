import type { Translator } from "@abth/i18n";
import { Alert, Box, Stack } from "@mui/material";
import { useRef } from "react";

import type { PictureLane } from "../pictures/picture-lane";
import { IN_THE_WINDOW, usePicture } from "../pictures/use-picture";
import { COLUMN_MAX_WIDTH_PX } from "./costume-page";
import { HIROBA_BLOCK } from "./hiroba-px";
import { MY_DON, MyDonTile } from "./my-don-portrait";

/** The portrait's side on this page: about the size Hiroba's own tile is on a phone's page. */
const PORTRAIT_SIDE_PX = 160;

/**
 * The Costume page of a run that may not change the costume (Android for now, and packaged
 * builds): the page still opens, to show the player's マイどん as it is now and why it cannot be
 * changed, and nothing else. It reads nothing from the editor and has no control, nor a read again
 * to press: the portrait itself comes through the picture lane, kept, like the Overview's.
 */
export function ShutCostumePage({ lane, i18n }: { lane: PictureLane; i18n: Translator }) {
  const { t } = i18n;
  const tile = useRef<HTMLSpanElement>(null);
  const portrait = usePicture(lane, MY_DON, tile, { ...IN_THE_WINDOW, order: 0 });
  return (
    <Stack
      id="costume-page"
      spacing={2}
      sx={{ alignItems: "center", alignSelf: "center", width: 1, maxWidth: COLUMN_MAX_WIDTH_PX }}
    >
      <Box sx={{ ...HIROBA_BLOCK, width: PORTRAIT_SIDE_PX }}>
        <MyDonTile ref={tile} answer={portrait} i18n={i18n} />
      </Box>
      <Alert id="costume-not-open" severity="info" sx={{ width: 1 }}>
        {t("costume.notOpen")}
      </Alert>
    </Stack>
  );
}
