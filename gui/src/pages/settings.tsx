import { SettingsPage } from "../settings/settings-page";
import { RELEASES_URL, REPOSITORY_URL } from "../shared/updates";
import { SettingsIcon } from "../ui/icons";
import { readMyPage } from "./model-parts";
import type { PageData, PageEntry } from "./page";
import type { PageModel } from "./page-model";

export const SETTINGS_MODEL: PageModel = {
  label: "nav.settings",
  namesSongs: false,
  needsSongs: false,
  standsAlone: true,
  waits: () => false,
  reading: () => false,
  readAgain: readMyPage,
};

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

export const SETTINGS_PAGE: PageEntry = {
  ...SETTINGS_MODEL,
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
      startingRating={data.startingRating}
      onStartingRating={data.onStartingRating}
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
};
