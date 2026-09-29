import type { MessageKey, TranslateParams, Translator } from "@abth/i18n";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CostumeDialog } from "./my-page/costume-dialog";
import { FavoritesCard } from "./my-page/favorites-card";
import { MedalCard } from "./my-page/medal-card";
import type { PortraitAction } from "./my-page/my-don-portrait";
import { OverviewHeader } from "./my-page/overview-header";
import { PanelCard } from "./my-page/panel-card";
import { WriteOutcomeNotice } from "./my-page/write-outcome";
import { FrameCorner } from "./navigation/app-frame";
import type { Page } from "./navigation/pages";
import { createPictureLane, type PictureLane } from "./pictures/picture-lane";
import { PullToRead } from "./read-again/pull-to-read";
import { ReadAgainFab } from "./read-again/read-again-fab";
import { FAILURE_MESSAGE } from "./read-failure-message";
import {
  changedTheCostume,
  type EnabledWrite,
  type HirobaSessionPort,
  type ProfileView,
  type ReadFailureKind,
  type SignInOutcome,
  type UndoSummary,
  type WriteOutcomeView,
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

/** Failures after which the platform has already dropped the session: back to signing in. */
const SESSION_GONE: ReadonlySet<ReadFailureKind> = new Set([
  "notSignedIn",
  "loggedOut",
  "cardSelectUnfinished",
]);

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
 * The app on each page: signed out, the Overview and Favourites show the sign-in card; signed in,
 * the Overview shows the profile and Favourites the favourite songs, both from the same read.
 * Settings works either way.
 */
export function App({ port, i18n, page, onNavigate, language }: AppProps) {
  const { t } = i18n;
  const [screen, setScreen] = useState<Screen>({ name: "checking" });
  /** The kinds of write this run may send, asked once a profile has been read. */
  const [writes, setWrites] = useState<readonly EnabledWrite[]>([]);
  const [costumeOpen, setCostumeOpen] = useState(false);
  const costumeWrite = writes.find((write) => write.kind === "costume");
  /** The costume undo this device offers now, if any: asks the platform, never Hiroba. */
  const [undoable, setUndoable] = useState<UndoSummary | null>(null);
  /** A costume write just read back as planned: the Snackbar offering to undo it. */
  const [justSaved, setJustSaved] = useState(false);
  const [undoing, setUndoing] = useState(false);
  /** How the last undo ended, shown on the card until the next write or the next read. */
  const [undoOutcome, setUndoOutcome] = useState<WriteOutcomeView | null>(null);
  /**
   * The one lane every picture of Hiroba's comes through: one at a time, only what is on screen,
   * each remembered for the run, and none while a write runs.
   */
  const lane = useMemo(() => createPictureLane({ load: (want) => port.readPicture(want) }), [port]);

  const refreshUndo = useCallback(async () => {
    const offered = await port.pendingUndo();
    setUndoable(offered.find((one) => one.kind === "costume") ?? null);
  }, [port]);

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
      setUndoOutcome(null);
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

  /**
   * A write ended: the undo on offer is asked for again, and a change that read back as planned
   * offers its undo at once. A change also clears what the card said of the last undo, which no
   * longer describes the costume. One that found the session gone goes back to signing in, as a
   * read does. A write that changed the costume asks for the portrait again, which the platform
   * then fetches anew; any other asks for nothing.
   */
  const writeEnded = (outcome: WriteOutcomeView, asUndo = false) => {
    setJustSaved(!asUndo && outcome.kind === "applied");
    if (!asUndo) {
      setUndoOutcome(null);
    }
    void refreshUndo();
    if (changedTheCostume(outcome)) {
      lane.renew("myDon");
    }
    if (outcome.kind === "sessionGone" || outcome.kind === "notSignedIn") {
      setJustSaved(false);
      setUndoable(null);
      setCostumeOpen(false);
      setScreen({
        name: "signedOut",
        notice:
          outcome.kind === "notSignedIn"
            ? "failure.notSignedIn"
            : outcome.writeMayHaveHappened
              ? "write.sessionGoneAfterSave"
              : "write.sessionGone",
      });
    }
  };

  /** Opens the editor. The Snackbar's undo goes: a new change is being made, not the last one. */
  const openEditor = () => {
    setJustSaved(false);
    setCostumeOpen(true);
  };
  /**
   * A touch-first screen reads again by a pull from the top of the page, not by the Fab, and opens
   * the editor by a long-press on the portrait, not a tap.
   */
  const touchFirst = useMediaQuery("(pointer: coarse)", { noSsr: true });
  /**
   * The portrait opens the editor where this run may change the costume, not while an undo runs;
   * shut on purpose, it says why, rather than leave a card with no way to change anything.
   */
  const portrait: PortraitAction =
    costumeWrite === undefined
      ? { kind: "shut" }
      : { kind: "opensEditor", open: openEditor, busy: undoing, byLongPress: touchFirst };

  /**
   * Undoes the last costume change: a write like any other, its outcome shown on the card. One
   * press starts one undo: the ref turns away a second press that lands before the buttons are
   * disabled, as a double-click on the Snackbar's, still there while it slides out, would.
   */
  const undoStarted = useRef(false);
  const undo = async () => {
    if (undoStarted.current) {
      return;
    }
    undoStarted.current = true;
    setJustSaved(false);
    setCostumeOpen(false);
    setUndoing(true);
    setUndoOutcome(null);
    let outcome: WriteOutcomeView;
    lane.hold();
    try {
      outcome = await port.undo("costume");
    } catch {
      // The call itself failed: how the undo ended is not known, and the card must not stay on
      // "Undoing…" with its buttons shut.
      outcome = { kind: "interrupted" };
    } finally {
      lane.release();
    }
    undoStarted.current = false;
    setUndoing(false);
    setUndoOutcome(outcome);
    writeEnded(outcome, true);
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

  const signedIn = screen.name === "profile" || screen.name === "readFailed";
  /**
   * Reads again, from the Fab or a pull, as the read on opening does. Never while a read runs, nor
   * while the editor is open or an undo runs, so no read starts inside a write. The ref turns away
   * a second ask that lands before the Fab is shut.
   */
  const canReadAgain = signedIn && !costumeOpen && !undoing;
  const readAgainStarted = useRef(false);
  const readAgain = async () => {
    if (!canReadAgain || readAgainStarted.current || undoStarted.current) {
      return;
    }
    readAgainStarted.current = true;
    try {
      await read();
    } finally {
      readAgainStarted.current = false;
    }
  };
  return (
    <>
      {/* On the pages a read shows, from the first read on, spinning while one runs. */}
      {page !== "settings" && (signedIn || screen.name === "reading") && (
        <>
          <FrameCorner>
            <ReadAgainFab
              reading={screen.name === "reading"}
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
          {...(signedIn
            ? {
                account: {
                  nickname: screen.name === "profile" ? screen.profile.nickname : null,
                  onSignOut: signOut,
                },
              }
            : {})}
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

          {screen.name === "profile" && (
            <Stack spacing={2}>
              {page === "overview" ? (
                <>
                  <ProfileCard profile={screen.profile} lane={lane} i18n={i18n} portrait={portrait}>
                    {undoable !== null && (
                      <Button
                        id="costume-undo"
                        variant="text"
                        disabled={undoing}
                        onClick={undo}
                        sx={{ alignSelf: "flex-start" }}
                      >
                        {t("costume.undoLast")}
                      </Button>
                    )}
                    {undoable !== null && (
                      <Typography id="undo-when" variant="body2" color="text.secondary">
                        {t("costume.undoWhen", {
                          time: i18n.dateTime(undoable.at),
                        })}
                      </Typography>
                    )}
                    {undoing && (
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2">{t("costume.undoing")}</Typography>
                      </Stack>
                    )}
                    {undoOutcome !== null && (
                      <WriteOutcomeNotice outcome={undoOutcome} i18n={i18n} asUndo />
                    )}
                  </ProfileCard>
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
      {costumeOpen && screen.name === "profile" && costumeWrite !== undefined && (
        <CostumeDialog
          port={port}
          lane={lane}
          i18n={i18n}
          verified={costumeWrite.verified}
          onClose={() => setCostumeOpen(false)}
          onOutcome={(outcome) => writeEnded(outcome)}
        />
      )}
      {/* Offered once the editor is closed: over an open dialog it would undo under it. */}
      {/* On the Overview alone, too: the one page that shows an undo running and how it ended. */}
      <Snackbar
        open={
          justSaved &&
          undoable !== null &&
          screen.name === "profile" &&
          page === "overview" &&
          !costumeOpen
        }
        autoHideDuration={20_000}
        onClose={(_event, reason) => reason !== "clickaway" && setJustSaved(false)}
        message={t("write.applied")}
        action={
          <Button
            id="snackbar-undo"
            color="secondary"
            size="small"
            disabled={undoing}
            onClick={undo}
          >
            {t("write.undo")}
          </Button>
        }
      />
    </>
  );
}

/**
 * The identity card, drawn as Hiroba's my page draws its header (OverviewHeader): the portrait,
 * which opens the costume editor where this run may change the costume, the title plate and the
 * score panel. `children` are the undo on offer and how the last one ended.
 */
function ProfileCard({
  profile,
  lane,
  i18n,
  portrait,
  children,
}: {
  profile: ProfileView;
  lane: PictureLane;
  i18n: Translator;
  portrait: PortraitAction;
  children?: ReactNode;
}) {
  return (
    <Card id="profile" variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <OverviewHeader profile={profile} lane={lane} i18n={i18n} portrait={portrait} />
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}
