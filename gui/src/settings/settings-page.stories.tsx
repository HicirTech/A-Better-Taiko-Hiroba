import type { RatingSystem } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { action } from "storybook/actions";
import { DEFAULT_STARTING_RATING } from "../shared/rating-data/starting-rating";
import type { SortChoice } from "../shared/scores/score-order";
import { DEFAULT_STARTING_SORT } from "../shared/scores/starting-sort";
import { DEFAULT_CHART_SOURCE } from "../shared/song-catalogue/chart-source";
import { DEFAULT_SHOWN } from "../shared/song-catalogue/shown-difficulty";
import { appearanceOf, i18nOf, localeOf, type StoryGlobals } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { AppearanceSection } from "./appearance-section";
import { LanguageSetting } from "./language-setting";
import { type AccountState, SettingsPage } from "./settings-page";

interface Args {
  readonly account: AccountState;
}

// The page as Settings holds it: its choices change as they are made.
function Page({ account, globals }: Args & { readonly globals: StoryGlobals }) {
  const i18n = i18nOf(globals);
  const [shown, setShown] = useState(DEFAULT_SHOWN);
  const [sort, setSort] = useState<SortChoice>(DEFAULT_STARTING_SORT);
  const [rating, setRating] = useState<RatingSystem>(DEFAULT_STARTING_RATING);
  const [source, setSource] = useState(DEFAULT_CHART_SOURCE);
  return (
    <SettingsPage
      i18n={i18n}
      language={
        <LanguageSetting
          picked={null}
          system={localeOf(globals)}
          onPick={action("pick a language")}
          i18n={i18n}
        />
      }
      appearance={<AppearanceSection {...appearanceOf(globals)} i18n={i18n} />}
      account={account}
      shownDifficulty={shown}
      onShownDifficulty={setShown}
      startingSort={sort}
      onStartingSort={setSort}
      startingRating={rating}
      onStartingRating={setRating}
      chartSource={source}
      onChartSource={setSource}
      updates={{
        version: "0.5.1",
        check: "idle",
        onCheck: action("check for updates"),
        onOpenReleases: action("open the releases"),
      }}
      onOpenRepository={action("open the repository")}
    />
  );
}

const meta = {
  title: "Pages/Settings/SettingsPage",
  tags: ["settings"],
  render: ({ account }, { globals }) => <Page account={account} globals={globals} />,
  args: {
    account: {
      kind: "signedIn",
      nickname: STORY_PROFILE.nickname,
      onSignOut: action("sign out"),
    },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every section, signed in. */
export const SignedIn: Story = {};

/** A read is running: Sign out waits. */
export const Reading: Story = { args: { account: { kind: "reading" } } };

export const SignedOut: Story = { args: { account: { kind: "signedOut" } } };
