import type { MessageKey, TranslateParams, Translator } from "@abth/i18n";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CostumeDialog } from "./my-page/costume-dialog";
import { FavoritesCard } from "./my-page/favorites-card";
import { MedalCard } from "./my-page/medal-card";
import { PanelCard } from "./my-page/panel-card";
import { TitlePlateCard } from "./my-page/title-plate-card";
import { WriteOutcomeNotice } from "./my-page/write-outcome";
import { createPictureLane, type PictureLane } from "./pictures/picture-lane";
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

export function App({ port, i18n }: { port: HirobaSessionPort; i18n: Translator }) {
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
      // comes. The platform says whether the portrait is fetched anew or answered as kept.
      lane.renew("titlePlate");
      lane.renew("medalPlate");
      lane.renew("myDon");
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

  const signOut = async () => {
    lane.forget();
    await port.signOut();
    setScreen({ name: "signedOut", notice: null });
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

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
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
            <ProfileCard profile={screen.profile} lane={lane} i18n={i18n}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                <Button
                  id="costume-open"
                  variant="outlined"
                  disabled={costumeWrite === undefined || undoing}
                  onClick={openEditor}
                >
                  {t("costume.open")}
                </Button>
                {undoable !== null && (
                  <Button id="costume-undo" variant="text" disabled={undoing} onClick={undo}>
                    {t("costume.undoLast")}
                  </Button>
                )}
              </Stack>
              {/* Shut on purpose, and saying so, rather than a card with no way to change anything. */}
              {costumeWrite === undefined && (
                <Typography id="costume-not-open" variant="body2" color="text.secondary">
                  {t("costume.notOpen")}
                </Typography>
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
            <FavoritesCard
              favoriteSong={screen.profile.favoriteSong}
              folder={screen.profile.favoriteFolder}
              i18n={i18n}
            />
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
      <Snackbar
        open={justSaved && undoable !== null && screen.name === "profile" && !costumeOpen}
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
    </Container>
  );
}

/**
 * The identity card, drawn as Hiroba's header draws it, on its title plate (TitlePlateCard). The
 * dan is the name read off my page's label, shown by the label itself. `children` are the card's
 * actions: the writes this run may send, and, shut, those it may not.
 */
function ProfileCard({
  profile,
  lane,
  i18n,
  children,
}: {
  profile: ProfileView;
  lane: PictureLane;
  i18n: Translator;
  children?: ReactNode;
}) {
  return (
    <Card id="profile" variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <TitlePlateCard profile={profile} lane={lane} i18n={i18n} />
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}
