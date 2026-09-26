import type { MessageKey, Translator } from "@abth/i18n";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";

import type { Shell } from "./platform";
import type {
  HirobaSessionPort,
  ProfileView,
  ReadFailureKind,
  SignInOutcome,
} from "./session-port";

type Screen =
  | { readonly name: "signedOut"; readonly notice: MessageKey | null }
  | { readonly name: "signingIn" }
  | { readonly name: "reading" }
  | { readonly name: "profile"; readonly profile: ProfileView }
  | { readonly name: "readFailed"; readonly kind: ReadFailureKind };

const FAILURE_MESSAGE = {
  notSignedIn: "failure.notSignedIn",
  loggedOut: "failure.loggedOut",
  cardSelectUnfinished: "failure.cardSelectUnfinished",
  unreachable: "failure.unreachable",
  timedOut: "failure.timedOut",
  cancelled: "failure.cancelled",
  siteError: "failure.siteError",
  unexpectedPage: "failure.unexpectedPage",
} as const satisfies Record<ReadFailureKind, MessageKey>;

/** What each way a sign-in can end without a session says on the start screen. */
const SIGN_IN_NOTICE = {
  cancelled: "signIn.cancelled",
  noSession: "signIn.noSession",
  unavailable: "signIn.unavailable",
} as const satisfies Record<Exclude<SignInOutcome["kind"], "signedIn">, MessageKey>;

/** What the shell keeps between launches differs, so the footer says it per shell. */
const SESSION_NOTE = {
  desktop: "signOut.note.desktop",
  android: "signOut.note.android",
} as const satisfies Record<Shell, MessageKey>;

/** Failures after which the platform has already dropped the session: back to signing in. */
const SESSION_GONE: ReadonlySet<ReadFailureKind> = new Set([
  "notSignedIn",
  "loggedOut",
  "cardSelectUnfinished",
]);

export function App({
  port,
  shell,
  i18n,
}: {
  port: HirobaSessionPort;
  shell: Shell;
  i18n: Translator;
}) {
  const { t } = i18n;
  const [screen, setScreen] = useState<Screen>({ name: "signedOut", notice: null });

  const read = async () => {
    setScreen({ name: "reading" });
    const result = await port.readProfile();
    if (result.ok) {
      setScreen({ name: "profile", profile: result.value });
    } else if (SESSION_GONE.has(result.error.kind)) {
      setScreen({ name: "signedOut", notice: FAILURE_MESSAGE[result.error.kind] });
    } else {
      setScreen({ name: "readFailed", kind: result.error.kind });
    }
  };

  const signIn = async () => {
    setScreen({ name: "signingIn" });
    const outcome = await port.signIn();
    if (outcome.kind === "signedIn") {
      await read();
    } else {
      setScreen({ name: "signedOut", notice: SIGN_IN_NOTICE[outcome.kind] });
    }
  };

  const signOut = async () => {
    await port.signOut();
    setScreen({ name: "signedOut", notice: null });
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h5" component="h1">
          {t("app.title")}
        </Typography>

        {screen.name === "signedOut" && (
          <>
            {screen.notice !== null && <Alert severity="info">{t(screen.notice)}</Alert>}
            <Typography>{t("signIn.intro")}</Typography>
            <Button id="sign-in" variant="contained" onClick={signIn}>
              {t("signIn.action")}
            </Button>
          </>
        )}

        {screen.name === "signingIn" && (
          <>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <CircularProgress size={24} />
              <Typography>{t("signIn.inProgress")}</Typography>
            </Stack>
            <Button variant="outlined" onClick={() => void port.cancelSignIn()}>
              {t("signIn.cancel")}
            </Button>
          </>
        )}

        {screen.name === "reading" && (
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <CircularProgress size={24} />
            <Typography>{t("profile.reading")}</Typography>
          </Stack>
        )}

        {screen.name === "profile" && <ProfileCard profile={screen.profile} i18n={i18n} />}

        {screen.name === "readFailed" && (
          <Alert severity="warning">{t(FAILURE_MESSAGE[screen.kind])}</Alert>
        )}

        {(screen.name === "profile" || screen.name === "readFailed") && (
          <Stack direction="row" spacing={2}>
            <Button id="read-again" variant="contained" onClick={read}>
              {t("profile.readAgain")}
            </Button>
            <Button id="sign-out" variant="text" onClick={signOut}>
              {t("signOut.action")}
            </Button>
          </Stack>
        )}

        <Typography variant="body2" color="text.secondary">
          {t(SESSION_NOTE[shell])}
        </Typography>
      </Stack>
    </Container>
  );
}

function ProfileCard({ profile, i18n }: { profile: ProfileView; i18n: Translator }) {
  const { t } = i18n;
  const time = new Date(profile.fetchedAt).toLocaleString(i18n.locale);
  return (
    <Card id="profile" variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="h6" component="h2">
            {profile.nickname}
          </Typography>
          <Typography color="text.secondary">
            {t("profile.title", { title: profile.title })}
          </Typography>
          <Typography>{t("profile.crowns", profile.crowns)}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t("profile.fetchedAt", { time })}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
