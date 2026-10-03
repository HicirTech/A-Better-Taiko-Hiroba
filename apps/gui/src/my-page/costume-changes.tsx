import type { Translator } from "@abth/i18n";
import { Box, Stack, Typography } from "@mui/material";

import type { CostumeSet } from "../session-port";
import { changedParts, PART_LABEL, partValue } from "./costume-parts";

export function Changes({
  from,
  to,
  i18n,
}: {
  from: CostumeSet;
  to: CostumeSet;
  i18n: Translator;
}) {
  const { t } = i18n;
  const parts = changedParts(from, to);
  return (
    <Stack>
      <Typography variant="subtitle2" component="h2">
        {t("costume.changesHeading")}
      </Typography>
      {parts.length === 0 ? (
        <Typography id="costume-no-changes" variant="body2" color="text.secondary">
          {t("costume.noChanges")}
        </Typography>
      ) : (
        <Box component="ul" id="costume-changes" sx={{ m: 0, pl: 2.5 }}>
          {parts.map((part) => (
            <Typography component="li" variant="body2" key={part}>
              {t("costume.change", {
                part: t(PART_LABEL[part]),
                from: partValue(part, from[part], i18n),
                to: partValue(part, to[part], i18n),
              })}
            </Typography>
          ))}
        </Box>
      )}
    </Stack>
  );
}
