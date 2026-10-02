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
import { ShutCostumePage } from "./my-page/costume-shut";
import { FavoritesCard } from "./my-page/favorites-card";
import { MedalCard } from "./my-page/medal-card";
import type { PortraitAction } from "./my-page/my-don-portrait";
import { OverviewHeader } from "./my-page/overview-header";
import { PanelCard } from "./my-page/panel-card";
import { useCostumeEditor } from "./my-page/use-costume-editor";
import { FrameCorner } from "./navigation/app-frame";
import type { Page } from "./navigation/pages";
import { createPictureLane, type PictureLane } from "./pictures/picture-lane";
import { PullToRead } from "./read-again/pull-to-read";
import { ReadAgainFab } from "./read-again/read-again-fab";
import { FAILURE_MESSAGE, SESSION_GONE } from "./read-failure-message";
import type {
  EnabledWrite,
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

/** What each way a sign-in can end without a session says on the start screen. */
const SIGN_IN_NOTICE = {
  cancelled: "signIn.cancelled",
  noSession: "signIn.noSession",
  unavailable: "signIn.unavailable",
  refused: "signIn.refused",
} as const satisfies Record<Exclude<SignInOutcome["kind"], "signedIn">, MessageKey>;

export interface AppProps {
  readonly port: HirobaSessionPort;
  readonly i18n: Translator;
  /** The page the navigation shows. */
  readonly page: Page;
  readonly onNavigate: (page: Page) => void;
  /** Settings' language section, which the window that holds the language draws. */
  readonly language: ReactNode;
}

/**
 * The app on each page: signed out, the Overview, Costume and Favourites show the sign-in card;
 * signed in, the Overview shows the profile, Costume the editor (or why a run may not change the
 * costume) and Favourites the favourite songs, the profile and the favourites from the same read.
 * Settings works either way.
 */
export function App({ port, i18n, page, onNavigate, language }: AppProps) {
  const { t } = i18n;
  const [screen, setScreen] = useState<Screen>({ name: "checking" });
  /** The kinds of write this run may send, asked once a profile has been read. */
  const [writes, setWrites] = useState<readonly EnabledWrite[]>([]);
  const costumeWrite = writes.find((write) => write.kind === "costume");
  /**
   * The one lane every picture of Hiroba's comes through: one at a time, only what is on screen,
   * each remembered for the run, and none while a write runs.
   */
  const lane = useMemo(() => createPictureLane({ load: (want) => port.readPicture(want) }), [port]);
  /** The Costume page of a run that may change the costume: the one place the editor is read. */
  const onEditorPage =
    page === "costume" && screen.name === "profile" && costumeWrite !== undefined;
  /** The same page of a run that may not: it shows why, and reads nothing. */
  const onShutPage = page === "costume" && screen.name === "profile" && costumeWrite === undefined;
  /** The session ended under the editor: back to signing in, with what happened. */
  const sessionGone = useCallback(
    (notice: MessageKey) => setScreen({ name: "signedOut", notice }),
    [],
  );
  /**
   * The costume editor and the undo, held here so that a draft, a review or an outcome is still
   * there after a visit to another page. It is read when its page is first shown, never before.
   */
  const editor = useCostumeEditor({
    port,
    lane,
    shown: onEditorPage,
    onSessionGone: sessionGone,
  });
  const { refreshUndo, forget: forgetEditor } = editor;

  const read = useCallback(async () => {
    setScreen({ name: "reading" });
    const result = await port.readProfile();
    if (result.ok) {
      // The plates may have changed with the title, the season or its progress, and the portrait
      // with a costume changed anywhere: each is asked for again, and what was shown stays till it
      // comes. The platform says whether the portrait is fetched anew or answered as kept. The score
      // panel's art, kept for good once it came, is asked for again only if it did not.
      lane.renew("titlePlate");
      lane.renew("medalPlate");
      lane.renew("myDon");
      lane.forgetFailures("scorePanel");
      setWrites(await port.enabledWrites());
      await refreshUndo();
      setScreen({ name: "profile", profile: result.value });
    } else if (SESSION_GONE.has(result.error.kind)) {
      setScreen({ name: "signedOut", notice: FAILURE_MESSAGE[result.error.kind] });
    } else {
      setScreen({ name: "readFailed", ...result.error });
    }
  }, [port, lane, refreshUndo]);

  /**
   * A sign-in starts the pictures afresh: whoever signs in may be another player, and when Hiroba
   * ended the last session itself, no sign-out forgot them.
   */
  const signIn = async () => {
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

  /** Signs out, and shows the sign-in card on the Overview. */
  const signOut = async () => {
    lane.forget();
    await port.signOut();
    setScreen({ name: "signedOut", notice: null });
    onNavigate("overview");
  };

  // Whoever signs in next may be another player: nothing of the last session's editor is kept,
  // however the session ended.
  const noSession = screen.name === "signedOut" || screen.name === "signingIn";
  useEffect(() => {
    if (noSession) {
      forgetEditor();
    }
  }, [noSession, forgetEditor]);

  /**
   * A touch-first screen reads again by a pull from the top of the page, not by the Fab, and opens
   * the Costume page by a long-press on the portrait, not a tap.
   */
  const touchFirst = useMediaQuery("(pointer: coarse)", { noSsr: true });
  /** The portrait jumps to the Costume page, which has the editor, or says why it has none. */
  const portrait: PortraitAction = { open: () => onNavigate("costume"), byLongPress: touchFirst };

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

  const signedIn = screen.name === "profile" || screen.name === "readFailed";
  /**
   * Reads again, from the Fab or a pull, as the read on opening does: the editor on the Costume
   * page, my page on any other. Never while a read runs, nor while a save or an undo runs, so no
   * read starts inside a write. The ref turns away a second ask that lands before the Fab is shut.
   */
  const canReadAgain = signedIn && !editor.writing && (!onEditorPage || editor.canRead);
  const readAgainStarted = useRef(false);
  const readAgain = async () => {
    if (!canReadAgain || readAgainStarted.current) {
      return;
    }
    readAgainStarted.current = true;
    try {
      await (onEditorPage ? editor.read() : read());
    } finally {
      readAgainStarted.current = false;
    }
  };
  return (
    <>
      {/* On the pages a read shows, from the first read on, spinning while one runs. */}
      {page !== "settings" && !onShutPage && (signedIn || screen.name === "reading") && (
        <>
          <FrameCorner>
            <ReadAgainFab
              reading={screen.name === "reading" || (onEditorPage && editor.reading)}
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
              : screen.name === "reading" || editor.writing
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

          {screen.name === "profile" &&
            page === "costume" &&
            // Where the costume may not be changed the page still opens, and says so.
            (costumeWrite === undefined ? (
              <ShutCostumePage lane={lane} i18n={i18n} />
            ) : (
              <CostumePage
                editor={editor}
                lane={lane}
                i18n={i18n}
                verified={costumeWrite.verified}
              />
            ))}

          {screen.name === "profile" && page !== "costume" && (
            <Stack spacing={2}>
              {page === "overview" ? (
                <>
                  <ProfileCard
                    profile={screen.profile}
                    lane={lane}
                    i18n={i18n}
                    portrait={portrait}
                  />
                  <PanelCard
                    crowns={screen.profile.crowns}
                    ranks={screen.profile.panel.ranks}
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
              <Typography variant="body2" color="text.secondary">
                {t("profile.fetchedAt", {
                  time: i18n.dateTime(screen.profile.fetchedAt),
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

/**
 * The identity card, drawn as Hiroba's my page draws its header (OverviewHeader): the portrait,
 * which jumps to the Costume page, the title plate and the score panel.
 */
function ProfileCard({
  profile,
  lane,
  i18n,
  portrait,
}: {
  profile: ProfileView;
  lane: PictureLane;
  i18n: Translator;
  portrait: PortraitAction;
}) {
  return (
    <Card id="profile" variant="outlined">
      <CardContent>
        <OverviewHeader profile={profile} lane={lane} i18n={i18n} portrait={portrait} />
      </CardContent>
    </Card>
  );
}
