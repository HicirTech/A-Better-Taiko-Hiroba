import type { MessageKey, TranslateParams, Translator } from "@abth/i18n";
import {
  Alert,
  Box,
  Button,
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
import { ReadEveryPlayDialog } from "./history/read-every-play-dialog";
import { useRecentPlays } from "./history/use-recent-plays";
import { KnowYourselfPage } from "./know-yourself";
import { useListedCharts } from "./know-yourself/use-listed-charts";
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
import { PAGE_SKELETONS } from "./page-skeletons";
import { createPictureLane } from "./pictures/picture-lane";
import { IO_READ_CONSUMERS } from "./pipelines";
import type { SystemLink, SystemToast } from "./platform";
import { RatingPage, useRatingData } from "./rating";
import { afterRefresh } from "./read-again/after-refresh";
import { PullToRead } from "./read-again/pull-to-read";
import { ReadAgainFoot } from "./read-again/read-again-foot";
import { useReadAgainKeys } from "./read-again/use-read-again-keys";
import { hirobaSession } from "./read-failure-message";
import { useReadRun } from "./reads/use-read-run";
import { ReadEveryDialog } from "./scores/read-every-dialog";
import { ScoresPage, scoresReadingProgress, scoresReadingText } from "./scores/scores-page";
import { useScores } from "./scores/use-scores";
import type {
  HirobaSessionPort,
  ProfileView,
  ReadFailure,
  ReadFailureKind,
  SignInOutcome,
} from "./session-port";
import { SettingsPage } from "./settings/settings-page";
import { SongSearch } from "./songs/song-search";
import { FADES_IN, usePageRead } from "./ui/page-read";
import { PageSkeleton, type SkeletonProgress } from "./ui/page-skeleton";
import { LoadFailed } from "./ui/read-failure-alert";
import { SectionCard } from "./ui/section-card";
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
// The pages that read data of their own, and what their skeleton says is read.
const READ_LABEL: Partial<Record<Page, MessageKey>> = {
  costume: "costume.reading",
  favorites: "favorites.reading",
  rating: "rating.readingData",
  knowYourself: "picker.loading",
};

/** An editor read for the first time: nothing of Hiroba's held to show meanwhile. */
const readsFirst = (step: { readonly name: string; readonly held?: unknown }) =>
  step.name === "unread" || (step.name === "loading" && step.held === null);
const HIDDEN = { display: "none" } as const;
const SHOWS_SCORES: ReadonlySet<Page> = new Set(["scores", "rating", "knowYourself"]);
const SHOWS_SONG_NAMES: ReadonlySet<Page> = new Set([
  "overview",
  "history",
  "scores",
  "rating",
  "knowYourself",
  "favorites",
]);
const FIXED_ART = ["scorePanel", "rankIcon", "crownIcon"] as const;

const SIGN_IN_NOTICE = {
  cancelled: "signIn.cancelled",
  noSession: "signIn.noSession",
  unavailable: "signIn.unavailable",
  refused: "signIn.refused",
  refuser: "signIn.refuser",
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
  // Whether the read of my page running is the page's own: one behind it, after a write, is not.
  const [readInView, setReadInView] = useState(false);
  const updates = useUpdateReminder(port, APP_VERSION);
  // No more pictures at once than Hiroba's read consumers: the rest wait here, in screen order.
  const lane = useMemo(
    () => createPictureLane({ load: (want) => port.readPicture(want), atOnce: IO_READ_CONSUMERS }),
    [port],
  );
  const onEditorPage = page === "costume" && screen.name === "profile";
  const onFavoritesPage = page === "favorites" && screen.name === "profile";
  const onHistoryPage = page === "history" && screen.name === "profile";
  const onScoresPage = page === "scores" && screen.name === "profile";
  const onRatingPage = page === "rating" && screen.name === "profile";
  const onKnowPage = page === "knowYourself" && screen.name === "profile";
  const sessionGone = useCallback(
    (notice: MessageKey) => setScreen({ name: "signedOut", notice }),
    [],
  );
  const [myPage, myPageStatus] = useReadRun<ReadFailure>(hirobaSession(sessionGone));
  const myPageReading = myPageStatus.phase === "reading";
  const {
    pickable,
    readIfStale: readPickableIfStale,
    markStale: markPickableStale,
    forget: forgetPickable,
  } = usePickableSongs(port, sessionGone);
  const history = useRecentPlays(port, sessionGone);
  const { load: loadPlays, markStale: markPlaysStale, forget: forgetPlays } = history;
  const scores = useScores(port, sessionGone);
  const { load: loadScores, markStale: markScoresStale, forget: forgetScores } = scores;
  const listed = useListedCharts(port, scores.view);
  const ratingData = useRatingData(port);
  const { load: loadRatingData } = ratingData;
  // behindThePage keeps the page mounted, with its outcome notice and focus, and leaves the
  // portrait alone: a title write does not change the costume.
  const read = useCallback(
    async (behindThePage = false, refreshFirst = false): Promise<boolean> => {
      if (myPage.status().phase === "reading") {
        return false;
      }
      setReadInView(!behindThePage);
      if (!behindThePage) {
        setScreen((now) => (now.name === "profile" ? now : { name: "reading" }));
      }
      const readProfile = () =>
        behindThePage ? port.readProfile({ renewsPortrait: false }) : port.readProfile();
      const result = await myPage.run(
        () => (refreshFirst ? afterRefresh(port, readProfile) : readProfile()),
        {
          keep: (answer) => {
            if (!answer.ok) {
              // My page shown stays, the failure over it; with none, the failure takes its place.
              setScreen((now) =>
                now.name === "profile" ? now : { name: "readFailed", ...answer.error },
              );
              return;
            }
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
            setScreen({ name: "profile", profile: answer.value });
          },
        },
      );
      return result?.ok === true;
    },
    [myPage, port, lane],
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
  const catalogue = useSongCatalogue(
    port,
    onFavoritesPage || onHistoryPage || onScoresPage || onRatingPage || onKnowPage || songsWanted,
  );
  const { readIfFailed: readCatalogueIfFailed } = catalogue;

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
  // A page is drawn once it has something to show, and drawn anew after a skeleton, so what it
  // reads as it opens starts here, once a visit: read as it is drawn, a failure would read again.
  useEffect(() => {
    if (onHistoryPage) {
      loadPlays();
    }
    if (onHistoryPage || onScoresPage || onRatingPage || onKnowPage) {
      loadScores();
    }
    if (onRatingPage) {
      loadRatingData();
    }
    if (onKnowPage) {
      // A song list that could not be read is read again as the page opens.
      readCatalogueIfFailed();
    }
  }, [
    onHistoryPage,
    onScoresPage,
    onRatingPage,
    onKnowPage,
    loadPlays,
    loadScores,
    loadRatingData,
    readCatalogueIfFailed,
  ]);
  const profileWaits = screen.name === "checking" || screen.name === "reading";
  // What each page waits for on its first visit, once my page is read.
  const firstReads: Readonly<Record<Exclude<Page, "settings">, boolean>> = {
    overview: false,
    history: history.plays === null,
    scores: scores.view === null,
    rating: scores.view === null || (ratingData.data === null && ratingData.failure === null),
    knowYourself: scores.view === null || listed === null || catalogue.state === "loading",
    costume: readsFirst(editor.step),
    nameTitle: false,
    favorites: readsFirst(favorites.step),
  };
  // A whole read of the scores holds the pages showing them; one song's, for its details, does not.
  const scoresRead = scores.reading && scores.song === null;
  const myPageInView = myPageReading && readInView;
  // What each page's own data is being read for: the page waits for it, as on its first visit.
  const readsNow: Readonly<Record<Exclude<Page, "settings">, boolean>> = {
    overview: myPageInView,
    history: history.reading,
    scores: scoresRead,
    rating: scoresRead || ratingData.reading,
    knowYourself: scoresRead,
    costume: editor.reading,
    nameTitle: myPageInView,
    favorites: favorites.reading,
  };
  const pageWaits =
    page !== "settings" &&
    (profileWaits || (screen.name === "profile" && (firstReads[page] || readsNow[page])));
  // A page read again stays on screen, shut, until its skeleton stands in for it.
  const pageHolds = page !== "settings" && screen.name === "profile" && !firstReads[page];
  const pageRead = usePageRead(pageWaits, page, pageHolds);
  // The skeleton stands alone until the page, or what came in its place, takes over from it.
  const pageShown = screen.name === "profile" && !pageRead.skeleton && (!pageWaits || pageHolds);
  const failureShown = screen.name === "readFailed" && !pageRead.skeleton;
  const PageShape = page === "settings" ? null : PAGE_SKELETONS[page];
  const waitLabel =
    profileWaits || myPageInView
      ? "profile.reading"
      : (READ_LABEL[page] ?? (`nav.${page}` as const));
  // The skeleton's bar says how far the page's read has come, where the read can tell.
  const skeletonProgress: SkeletonProgress | null =
    page === "history" && history.reading
      ? { words: t("history.readingPage", { page: history.page ?? 1 }), done: null }
      : SHOWS_SCORES.has(page) && scoresRead
        ? scoresReadingProgress(i18n, scores.progress, null)
        : null;
  // A skeleton is drawn from the top, so a page read again comes back at its top.
  useEffect(() => {
    if (pageRead.skeleton) {
      window.scrollTo(0, 0);
    }
  }, [pageRead.skeleton]);

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
        ...((outcome.kind === "refused" || outcome.kind === "refuser") && {
          noticeParams: { host: outcome.host },
        }),
      });
    }
  };

  const signOut = async () => {
    lane.forget();
    myPage.forget();
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
      myPage.forget();
      forgetEditor();
      forgetTitleEditor();
      forgetNameEditor();
      forgetFavorites();
      forgetPickable();
      forgetScores();
      forgetPlays();
    }
  }, [
    noSession,
    myPage,
    forgetEditor,
    forgetTitleEditor,
    forgetNameEditor,
    forgetFavorites,
    forgetPickable,
    forgetScores,
    forgetPlays,
  ]);
  // What the device keeps comes in while the window is idle, so no page waits for it later.
  const profileShown = screen.name === "profile";
  useEffect(() => {
    if (!profileShown) {
      return;
    }
    const idle = requestIdleCallback(() => {
      loadScores();
      loadPlays();
    });
    return () => cancelIdleCallback(idle);
  }, [profileShown, loadScores, loadPlays]);

  // Leaving a page drops the edits made on it; the editors keep what they read from Hiroba.
  // A failed read of my page is said on the page it failed on, until another opens.
  useEffect(() => {
    myPage.settle();
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
  }, [page, myPage, dropEditorEdits, dropTitleEdits, dropNameEdits, dropFavoritesEdits]);

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
        : onScoresPage || onRatingPage || onKnowPage
          ? scores
          : null;
  const canReadAgain =
    signedIn && !writing && !myPageReading && (pageEditor === null || pageEditor.canRead);
  // Turns away a second ask, by the button or a key, that lands before the button is shut.
  const readAgainStarted = useRef(false);
  // What Read again reads on each page: the kinds of data it shows, each once. A walk or a read
  // of the scores can run for minutes, so Read again on another page does not wait for it.
  const readsAgain: Readonly<Record<Page, () => Promise<unknown> | undefined>> = {
    overview: () => read(false, true),
    // A walk notes its plays in the scores, and a read of the scores walks the plays.
    history: () => void history.read().then(markScoresStale),
    scores: () => void scores.read().then(markPlaysStale),
    rating: () => void Promise.all([scores.read().then(markPlaysStale), ratingData.read()]),
    knowYourself: () => void scores.read().then(markPlaysStale),
    costume: () => editor.read(true),
    nameTitle: async () => {
      // The titles are read again when the picker next opens.
      if (await read(false, true)) {
        forgetTitleList();
      }
    },
    favorites: () => {
      // The pickers' list is read again when a picker next opens.
      markPickableStale();
      return favorites.read(true);
    },
    settings: () => read(false, true),
  };
  const readAgain = async () => {
    if (!canReadAgain || readAgainStarted.current) {
      return;
    }
    readAgainStarted.current = true;
    try {
      if (SHOWS_SONG_NAMES.has(page)) {
        catalogue.readIfStale();
      }
      // With my page unread, every page waits on it, so it alone is read.
      await (screen.name === "profile" ? readsAgain[page]() : read(false, true));
    } finally {
      readAgainStarted.current = false;
    }
  };
  useReadAgainKeys(signedIn, readAgain);
  // Reading every score or every play takes minutes, so their pages ask for it by a long hold.
  const [askingEvery, setAskingEvery] = useState(false);
  if (askingEvery && !onScoresPage && !onHistoryPage) {
    setAskingEvery(false);
  }
  const keptCharts = scores.view?.scores.length ?? 0;
  const keptPlays = history.plays?.length ?? 0;
  const askEvery =
    (onScoresPage && keptCharts > 0) || (onHistoryPage && keptPlays > 0)
      ? () => setAskingEvery(true)
      : undefined;
  // A read again of my page that failed stands over what the page read before.
  const myPageFailure = screen.name === "profile" && myPageStatus.failure !== null && (
    <LoadFailed
      id="read-failure"
      failure={myPageStatus.failure}
      codeId="failure-detail"
      i18n={i18n}
    />
  );
  return (
    <>
      {(signedIn || screen.name === "reading") && (
        <NavFoot>
          <ReadAgainFoot
            reading={
              myPageReading ||
              (pageEditor?.reading ?? false) ||
              (onRatingPage && ratingData.reading)
            }
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
            onHeld={askEvery}
            i18n={i18n}
          />
        </NavFoot>
      )}
      {page !== "settings" && (signedIn || screen.name === "reading") && (
        <PullToRead
          active={touchFirst}
          canRead={canReadAgain}
          onRead={readAgain}
          onHeld={askEvery}
        />
      )}
      {onScoresPage && (
        <ReadEveryDialog
          open={askingEvery}
          charts={keptCharts}
          i18n={i18n}
          onAnswer={(confirmed) => {
            setAskingEvery(false);
            if (confirmed) {
              void scores.readEvery().then(markPlaysStale);
            }
          }}
        />
      )}
      {onHistoryPage && (
        <ReadEveryPlayDialog
          open={askingEvery}
          i18n={i18n}
          onAnswer={(confirmed) => {
            setAskingEvery(false);
            if (confirmed) {
              void history.readEvery().then(markScoresStale);
            }
          }}
        />
      )}
      {page === "settings" ? (
        <SettingsPage
          i18n={i18n}
          language={language}
          account={
            screen.name === "checking"
              ? { kind: "checking" }
              : myPageReading || writing
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
          {!pageRead.skeleton && (screen.name === "signedOut" || screen.name === "signingIn") && (
            <SectionCard id="sign-in-card">
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
            </SectionCard>
          )}

          {pageRead.skeleton && PageShape !== null && (
            <PageSkeleton page={page} label={t(waitLabel)} progress={skeletonProgress}>
              <PageShape />
            </PageSkeleton>
          )}

          {/* Laid out as if absent, so the pages keep their place in the frame. */}
          <Box
            id="page-shut"
            inert={pageWaits}
            sx={{ display: "contents", "& > *": pageRead.fades ? FADES_IN : {} }}
          >
            {pageShown && page === "history" && (
              <HistoryPage
                history={history}
                scores={scores}
                catalogue={catalogue}
                lane={lane}
                touchFirst={touchFirst}
                i18n={i18n}
              />
            )}

            {pageShown && page === "scores" && (
              <ScoresPage
                scores={scores}
                catalogue={catalogue}
                lane={lane}
                touchFirst={touchFirst}
                i18n={i18n}
              />
            )}

            {pageShown && page === "rating" && (
              <RatingPage
                scores={scores}
                ratingData={ratingData}
                catalogue={catalogue}
                lane={lane}
                touchFirst={touchFirst}
                i18n={i18n}
              />
            )}

            {pageShown && page === "knowYourself" && (
              <KnowYourselfPage
                scores={scores}
                listed={listed}
                catalogue={catalogue}
                lane={lane}
                touchFirst={touchFirst}
                toast={touchFirst ? toast : undefined}
                i18n={i18n}
              />
            )}

            {pageShown && page === "costume" && (
              <CostumePage editor={editor} lane={lane} i18n={i18n} />
            )}

            {pageShown && page === "nameTitle" && myPageFailure}
            {pageShown && page === "nameTitle" && (
              <NameTitlePage
                profile={screen.profile}
                lane={lane}
                i18n={i18n}
                title={titleEditor}
                name={nameEditor}
                busy={writing}
              />
            )}

            {pageShown && page === "favorites" && (
              <FavoritesPage
                favorites={favorites}
                catalogue={catalogue}
                port={port}
                lane={lane}
                pickable={pickable}
                onPickerOpen={readPickableIfStale}
                i18n={i18n}
              />
            )}

            {/* The song search asks Hiroba nothing: it stays when my page could not be read. */}
            {(pageShown || failureShown) && page === "overview" && (
              <SongSearch
                catalogue={catalogue}
                port={port}
                lane={lane}
                i18n={i18n}
                onOpen={() => setSongsWanted(true)}
              >
                {(searching) => (
                  <Stack spacing={OVERVIEW_SPACING} sx={searching ? HIDDEN : undefined}>
                    {screen.name === "profile" ? (
                      <>
                        {myPageFailure}
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
                      <LoadFailed
                        id="read-failure"
                        failure={screen}
                        codeId="failure-detail"
                        i18n={i18n}
                      />
                    )}
                  </Stack>
                )}
              </SongSearch>
            )}
          </Box>

          {failureShown && page !== "overview" && (
            <LoadFailed id="read-failure" failure={screen} codeId="failure-detail" i18n={i18n} />
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
