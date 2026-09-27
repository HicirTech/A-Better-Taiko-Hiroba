import type { MessageKey, TranslateParams, Translator } from "@abth/i18n";
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
import { useCallback, useEffect, useRef, useState } from "react";

import { CrownsCard } from "./my-page/crowns-card";
import { RanksCard } from "./my-page/ranks-card";
import type {
  HirobaSessionPort,
  ProfileView,
  ReadFailureKind,
  SignInOutcome,
} from "./session-port";

type Screen =
  | { readonly name: "checking" }
  | {
      readonly name: "signedOut";
      readonly notice: MessageKey | null;
      readonly noticeParams?: TranslateParams;
    }
  | { readonly name: "signingIn" }
  | { readonly name: "reading" }
  | { readonly name: "profile"; readonly profile: ProfileView }
  | { readonly name: "readFailed"; readonly kind: ReadFailureKind; readonly detail?: string };

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
  refused: "signIn.refused",
} as const satisfies Record<Exclude<SignInOutcome["kind"], "signedIn">, MessageKey>;

/** Failures after which the platform has already dropped the session: back to signing in. */
const SESSION_GONE: ReadonlySet<ReadFailureKind> = new Set([
  "notSignedIn",
  "loggedOut",
  "cardSelectUnfinished",
]);

export function App({ port, i18n }: { port: HirobaSessionPort; i18n: Translator }) {
  const { t } = i18n;
  const [screen, setScreen] = useState<Screen>({ name: "checking" });

  const read = useCallback(async () => {
    setScreen({ name: "reading" });
    const result = await port.readProfile();
    if (result.ok) {
      setScreen({ name: "profile", profile: result.value });
    } else if (SESSION_GONE.has(result.error.kind)) {
      setScreen({ name: "signedOut", notice: FAILURE_MESSAGE[result.error.kind] });
    } else {
      setScreen({ name: "readFailed", ...result.error });
    }
  }, [port]);

  const signIn = async () => {
    setScreen({ name: "signingIn" });
    const outcome = await port.signIn();
    if (outcome.kind === "signedIn") {
      await read();
    } else {
      setScreen({
        name: "signedOut",
        notice: SIGN_IN_NOTICE[outcome.kind],
        ...(outcome.kind === "refused" && { noticeParams: { host: outcome.host } }),
      });
    }
  };

  const signOut = async () => {
    await port.signOut();
    setScreen({ name: "signedOut", notice: null });
  };

  // A session kept from an earlier launch is read once on opening: that is what opening the app
  // asks for. Once, not per render — StrictMode runs effects twice in development, and a second
  // run would be a second request to Hiroba.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) {
      return;
    }
    opened.current = true;
    void port.isSignedIn().then((signedIn) => {
      if (signedIn) {
        void read();
      } else {
        setScreen({ name: "signedOut", notice: null });
      }
    });
  }, [port, read]);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h5" component="h1">
          {t("app.title")}
        </Typography>

        {screen.name === "signedOut" && (
          <>
            {screen.notice !== null && (
              <Alert severity="info">{t(screen.notice, screen.noticeParams)}</Alert>
            )}
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

        {screen.name === "checking" && <CircularProgress size={24} />}

        {screen.name === "reading" && (
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <CircularProgress size={24} />
            <Typography>{t("profile.reading")}</Typography>
          </Stack>
        )}

        {screen.name === "profile" && (
          <Stack spacing={2}>
            <ProfileCard profile={screen.profile} i18n={i18n} />
            <CrownsCard crowns={screen.profile.crowns} i18n={i18n} />
            <RanksCard panel={screen.profile.panel} i18n={i18n} />
            <Typography variant="body2" color="text.secondary">
              {t("profile.fetchedAt", {
                time: new Date(screen.profile.fetchedAt).toLocaleString(i18n.locale),
              })}
            </Typography>
          </Stack>
        )}

        {screen.name === "readFailed" && (
          <Alert severity="warning">
            {t(FAILURE_MESSAGE[screen.kind])}
            {screen.detail !== undefined && (
              <Typography
                id="failure-detail"
                variant="body2"
                sx={{ mt: 1, fontFamily: "monospace", userSelect: "text", wordBreak: "break-all" }}
              >
                {t("failure.detail", { detail: screen.detail })}
              </Typography>
            )}
          </Alert>
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
          {t("signOut.note")}
        </Typography>
      </Stack>
    </Container>
  );
}

function ProfileCard({ profile, i18n }: { profile: ProfileView; i18n: Translator }) {
  const { t } = i18n;
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
        </Stack>
      </CardContent>
    </Card>
  );
}
