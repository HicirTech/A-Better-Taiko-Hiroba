import type { Locale } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DEFAULT_SHOWN } from "../shared/song-catalogue/shown-difficulty";
import { levelsOfEntry, lookOfCatalogue } from "../shared/song-catalogue/song-look";
import { nameLanguage } from "../shared/song-catalogue/song-names";
import { searchSongs } from "../shared/song-catalogue/song-search";
import { i18nOf, localeOf } from "../story-kit/env";
import { STORY_SONGS } from "../story-kit/songs";
import { type PickedSongs, type PickerEntry, PickerList } from "./picker-list";

const plainEntries = (locale: Locale, count = 12): readonly PickerEntry[] =>
  STORY_SONGS.slice(0, count).map((song) => ({
    look: lookOfCatalogue(song, locale),
    shown: null,
    other: null,
  }));

interface Args {
  readonly onActivate: (songNo: string, ura: boolean) => void;
}

const meta = {
  title: "Rows and lists/PickerList",
  tags: ["songs"],
  render: (args, { globals }) => (
    <Box sx={{ maxWidth: 640 }}>
      <PickerList
        {...args}
        entries={plainEntries(localeOf(globals))}
        shownDifficulty={DEFAULT_SHOWN}
        i18n={i18nOf(globals)}
        many={null}
      />
    </Box>
  ),
  args: { onActivate: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A picker of one song: each row is a button. */
export const PickOne: Story = {};

const pickedOf = (songNos: readonly string[], limit: number): PickedSongs => ({
  picked: new Set(songNos),
  limit,
});

/** A picker of many: each row a check box. */
export const CheckMany: Story = {
  render: (args, { globals }) => (
    <Box sx={{ maxWidth: 640 }}>
      <PickerList
        {...args}
        entries={plainEntries(localeOf(globals))}
        shownDifficulty={DEFAULT_SHOWN}
        i18n={i18nOf(globals)}
        many={pickedOf(["1002", "1005"], 30)}
      />
    </Box>
  ),
};

/** At the limit, the rows not checked are shut. */
export const AtTheLimit: Story = {
  render: (args, { globals }) => (
    <Box sx={{ maxWidth: 640 }}>
      <PickerList
        {...args}
        entries={plainEntries(localeOf(globals))}
        shownDifficulty={DEFAULT_SHOWN}
        i18n={i18nOf(globals)}
        many={pickedOf(["1001", "1002", "1005"], 3)}
      />
    </Box>
  ),
};

/** A search marks what it found: in the name shown, or in another name after it. */
export const SearchMarked: Story = {
  render: (args, { globals }) => {
    const locale = localeOf(globals);
    const entries = searchSongs(STORY_SONGS, "sun", locale).map(({ song, shown, other }) => ({
      look: lookOfCatalogue(song, locale),
      shown,
      other: other === null ? null : { marked: other, lang: nameLanguage(song, other.text) },
    }));
    return (
      <Box sx={{ maxWidth: 640 }}>
        <PickerList
          {...args}
          entries={entries}
          shownDifficulty={DEFAULT_SHOWN}
          i18n={i18nOf(globals)}
          many={null}
        />
      </Box>
    );
  },
};

/** A song's inner chart is a row of its own, washed in the inner chart's colour. */
export const InnerChartRows: Story = {
  render: (args, { globals }) => {
    const locale = localeOf(globals);
    const entries = STORY_SONGS.filter((song) => song.levels.ura !== null)
      .slice(0, 4)
      .flatMap((song) => {
        const look = lookOfCatalogue(song, locale);
        return [false, true].map((ura) => ({
          look: { ...look, levels: levelsOfEntry(look.levels, ura) },
          shown: null,
          other: null,
          ...(ura ? { ura: true } : {}),
        }));
      });
    return (
      <Box sx={{ maxWidth: 640 }}>
        <PickerList
          {...args}
          entries={entries}
          shownDifficulty={DEFAULT_SHOWN}
          i18n={i18nOf(globals)}
          many={null}
        />
      </Box>
    );
  },
};

// As many rows as the whole song list gives the picker.
const MANY = 1500;

/** A picker of many over the whole song list: only the rows near the window are drawn. */
export const ThousandsOfSongs: Story = {
  render: (args, { globals }) => {
    const locale = localeOf(globals);
    const entries = Array.from({ length: MANY }, (_, index) => index).flatMap((index) => {
      const song = STORY_SONGS[index % STORY_SONGS.length];
      if (song === undefined) {
        return [];
      }
      const look = lookOfCatalogue(song, locale);
      return [{ look: { ...look, songNo: `${90000 + index}` }, shown: null, other: null }];
    });
    return (
      <Box sx={{ maxWidth: 640 }}>
        <PickerList
          {...args}
          entries={entries}
          shownDifficulty={DEFAULT_SHOWN}
          i18n={i18nOf(globals)}
          many={pickedOf(["90001"], 30)}
        />
      </Box>
    );
  },
};
