import { Skeleton, Stack } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { userEvent, within } from "storybook/test";

import type { SongCatalogue } from "../favorites/use-song-catalogue";
import { AppFrame } from "../navigation/app-frame";
import { i18nOf, type StoryGlobals } from "../story-kit/env";
import { storyCatalogue } from "../story-kit/songs";
import { STORY_LANE } from "../story-kit/story-pictures";
import { STORY_CHART_PORT } from "../story-kit/story-port";
import { rememberSearch } from "./search-history";
import { SongSearch } from "./song-search";

/** The Overview's search, in the window's top band, over a page that stands in for the Overview. */
const search = (catalogue: SongCatalogue, globals: StoryGlobals) => {
  const i18n = i18nOf(globals);
  return (
    <AppFrame page="overview" onNavigate={action("navigate")} i18n={i18n}>
      <SongSearch
        catalogue={catalogue}
        port={STORY_CHART_PORT}
        lane={STORY_LANE}
        i18n={i18n}
        onOpen={action("open the search")}
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
  tags: ["songs"],
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

/** Opened before typing: the searches kept from before, each with a × that forgets it. */
export const KeptSearches: Story = {
  beforeEach: () => {
    rememberSearch("スケッチ");
    rememberSearch("wings");
  },
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
