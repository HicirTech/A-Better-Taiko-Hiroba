import { FavoritesPage } from "../favorites/favorites-page";
import { HistoryPage } from "../history/history-page";
import { ReadEveryPlayDialog } from "../history/read-every-play-dialog";
import { KnowYourselfPage } from "../know-yourself";
import { CostumePage, CostumePageSkeleton } from "../my-page/costume-page";
import { NameTitlePage } from "../name-title/name-title-page";
import type { Page } from "../navigation/pages";
import { RatingPage } from "../rating";
import { ReadEveryDialog } from "../scores/read-every-dialog";
import { ScoresPage, scoresReadingProgress } from "../scores/scores-page";
import { SettingsPage } from "../settings/settings-page";
import {
  CheckroomIcon,
  EditIcon,
  EmojiEventsIcon,
  FavoriteIcon,
  HistoryIcon,
  HomeIcon,
  LeaderboardIcon,
  PsychologyIcon,
  SettingsIcon,
} from "../ui/icons";
import { RELEASES_URL, REPOSITORY_URL } from "../updates";
import { MyPageFailure } from "./my-page-failure";
import { OverviewPage } from "./overview-page";
import type { PageData, PageEntry } from "./page";
import { PAGE_MODELS, scoresRead } from "./page-model";
import {
  FavoritesSkeleton,
  HistorySkeleton,
  KnowYourselfSkeleton,
  NameTitleSkeleton,
  OverviewSkeleton,
  RatingSkeleton,
  ScoresSkeleton,
} from "./page-skeletons";

const scoresProgress = (data: PageData) =>
  scoresRead(data) ? scoresReadingProgress(data.i18n, data.scores.progress, null) : null;

/** Settings' account section: signed in, signed out, or a read or a write under way. */
function accountOf({ session, writing }: PageData) {
  const { screen, myPage } = session;
  if (screen.name === "checking") {
    return { kind: "checking" } as const;
  }
  if (myPage.phase === "reading" || writing) {
    return { kind: "reading" } as const;
  }
  return screen.name === "profile" || screen.name === "readFailed"
    ? ({
        kind: "signedIn",
        nickname: screen.name === "profile" ? screen.profile.nickname : null,
        onSignOut: session.signOut,
      } as const)
    : ({ kind: "signedOut" } as const);
}

/** Every page: what it reads, and how the navigation lists it and the window draws it. */
export const PAGE_REGISTRY: Readonly<Record<Page, PageEntry>> = {
  overview: {
    ...PAGE_MODELS.overview,
    icon: <HomeIcon />,
    skeleton: OverviewSkeleton,
    draw: (data) => <OverviewPage data={data} />,
  },
  history: {
    ...PAGE_MODELS.history,
    icon: <HistoryIcon />,
    skeleton: HistorySkeleton,
    progress: ({ history, i18n }) =>
      history.reading
        ? { words: i18n.t("history.readingPage", { page: history.page ?? 1 }), done: null }
        : null,
    askEvery: ({ i18n }, open, onAnswer) => (
      <ReadEveryPlayDialog open={open} i18n={i18n} onAnswer={onAnswer} />
    ),
    draw: (data) => (
      <HistoryPage
        history={data.history}
        scores={data.scores}
        catalogue={data.catalogue}
        lane={data.lane}
        touchFirst={data.touchFirst}
        i18n={data.i18n}
      />
    ),
  },
  scores: {
    ...PAGE_MODELS.scores,
    icon: <EmojiEventsIcon />,
    skeleton: ScoresSkeleton,
    progress: scoresProgress,
    askEvery: ({ scores, i18n }, open, onAnswer) => (
      <ReadEveryDialog
        open={open}
        charts={scores.view?.scores.length ?? 0}
        i18n={i18n}
        onAnswer={onAnswer}
      />
    ),
    draw: (data) => (
      <ScoresPage
        scores={data.scores}
        catalogue={data.catalogue}
        lane={data.lane}
        touchFirst={data.touchFirst}
        i18n={data.i18n}
      />
    ),
  },
  rating: {
    ...PAGE_MODELS.rating,
    icon: <LeaderboardIcon />,
    skeleton: RatingSkeleton,
    progress: scoresProgress,
    draw: (data) => (
      <RatingPage
        scores={data.scores}
        ratingData={data.ratingData}
        catalogue={data.catalogue}
        lane={data.lane}
        touchFirst={data.touchFirst}
        i18n={data.i18n}
      />
    ),
  },
  knowYourself: {
    ...PAGE_MODELS.knowYourself,
    icon: <PsychologyIcon />,
    skeleton: KnowYourselfSkeleton,
    progress: scoresProgress,
    draw: (data) => (
      <KnowYourselfPage
        scores={data.scores}
        listed={data.listed}
        catalogue={data.catalogue}
        lane={data.lane}
        touchFirst={data.touchFirst}
        toast={data.touchFirst ? data.toast : undefined}
        i18n={data.i18n}
      />
    ),
  },
  costume: {
    ...PAGE_MODELS.costume,
    icon: <CheckroomIcon />,
    skeleton: CostumePageSkeleton,
    draw: (data) => <CostumePage editor={data.editor} lane={data.lane} i18n={data.i18n} />,
  },
  nameTitle: {
    ...PAGE_MODELS.nameTitle,
    icon: <EditIcon />,
    skeleton: NameTitleSkeleton,
    draw: (data) => {
      const { screen } = data.session;
      return (
        screen.name === "profile" && (
          <>
            <MyPageFailure data={data} />
            <NameTitlePage
              profile={screen.profile}
              lane={data.lane}
              i18n={data.i18n}
              title={data.titleEditor}
              name={data.nameEditor}
              busy={data.writing}
            />
          </>
        )
      );
    },
  },
  favorites: {
    ...PAGE_MODELS.favorites,
    icon: <FavoriteIcon />,
    skeleton: FavoritesSkeleton,
    draw: (data) => (
      <FavoritesPage
        favorites={data.favorites}
        catalogue={data.catalogue}
        port={data.port}
        lane={data.lane}
        pickable={data.pickable.pickable}
        onPickerOpen={data.pickable.readIfStale}
        i18n={data.i18n}
      />
    ),
  },
  settings: {
    ...PAGE_MODELS.settings,
    icon: <SettingsIcon />,
    skeleton: null,
    draw: (data) => (
      <SettingsPage
        i18n={data.i18n}
        language={data.language}
        account={accountOf(data)}
        updates={{
          version: data.version,
          check: data.updates.manual,
          onCheck: data.updates.checkNow,
          onOpenReleases: () => data.link.open(RELEASES_URL),
        }}
        onOpenRepository={() => data.link.open(REPOSITORY_URL)}
      />
    ),
  },
};
