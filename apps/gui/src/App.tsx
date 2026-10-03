import type { MessageKey, TranslateParams, Translator } from "@abth/i18n";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CostumePage } from "./my-page/costume-page";
import { FavoritesCard } from "./my-page/favorites-card";
import { MedalCard } from "./my-page/medal-card";
import type { OpenAction } from "./my-page/open-button";
import { OverviewHeader } from "./my-page/overview-header";
import { PanelCard } from "./my-page/panel-card";
import { useCostumeEditor } from "./my-page/use-costume-editor";
import { NameTitlePage } from "./name-title/name-title-page";
import { movedTheTitle, type TitleStep } from "./name-title/title-editor-state";
import { useNameEditor } from "./name-title/use-name-editor";
import { useTitleEditor } from "./name-title/use-title-editor";
import { FrameCorner } from "./navigation/app-frame";
import type { Page } from "./navigation/pages";
import { createPictureLane } from "./pictures/picture-lane";
import type { SystemToast } from "./platform";
import { PullToRead } from "./read-again/pull-to-read";
import { ReadAgainFab } from "./read-again/read-again-fab";
import { FAILURE_MESSAGE, SESSION_GONE } from "./read-failure-message";
import type {
  HirobaSessionPort,
  ProfileView,
  ReadFailureKind,
  SignInOutcome,
} from "./session-port";
import { SettingsPage } from "./settings/settings-page";

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

const OVERVIEW_SPACING = 3;
const FIXED_ART = ["scorePanel", "rankIcon", "crownIcon"] as const;

const SIGN_IN_NOTICE = {
  cancelled: "signIn.cancelled",
  noSession: "signIn.noSession",
  unavailable: "signIn.unavailable",
  refused: "signIn.refused",
} as const satisfies Record<Exclude<SignInOutcome["kind"], "signedIn">, MessageKey>;

export interface AppProps {
  readonly port: HirobaSessionPort;
  readonly i18n: Translator;
  readonly page: Page;
  readonly onNavigate: (page: Page) => void;
  /** Settings' language section, drawn by the window that holds the language. */
  readonly language: ReactNode;
  /** The shell's Toast, where it has one: a long-press names a legend's item by it. */
  readonly toast?: SystemToast;
}

