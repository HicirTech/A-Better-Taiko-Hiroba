import type { MessageKey, TranslateParams, Translator } from "@abth/i18n";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FavoritesPage } from "./favorites/favorites-page";
import { useFavorites } from "./favorites/use-favorites";
import { usePickableSongs } from "./favorites/use-pickable-songs";
import { useSongCatalogue } from "./favorites/use-song-catalogue";
import { HistoryPage } from "./history/history-page";
import { useRecentPlays } from "./history/use-recent-plays";
import { CostumePage } from "./my-page/costume-page";
import { MedalCard } from "./my-page/medal-card";
import type { OpenAction } from "./my-page/open-button";
import { OverviewHeader } from "./my-page/overview-header";
import { PanelCard } from "./my-page/panel-card";
import { useCostumeEditor } from "./my-page/use-costume-editor";
import { NameTitlePage } from "./name-title/name-title-page";
import { useNameEditor } from "./name-title/use-name-editor";
import { useTitleEditor } from "./name-title/use-title-editor";
import { NavFoot } from "./navigation/app-frame";
import { useFrameNavigation } from "./navigation/frame-navigation";
import type { Page } from "./navigation/pages";
import { createPictureLane } from "./pictures/picture-lane";
import { IO_READ_CONSUMERS } from "./pipelines";
import type { SystemLink, SystemToast } from "./platform";
import { afterRefresh } from "./read-again/after-refresh";
import { PullToRead } from "./read-again/pull-to-read";
import { ReadAgainFoot } from "./read-again/read-again-foot";
import { SHUT_LOOK } from "./read-again/shut-look";
import { useReadAgainKeys } from "./read-again/use-read-again-keys";
import { FAILURE_MESSAGE, SESSION_GONE } from "./read-failure-message";
import { ScoresPage, scoresReadingText } from "./scores/scores-page";
import { useScores } from "./scores/use-scores";
import type {
  HirobaSessionPort,
  ProfileView,
  ReadFailureKind,
  SignInOutcome,
} from "./session-port";
import { SettingsPage } from "./settings/settings-page";
import { SongSearch } from "./songs/song-search";
import { RELEASES_URL, REPOSITORY_URL, releaseUrl } from "./updates";
import { APP_VERSION } from "./updates/app-version";
import { UpdateDialog } from "./updates/update-dialog";
import { useUpdateReminder } from "./updates/use-update-reminder";

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
const HIDDEN = { display: "none" } as const;
const FIXED_ART = ["scorePanel", "rankIcon", "crownIcon"] as const;

const SIGN_IN_NOTICE = {
  cancelled: "signIn.cancelled",
  noSession: "signIn.noSession",
  unavailable: "signIn.unavailable",
  refused: "signIn.refused",
} as const satisfies Record<Exclude<SignInOutcome["kind"], "signedIn">, MessageKey>;

export interface AppProps {
  readonly port: HirobaSessionPort;
  readonly link: SystemLink;
  readonly i18n: Translator;
  readonly page: Page;
  readonly onNavigate: (page: Page) => void;
  /** Settings' language section, drawn by the window that holds the language. */
  readonly language: ReactNode;
  /** The shell's Toast, where it has one: a long-press names a legend's item by it. */
  readonly toast?: SystemToast;
}

