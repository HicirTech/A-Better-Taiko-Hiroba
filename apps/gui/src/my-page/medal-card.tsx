import type { Translator } from "@abth/i18n";
import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";

import { HIROBA_LANG } from "../language/show-language";
import type { ProfileView } from "../session-port";

/**
 * The どんメダル plate in each of its four states, none of them an error: no plate, a count, a set
 * that is done, and a plate this version cannot read. The card stays in its place in all four, and
 * an unreadable plate costs this card alone, never the rest of the page.
 *
 * The plate's name is the site's own text and is shown as written; nothing reads a season out of it.
 */
export function MedalCard({ medal, i18n }: { medal: ProfileView["medal"]; i18n: Translator }) {
  const { t, number } = i18n;
  const progress = medal?.progress;
  return (
    <Card id="medal" variant="outlined">
      <CardContent>
        <Typography
          variant="subtitle1"
          component="h2"
          lang={HIROBA_LANG}
          sx={{ fontWeight: 500, mb: 1 }}
        >
          {t("medal.heading")}
        </Typography>
        {medal === null && (
          <Typography id="medal-none" color="text.secondary">
            {t("medal.none")}
          </Typography>
        )}
        {medal !== null && medal.name !== "" && (
          <Typography id="medal-name" lang={HIROBA_LANG}>
            {medal.name}
          </Typography>
        )}
        {progress?.kind === "collecting" && (
          <Typography id="medal-count" variant="h6" component="p">
            {t("medal.count", { count: number(progress.count) })}
          </Typography>
        )}
        {progress?.kind === "complete" && (
          <Stack direction="row" sx={{ mt: 0.5 }}>
            <Chip id="medal-complete" label={t("medal.complete")} color="success" size="small" />
          </Stack>
        )}
        {progress?.kind === "unrecognised" && (
          <>
            <Typography id="medal-unrecognised" color="text.secondary" sx={{ mt: 0.5 }}>
              {t("medal.unrecognised")}
            </Typography>
            <Typography
              id="medal-code"
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, fontFamily: "monospace", userSelect: "text", wordBreak: "break-all" }}
            >
              {t("medal.code", { code: `medal=${progress.reason}` })}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}
