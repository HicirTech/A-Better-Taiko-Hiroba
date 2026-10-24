import type { Translator } from "@abth/i18n";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";

import type { Screen } from "../pages/page-model";
import { SectionCard } from "../ui/section-card";

/** The card before a session: Hiroba's sign-in, and why the last one ended; or its progress. */
export function SignInCard({
  screen,
  onSignIn,
  onCancel,
  i18n,
}: {
  readonly screen: Extract<Screen, { readonly name: "signedOut" | "signingIn" }>;
  readonly onSignIn: () => void;
  readonly onCancel: () => void;
  readonly i18n: Translator;
}) {
  const { t } = i18n;
  return (
    <SectionCard id="sign-in-card">
      <Stack spacing={2}>
        {screen.name === "signedOut" ? (
          <>
            {screen.notice !== null && (
              <Alert severity="info">{t(screen.notice, screen.noticeParams)}</Alert>
            )}
            <Typography>{t("signIn.intro")}</Typography>
            <Button id="sign-in" variant="contained" onClick={onSignIn}>
              {t("signIn.action")}
            </Button>
          </>
        ) : (
          <>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <CircularProgress size={24} />
              <Typography>{t("signIn.inProgress")}</Typography>
            </Stack>
            <Button variant="outlined" onClick={onCancel}>
              {t("signIn.cancel")}
            </Button>
          </>
        )}
      </Stack>
    </SectionCard>
  );
}