export function App({ port, link, i18n, page, onNavigate, language, toast }: AppProps) {
  const { t } = i18n;
  const [screen, setScreen] = useState<Screen>({ name: "checking" });
  const [refreshing, setRefreshing] = useState(false);
  // A read again the user asked for leaves the page in place, shut, rather than swap it out.
  const [shut, setShut] = useState(false);
  const updates = useUpdateReminder(port, APP_VERSION);
  // No more pictures at once than Hiroba's read consumers: the rest wait here, in screen order.
  const lane = useMemo(
    () => createPictureLane({ load: (want) => port.readPicture(want), atOnce: IO_READ_CONSUMERS }),
    [port],
  );
  const onEditorPage = page === "costume" && screen.name === "profile";
  const onNameTitlePage = page === "nameTitle" && screen.name === "profile";
  const onFavoritesPage = page === "favorites" && screen.name === "profile";
  const onHistoryPage = page === "history" && screen.name === "profile";
  const onScoresPage = page === "scores" && screen.name === "profile";
  const sessionGone = useCallback(
    (notice: MessageKey) => setScreen({ name: "signedOut", notice }),
    [],
  );
  const {
    pickable,
    refresh: refreshPickable,
    readIfStale: readPickableIfStale,
    markStale: markPickableStale,
    forget: forgetPickable,
  } = usePickableSongs(port, sessionGone);
  const history = useRecentPlays(port, sessionGone);
  const scores = useScores(port, sessionGone);
  // behindThePage keeps the page mounted, with its outcome notice and focus, and leaves the
  // portrait alone: a title write does not change the costume.
  const read = useCallback(
    async (behindThePage = false, refreshFirst = false): Promise<boolean> => {
      setRefreshing(true);
      if (!behindThePage) {
        setShut(true);
        setScreen((now) => (now.name === "profile" ? now : { name: "reading" }));
      }
      try {
        const readProfile = () =>
          behindThePage ? port.readProfile({ renewsPortrait: false }) : port.readProfile();
        const result = await (refreshFirst ? afterRefresh(port, readProfile) : readProfile());
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
        setShut(false);
      }
    },
    [port, lane],
  );

  // A title write that may have moved the title leaves the plate stale: read my page again.
  const readBehindThePage = useCallback(() => void read(true), [read]);
  // The editors live here so what they read from Hiroba is kept across pages; their edits are not.
  const editor = useCostumeEditor({
    port,
    lane,
    shown: onEditorPage,
    onSessionGone: sessionGone,
  });
  const { forget: forgetEditor, dropEdits: dropEditorEdits } = editor;
  // What a write read back goes into the window's copy of the profile, ahead of the next read.
  const putInProfile = useCallback(
    (worn: Partial<Pick<ProfileView, "nickname" | "title">>) =>
      setScreen((now) =>
        now.name === "profile" ? { name: "profile", profile: { ...now.profile, ...worn } } : now,
      ),
    [],
  );
  const nameRead = useCallback((nickname: string) => putInProfile({ nickname }), [putInProfile]);
  const titleRead = useCallback((title: string) => putInProfile({ title }), [putInProfile]);
  const wornProfile = screen.name === "profile" ? screen.profile : null;
  const titleEditor = useTitleEditor({
    port,
    lane,
    profile: wornProfile,
    onSessionGone: sessionGone,
    onTitle: titleRead,
    onMoved: readBehindThePage,
  });
  const {
    forget: forgetTitleEditor,
    forgetList: forgetTitleList,
    dropEdits: dropTitleEdits,
  } = titleEditor;
  const nameEditor = useNameEditor({
    port,
    lane,
    profile: wornProfile,
    onSessionGone: sessionGone,
    onNickname: nameRead,
  });
  const { forget: forgetNameEditor, dropEdits: dropNameEdits } = nameEditor;
  const favorites = useFavorites({ port, lane, onSessionGone: sessionGone });
  const { forget: forgetFavorites, dropEdits: dropFavoritesEdits, read: readFavorites } = favorites;
  // Read once someone opens the favourites or the song search, and kept from then on.
  const [songsWanted, setSongsWanted] = useState(false);
  const catalogue = useSongCatalogue(port, onFavoritesPage || onScoresPage || songsWanted);

  const writing = editor.writing || titleEditor.writing || nameEditor.writing || favorites.writing;
  const { read: readEditor } = editor;
  const editorUnread = editor.step.name === "unread";
  const favoritesUnread = favorites.step.name === "unread";
  // A first read waits for any write to end rather than rely on the request queue alone.
  useEffect(() => {
    if (onEditorPage && editorUnread && !writing) {
      void readEditor();
    }
  }, [onEditorPage, editorUnread, writing, readEditor]);
  useEffect(() => {
    if (onFavoritesPage && favoritesUnread && !writing) {
      void readFavorites();
    }
  }, [onFavoritesPage, favoritesUnread, writing, readFavorites]);

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
  // Before a sign-in there is only the sign-in card, on the Overview, and no navigation.
  useFrameNavigation(!noSession);
  useEffect(() => {
    if (noSession && page !== "overview") {
      onNavigate("overview");
    }
  }, [noSession, page, onNavigate]);
  useEffect(() => {
    if (noSession) {
      forgetEditor();
      forgetTitleEditor();
      forgetNameEditor();
      forgetFavorites();
      forgetPickable();
    }
  }, [
    noSession,
    forgetEditor,
    forgetTitleEditor,
    forgetNameEditor,
    forgetFavorites,
    forgetPickable,
  ]);

  // Leaving a page drops the edits made on it; the editors keep what they read from Hiroba.
  useEffect(() => {
    if (page !== "costume") {
      dropEditorEdits();
    }
    if (page !== "nameTitle") {
      dropTitleEdits();
      dropNameEdits();
    }
    if (page !== "favorites") {
      dropFavoritesEdits();
    }
  }, [page, dropEditorEdits, dropTitleEdits, dropNameEdits, dropFavoritesEdits]);

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
  // The page that reads an editor of its own reads that again, not my page.
  const pageEditor = onEditorPage
    ? editor
    : onFavoritesPage
      ? favorites
      : onHistoryPage
        ? history
        : onScoresPage
          ? scores
          : null;
  const canReadAgain =
    signedIn && !writing && !refreshing && (pageEditor === null || pageEditor.canRead);
  // Turns away a second ask, by the button or a key, that lands before the button is shut.
  const readAgainStarted = useRef(false);
  const readAgain = async () => {
    if (!canReadAgain || readAgainStarted.current) {
      return;
    }
    readAgainStarted.current = true;
    try {
      if (onHistoryPage) {
        // A walk can run for minutes: Read again on another page must not wait for it.
        void history.read();
      } else if (onScoresPage) {
        void scores.read();
      } else if (pageEditor !== null) {
        if (onFavoritesPage) {
          // The pickers' list is read again when a picker next opens.
          markPickableStale();
        }
        await pageEditor.read(true);
      } else if ((await read(false, true)) && onNameTitlePage) {
        // The titles are read again when the picker next opens.
        forgetTitleList();
      }
    } finally {
      readAgainStarted.current = false;
    }
  };
  useReadAgainKeys(signedIn, readAgain);
  return (
    <>
      {(signedIn || screen.name === "reading") && (
        <NavFoot>
          <ReadAgainFoot
            reading={screen.name === "reading" || refreshing || (pageEditor?.reading ?? false)}
            canRead={canReadAgain}
            fetchedAt={screen.name === "profile" ? screen.profile.fetchedAt : null}
            progress={
              scores.reading
                ? scoresReadingText(i18n, scores.progress, scores.song)
                : history.page === null
                  ? null
                  : t("history.readingPage", { page: history.page })
            }
            onRead={readAgain}
            i18n={i18n}
          />
        </NavFoot>
      )}
      {page !== "settings" && (signedIn || screen.name === "reading") && (
        <PullToRead active={touchFirst} canRead={canReadAgain} onRead={readAgain} />
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
          updates={{
            version: APP_VERSION,
            check: updates.manual,
            onCheck: updates.checkNow,
            onOpenReleases: () => link.open(RELEASES_URL),
          }}
          onOpenRepository={() => link.open(REPOSITORY_URL)}
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

          {/* Laid out as if absent, so the pages keep their place in the frame. */}
          <Box id="page-shut" inert={shut} sx={{ display: "contents", "& > *": SHUT_LOOK(shut) }}>
            {screen.name === "profile" && page === "history" && (
              <HistoryPage history={history} lane={lane} touchFirst={touchFirst} i18n={i18n} />
            )}

            {screen.name === "profile" && page === "scores" && (
              <ScoresPage
                scores={scores}
                catalogue={catalogue}
                lane={lane}
                touchFirst={touchFirst}
                i18n={i18n}
              />
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
                busy={writing}
              />
            )}

            {screen.name === "profile" && page === "favorites" && (
              <FavoritesPage
                favorites={favorites}
                catalogue={catalogue}
                port={port}
                lane={lane}
                pickable={pickable}
                onReadPickable={refreshPickable}
                onPickerOpen={readPickableIfStale}
                i18n={i18n}
              />
            )}

            {screen.name === "profile" && page === "overview" && (
              <SongSearch
                catalogue={catalogue}
                port={port}
                lane={lane}
                i18n={i18n}
                onOpen={() => setSongsWanted(true)}
              >
                {(searching) => (
                  <Stack spacing={OVERVIEW_SPACING} sx={searching ? HIDDEN : undefined}>
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
                  </Stack>
                )}
              </SongSearch>
            )}
          </Box>

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
      <UpdateDialog
        offer={updates.offer}
        i18n={i18n}
        onDownload={(version) => {
          link.open(releaseUrl(version));
          updates.later();
        }}
        onLater={updates.later}
      />
    </>
  );
}
