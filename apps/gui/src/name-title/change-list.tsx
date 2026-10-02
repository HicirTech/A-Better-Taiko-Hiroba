import type { Translator } from "@abth/i18n";
import { Box, Stack, Typography } from "@mui/material";

/**
 * The one change a review lists, under the same heading as the costume's: "Title: A → B". The
 * values are Hiroba's own words, shown as they are; an empty title is said as no title.
 */
export function ChangeList({
  id,
  part,
  from,
  to,
  i18n,
}: {
  /** The list's id. */
  id: string;
  /** What changes, as a word: the title or the name. */
  part: string;
  from: string;
  to: string;
  i18n: Translator;
}) {
  const { t } = i18n;
  return (
    <Stack>
      <Typography variant="subtitle2" component="h3">
        {t("costume.changesHeading")}
      </Typography>
      <Box component="ul" id={id} sx={{ m: 0, pl: 2.5 }}>
        <Typography component="li" variant="body2">
          {t("costume.change", { part, from, to })}
        </Typography>
      </Box>
    </Stack>
  );
}
