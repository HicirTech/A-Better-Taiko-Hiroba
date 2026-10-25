import type { RecentPlay, ScoreRecord } from "@abth/core";
import { Box, Stack } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { storyPlay } from "../story-kit/plays";
import { storySong } from "../story-kit/songs";
import { STORY_LANE } from "../story-kit/story-pictures";
import { ChartMarks } from "./chart-level";
import { PlayMarks } from "./play-marks";

interface Args {
  /** By what each play shows. */
  readonly plays: Readonly<Record<string, RecentPlay>>;
}

const PLAIN: ScoreRecord["options"] = {
  speed: 1,
  doron: false,
  abekobe: false,
  random: "none",
  supportChart: false,
};

/** A play of a stand-in song with no crown, rank or option but those `shape` gives it. */
const playOf = (shape: Parameters<typeof storyPlay>[1]) =>
  storyPlay("1001", { crown: "played", scoreRank: null, ...shape });

const withOptions = (options: Partial<ScoreRecord["options"]>) =>
  playOf({ record: { options: { ...PLAIN, ...options } } });

const meta = {
  title: "Rows and lists/PlayMarks",
  tags: ["songs"],
  render: ({ plays }, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
        {Object.entries(plays).map(([shows, play], order) => (
          <Box key={shows} sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
            <PlayMarks play={play} lane={STORY_LANE} order={order} i18n={i18n} />
          </Box>
        ))}
      </Stack>
    );
  },
  args: {
    plays: {
      silver: playOf({ crown: "silver" }),
      gold: playOf({ crown: "gold" }),
      donderful: playOf({ crown: "donderful" }),
    },
  },
  argTypes: { plays: { control: false } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A silver, a gold and a donderful crown; a play only played shows none. */
export const EveryCrown: Story = {};

export const EveryRank: Story = {
  args: {
    plays: Object.fromEntries(
      ([2, 3, 4, 5, 6, 7, 8] as const).map((scoreRank) => [scoreRank, playOf({ scoreRank })]),
    ),
  },
};

/** Each play option alone: the two randoms, abekobe, doron and a speed. */
export const EveryOption: Story = {
  args: {
    plays: {
      detarame: withOptions({ random: "detarame" }),
      kimagure: withOptions({ random: "kimagure" }),
      abekobe: withOptions({ abekobe: true }),
      doron: withOptions({ doron: true }),
      speed: withOptions({ speed: 2 }),
    },
  },
};

/** The support chart, in Material's picture, as Hiroba's own is not known. */
export const SupportChart: Story = {
  args: { plays: { support: withOptions({ supportChart: true }) } },
};

/** A play with no crown, rank or option: nothing follows its chart's icon. */
export const NothingToMark: Story = {
  args: { plays: { nothing: playOf({}) } },
  render: ({ plays }, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box sx={{ display: "inline-flex" }}>
        <ChartMarks
          difficulty="oni"
          level={storySong("1001").levels.oni}
          lane={STORY_LANE}
          order={0}
          i18n={i18n}
        >
          {Object.entries(plays).map(([shows, play], order) => (
            <PlayMarks key={shows} play={play} lane={STORY_LANE} order={order} i18n={i18n} />
          ))}
        </ChartMarks>
      </Box>
    );
  },
};
