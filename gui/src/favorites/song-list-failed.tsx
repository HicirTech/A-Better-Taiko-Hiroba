import type { Translator } from "@abth/i18n";
import { Box, Button, FormHelperText } from "@mui/material";

import type { SongCatalogue } from "./use-song-catalogue";

/** taiko.wiki's song list could not be read and none is kept: why, and a way to try again. */
export function SongListFailed({
  id,
  catalogue,
  i18n,
}: {
  /** The ids' start: `<id>-failed` and `<id>-retry`. */
  readonly id: string;
  readonly catalogue: SongCatalogue;
  readonly i18n: Translator;
}) {
  const { t } = i18n;
  return (
    <>
      <FormHelperText id={`${id}-failed`} error>
        {t("picker.failed")}
        {catalogue.failure !== null && (
          <Box
            component="span"
            sx={{ display: "block", mt: 0.5, fontFamily: "monospace", userSelect: "text" }}
          >
            {t("picker.code", { code: catalogue.failure })}
          </Box>
        )}
      </FormHelperText>
      <Button id={`${id}-retry`} onClick={catalogue.retry} sx={{ mt: 1 }}>
        {t("picker.retry")}
      </Button>
    </>
  );
}
