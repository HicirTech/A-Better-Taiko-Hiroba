import { FavoritesPage } from "../favorites/favorites-page";
import { KnowYourselfPage } from "../know-yourself";
import { CostumePage, CostumePageSkeleton } from "../my-page/costume-page";
import { NameTitlePage } from "../name-title/name-title-page";
import type { Page } from "../navigation/pages";
import { RatingPage } from "../rating";
import { ReadEveryDialog } from "../scores/read-every-dialog";
import { ScoresPage } from "../scores/scores-page";
import { SettingsPage } from "../settings/settings-page";
import { RELEASES_URL, REPOSITORY_URL } from "../shared/updates";
import { scoresReadingProgress } from "../songs/scores-reading";
import {
  CheckroomIcon,
  EditIcon,
  EmojiEventsIcon,
  FavoriteIcon,
  HomeIcon,
  LeaderboardIcon,
  PsychologyIcon,
  SettingsIcon,
} from "../ui/icons";
import { MyPageFailure } from "./my-page-failure";
import { OverviewPage } from "./overview-page";
import type { PageData, PageEntry } from "./page";
import { PAGE_MODELS, scoresRead } from "./page-model";
import {
  FavoritesSkeleton,
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
        keptSets={data.keptSets}
        shownDifficulty={data.shownDifficulty}
        startingSort={data.startingSort}
        touchFirst={data.touchFirst}
        wide={data.wide}
        modalLook={data.modalLook}
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
        modalLook={data.modalLook}
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
        keptSets={data.keptSets}
        shownDifficulty={data.shownDifficulty}
        touchFirst={data.touchFirst}
        toast={data.touchFirst ? data.toast : undefined}
        modalLook={data.modalLook}
        i18n={data.i18n}
      />
    ),
  },
  costume: {
    ...PAGE_MODELS.costume,
    icon: <CheckroomIcon />,
    skeleton: CostumePageSkeleton,
    wider: true,
    draw: (data) => (
      <CostumePage
        editor={data.editor}
        lane={data.lane}
        touchFirst={data.touchFirst}
        wide={data.wide}
        modalLook={data.modalLook}
        i18n={data.i18n}
      />
    ),
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
        keptSets={data.keptSets}
        touchFirst={data.touchFirst}
        menuOpen={data.menuOpen}
        pipelinesShown={data.pipelinesShown}
        shownDifficulty={data.shownDifficulty}
        chartSource={data.chartSource}
        modalLook={data.modalLook}
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
        appearance={data.appearance}
        account={accountOf(data)}
        shownDifficulty={data.shownDifficulty}
        onShownDifficulty={data.onShownDifficulty}
        startingSort={data.startingSort}
        onStartingSort={data.onStartingSort}
        chartSource={data.chartSource}
        onChartSource={data.onChartSource}
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
