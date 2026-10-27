import { Skeleton, Stack } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useEffect, useState } from "react";
import { action } from "storybook/actions";
import { userEvent, within } from "storybook/test";
import { ProfileSnapshot } from "../my-page/profile-snapshot";
import { AppFrame } from "../navigation/app-frame";
import { PAGE_REGISTRY } from "../pages/registry";
import { DEFAULT_CHART_SOURCE } from "../shared/song-catalogue/chart-source";
import { DEFAULT_SHOWN } from "../shared/song-catalogue/shown-difficulty";
import type { SongCatalogueFailure } from "../shared/song-catalogue/types";
import type { SongCatalogue, WholeRead } from "../shared/song-catalogue/use-song-catalogue";
import { SnapshotButton } from "../snapshots/snapshot-button";
import { modalLookOf, touchOf, wideOf } from "../story-kit/devices";
import { i18nOf, STORY_COPY_OR_SAVE, type StoryGlobals } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { storyCatalogue } from "../story-kit/songs";
import { STORY_LANE } from "../story-kit/story-pictures";
import { STORY_CHART_PORT } from "../story-kit/story-port";
import { withSearch } from "./search-history";
import { SongSearch } from "./song-search";
import type { KeptSearches as Searches } from "./use-kept-searches";

/** The searches as the window would keep them, from `first` on. */
function HeldSearches({
  first,
  children,
}: {
  readonly first: readonly string[];
  readonly children: (kept: Searches) => ReactNode;
}) {
  const [searches, setSearches] = useState(first);
  return children({
    searches,
    remember: (query) => setSearches((now) => withSearch(now, query)),
    forget: (query) => setSearches((now) => now.filter((one) => one !== query)),
    reload: () => undefined,
  });
}

/** The song list, a read of the whole of it ending as the story opens, failed or not. */
function EndingWholeRead({
  failure,
  children,
}: {
  readonly failure: SongCatalogueFailure["code"] | null;
  readonly children: (catalogue: SongCatalogue) => ReactNode;
}) {
  const [wholeRead, setWholeRead] = useState<WholeRead | null>(null);
  useEffect(() => setWholeRead({ at: Date.now(), failure }), [failure]);
  return children({ ...storyCatalogue(), wholeRead });
}

/** The Overview's share button, at the band's end. */
const shareButton = (globals: StoryGlobals) => {
  const i18n = i18nOf(globals);
  return (
    <SnapshotButton
      id="overview-share"
      shows="abth-profile"
      share={STORY_COPY_OR_SAVE}
      lane={STORY_LANE}
      i18n={i18n}
      snapshot={(lane) => <ProfileSnapshot profile={STORY_PROFILE} lane={lane} i18n={i18n} />}
    />
  );
};

/** The Overview's search, in the window's top band, over a page that stands in for the Overview. */
const search = (
  catalogue: SongCatalogue,
  globals: StoryGlobals,
  first: readonly string[] = [],
  end?: ReactNode,
) => {
  const i18n = i18nOf(globals);
  return (
    <AppFrame
      page="overview"
      onNavigate={action("navigate")}
      i18n={i18n}
      pages={PAGE_REGISTRY}
      wide={wideOf(globals)}
      touchFirst={touchOf(globals)}
    >
      <HeldSearches first={first}>
        {(kept) => (
          <SongSearch
            catalogue={catalogue}
            port={STORY_CHART_PORT}
            lane={STORY_LANE}
            touchFirst={touchOf(globals)}
            wide={wideOf(globals)}
            modalLook={modalLookOf(globals)}
            shownDifficulty={DEFAULT_SHOWN}
            chartSource={DEFAULT_CHART_SOURCE}
            keptSearches={kept}
            i18n={i18n}
            onOpen={action("open the search")}
            end={end}
          >
            {(searching) =>
              !searching && (
                <Stack spacing={2}>
                  <Skeleton variant="rounded" height={160} />
                  <Skeleton variant="rounded" height={80} />
                </Stack>
              )
            }
          </SongSearch>
        )}
      </HeldSearches>
    </AppFrame>
  );
};

/** The search's field, once the window has drawn it. */
const fieldIn = (canvas: HTMLElement) =>
  within(canvas).findByRole("textbox", {
    name: (_, element) => element.id === "song-search-input",
  });

const typed =
  (query: string) =>
  async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await userEvent.type(await fieldIn(canvasElement), query);
  };

const meta = {
  title: "Fields/SongSearch",
  tags: ["song-search"],
  parameters: { layout: "fullscreen" },
  render: (_args, { globals }) => search(storyCatalogue(), globals),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The bar across the top band, the page under it. */
export const NotSearching: Story = {};

/** The songs found, the words found bold, each opening its details. */
export const Found: Story = { play: typed("sun") };

export const NothingFound: Story = { play: typed("zzz") };

/** The Overview's share button at the band's end, beside the bar. */
export const BesideTheShareButton: Story = {
  render: (_args, { globals }) => search(storyCatalogue(), globals, [], shareButton(globals)),
};

/** Searching: the share button is hidden, and the bar takes the whole band. */
export const SearchingBesideTheShareButton: Story = {
  render: (_args, { globals }) => search(storyCatalogue(), globals, [], shareButton(globals)),
  play: typed("sun"),
};

/** Opened before typing: the searches kept from before, each with a × that forgets it. */
export const KeptSearches: Story = {
  render: (_args, { globals }) => search(storyCatalogue(), globals, ["wings", "スケッチ"]),
  play: async ({ canvasElement }) => {
    await userEvent.click(await fieldIn(canvasElement));
  },
};

/** The song list is on its way the first time the search opens. */
export const SongListLoading: Story = {
  render: (_args, { globals }) => search(storyCatalogue("loading"), globals),
  play: typed("sun"),
};

export const SongListFailed: Story = {
  render: (_args, { globals }) => search(storyCatalogue("failed"), globals),
  play: typed("sun"),
};

/** taiko.wiki's whole song list read again by a long hold: the bar over the songs kept. */
export const ReadingTheListAgain: Story = {
  render: (_args, { globals }) =>
    search(
      { ...storyCatalogue(), status: { phase: "reading", failure: null, progress: null } },
      globals,
    ),
  play: typed("sun"),
};

/** That read's end, said at the window's foot. */
export const ListReadAgain: Story = {
  render: (_args, { globals }) => (
    <EndingWholeRead failure={null}>{(catalogue) => search(catalogue, globals)}</EndingWholeRead>
  ),
};

export const ListReadAgainFailed: Story = {
  render: (_args, { globals }) => (
    <EndingWholeRead failure="unreachable">
      {(catalogue) => search(catalogue, globals)}
    </EndingWholeRead>
  ),
};
