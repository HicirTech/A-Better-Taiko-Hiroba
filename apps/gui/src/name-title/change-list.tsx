import type { Translator } from "@abth/i18n";
import { Box, Stack, Typography } from "@mui/material";

export function ChangeList({
  id,
  part,
  from,
  to,
  i18n,
}: {
  id: string;
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