export function App({ port, i18n, page, onNavigate, language, toast }: AppProps) {
  const { t } = i18n;
  const [screen, setScreen] = useState<Screen>({ name: "checking" });
  const [refreshing, setRefreshing] = useState(false);
  const lane = useMemo(() => createPictureLane({ load: (want) => port.readPicture(want) }), [port]);
  const onEditorPage = page === "costume" && screen.name === "profile";
  const onNameTitlePage = page === "nameTitle" && screen.name === "profile";
  const sessionGone = useCallback(
    (notice: MessageKey) => setScreen({ name: "signedOut", notice }),
    [],
  );
  // The editors live here so a draft, review or outcome survives a visit to another page.
  const editor = useCostumeEditor({
    port,
    lane,
    shown: onEditorPage,
    onSessionGone: sessionGone,
  });
  const { refreshUndo, forget: forgetEditor } = editor;
  const titleEditor = useTitleEditor({ port, lane, onSessionGone: sessionGone });
  const { refreshUndo: refreshTitleUndo, forget: forgetTitleEditor } = titleEditor;
  const nameRead = useCallback(
    (nickname: string) =>
      setScreen((now) =>
        now.name === "profile" ? { name: "profile", profile: { ...now.profile, nickname } } : now,
      ),
    [],
  );
  const nameEditor = useNameEditor({
    port,
    lane,
    profile: screen.name === "profile" ? screen.profile : null,
    onSessionGone: sessionGone,
    onNickname: nameRead,
  });
  const { refreshUndo: refreshNameUndo, forget: forgetNameEditor } = nameEditor;

  const writing = editor.writing || titleEditor.writing || nameEditor.writing;
  const { read: readEditor } = editor;
  const { read: readTitles } = titleEditor;
  const editorUnread = editor.step.name === "unread";
  const titlesUnread = titleEditor.step.name === "unread";
  // A first read waits for any write to end rather than rely on the request queue alone.
  useEffect(() => {
    if (onEditorPage && editorUnread && !writing) {
      void readEditor();
    }
  }, [onEditorPage, editorUnread, writing, readEditor]);
  useEffect(() => {
    if (onNameTitlePage && titlesUnread && !writing) {
      void readTitles();
    }
  }, [onNameTitlePage, titlesUnread, writing, readTitles]);

  // behindThePage keeps the page mounted, with its outcome notice and focus, and leaves the
  // portrait alone: a title write does not change the costume.
  const read = useCallback(
    async (behindThePage = false): Promise<boolean> => {
      if (behindThePage) {
        setRefreshing(true);
      } else {
        setScreen({ name: "reading" });
      }
      try {
        const result = await (behindThePage
          ? port.readProfile({ renewsPortrait: false })
          : port.readProfile());
        if (result.ok) {
          // Plates change with the title or season, the portrait with any costume change.
          // Fixed art is kept for good once it came, so only its failures are forgotten.
          lane.renew("titlePlate");
          lane.renew("medalPlate");
          if (!behindThePage) {
            lane.renew("myDon");
          }
          for (const kind of FIXED_ART) {
            lane.forgetFailures(kind);
          }
          await Promise.all([refreshUndo(), refreshTitleUndo(), refreshNameUndo()]);
          setScreen({ name: "profile", profile: result.value });
          return true;
        }
        if (SESSION_GONE.has(result.error.kind)) {
          setScreen({ name: "signedOut", notice: FAILURE_MESSAGE[result.error.kind] });
        } else {
          setScreen({ name: "readFailed", ...result.error });
        }
        return false;
      } finally {
        setRefreshing(false);
      }
    },
    [port, lane, refreshUndo, refreshTitleUndo, refreshNameUndo],
  );

  // A title write that may have moved the title leaves the plate stale: read my page again.
  const stale = useRef<TitleStep | null>(null);
  const titleStep = titleEditor.step;
  useEffect(() => {
    if (
      titleStep.name === "done" &&
      movedTheTitle(titleStep.outcome) &&
      stale.current !== titleStep
    ) {
      stale.current = titleStep;
      void read(true);
    }
  }, [titleStep, read]);

  const signIn = async () => {
    // Hiroba may have ended the last session itself, so no sign-out forgot its pictures.
    lane.forget();
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
    lane.forget();
    await port.signOut();
    setScreen({ name: "signedOut", notice: null });
    onNavigate("overview");
  };

  // Another player may sign in next: keep nothing of the last session's editors.
  const noSession = screen.name === "signedOut" || screen.name === "signingIn";
  useEffect(() => {
    if (noSession) {
      forgetEditor();
      forgetTitleEditor();
      forgetNameEditor();
    }
  }, [noSession, forgetEditor, forgetTitleEditor, forgetNameEditor]);

  const touchFirst = useMediaQuery("(pointer: coarse)", { noSsr: true });
  const portrait: OpenAction = { open: () => onNavigate("costume"), byLongPress: touchFirst };
  const namePlate: OpenAction = { open: () => onNavigate("nameTitle"), byLongPress: touchFirst };

  // Once only: StrictMode runs effects twice in development, and a second run asks Hiroba again.
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

  const signedIn = screen.name === "profile" || screen.name === "readFailed";
  const canReadAgain =
    signedIn &&
    !writing &&
    !refreshing &&
    (!onEditorPage || editor.canRead) &&
    (!onNameTitlePage || titleEditor.canRead);
  // Turns away a second ask that lands before the Fab is shut.
  const readAgainStarted = useRef(false);
  const readAgain = async () => {
    if (!canReadAgain || readAgainStarted.current) {
      return;
    }
    readAgainStarted.current = true;
    try {
      if (onEditorPage) {
        await editor.read();
      } else if ((await read()) && onNameTitlePage) {
        await titleEditor.read();
      }
    } finally {
      readAgainStarted.current = false;
    }
  };
  return (
    <>
      {page !== "settings" && (signedIn || screen.name === "reading") && (
        <>
          <FrameCorner>
            <ReadAgainFab
              reading={
                screen.name === "reading" ||
                refreshing ||
                (onEditorPage && editor.reading) ||
                (onNameTitlePage && titleEditor.reading)
              }
              canRead={canReadAgain}
              touchFirst={touchFirst}
              onRead={readAgain}
              i18n={i18n}
            />
          </FrameCorner>
          <PullToRead active={touchFirst} canRead={canReadAgain} onRead={readAgain} />
        </>
      )}
      {page === "settings" ? (
        <SettingsPage
          i18n={i18n}
          language={language}
          account={
            screen.name === "checking"
              ? { kind: "checking" }
              : screen.name === "reading" || refreshing || writing
                ? { kind: "reading" }
                : signedIn
                  ? {
                      kind: "signedIn",
                      nickname: screen.name === "profile" ? screen.profile.nickname : null,
                      onSignOut: signOut,
                    }
                  : { kind: "signedOut" }
          }
        />
      ) : (
        <Stack spacing={3}>
          {(screen.name === "signedOut" || screen.name === "signingIn") && (
            <Card id="sign-in-card" variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  {screen.name === "signedOut" ? (
                    <>
                      {screen.notice !== null && (
                        <Alert severity="info">{t(screen.notice, screen.noticeParams)}</Alert>
                      )}
                      <Typography>{t("signIn.intro")}</Typography>
                      <Button id="sign-in" variant="contained" onClick={signIn}>
                        {t("signIn.action")}
                      </Button>
                    </>
                  ) : (
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
                </Stack>
              </CardContent>
            </Card>
          )}

          {screen.name === "checking" && <CircularProgress size={24} />}

          {screen.name === "reading" && (
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <CircularProgress size={24} />
              <Typography>{t("profile.reading")}</Typography>
            </Stack>
          )}

          {screen.name === "profile" && page === "costume" && (
            <CostumePage editor={editor} lane={lane} i18n={i18n} />
          )}

          {screen.name === "profile" && page === "nameTitle" && (
            <NameTitlePage
              profile={screen.profile}
              lane={lane}
              i18n={i18n}
              title={titleEditor}
              name={nameEditor}
            />
          )}

          {screen.name === "profile" && page !== "costume" && page !== "nameTitle" && (
            <Stack spacing={page === "overview" ? OVERVIEW_SPACING : 2}>
              {page === "overview" ? (
                <>
                  <OverviewHeader
                    profile={screen.profile}
                    lane={lane}
                    i18n={i18n}
                    portrait={portrait}
                    namePlate={namePlate}
                  />
                  <PanelCard
                    crowns={screen.profile.crowns}
                    ranks={screen.profile.panel.ranks}
                    lane={lane}
                    toast={touchFirst ? toast : undefined}
                    i18n={i18n}
                  />
                  <MedalCard medal={screen.profile.medal} lane={lane} i18n={i18n} />
                </>
              ) : (
                <FavoritesCard
                  favoriteSong={screen.profile.favoriteSong}
                  folder={screen.profile.favoriteFolder}
                  i18n={i18n}
                />
              )}
              <Typography id="last-updated" variant="caption" color="text.secondary" component="p">
                {t("profile.fetchedAt", { time: i18n.dateTime(screen.profile.fetchedAt) })}
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
                  sx={{
                    mt: 1,
                    fontFamily: "monospace",
                    userSelect: "text",
                    wordBreak: "break-all",
                  }}
                >
                  {t("failure.detail", { detail: screen.detail })}
                </Typography>
              )}
            </Alert>
          )}
        </Stack>
      )}
    </>
  );
}
