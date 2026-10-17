import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";

import { i18nOf } from "../story-kit/env";
import { STORY_PLAYS, storyPlay } from "../story-kit/plays";
import { STORY_LANE, WAITING_LANE } from "../story-kit/story-pictures";
import { HistoryRow, opensOnPress } from "./history-row";

const LIST = { listStyle: "none", m: 0, p: 0, maxWidth: 640 } as const;

const rows = (i18n: Translator, opens: boolean) => (
  <Box component="ul" sx={LIST}>
    {STORY_PLAYS.map((play, index) => (
      <HistoryRow
        key={`${play.songTitle}-${play.level}`}
        play={play}
        lane={STORY_LANE}
        order={index}
        i18n={i18n}
        {...(opens ? { rowProps: opensOnPress(action("open details")) } : {})}
      />
    ))}
  </Box>
);

const meta = {
  title: "Rows and lists/HistoryRow",
  tags: ["history"],
  render: (_args, { globals }) => rows(i18nOf(globals), true),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Recent plays as the page lists them: each opens its chart's details. */
export const Plays: Story = {};

/** As Rating and Know yourself list charts, with no details to open. */
export const NotOpenable: Story = { render: (_args, { globals }) => rows(i18nOf(globals), false) };

/** Heading a chart's details: the name scrolls, and the hits move below it. */
export const AsAHeading: Story = {
  render: (_args, { globals }) => (
    <Box sx={{ maxWidth: 480 }}>
      <HistoryRow
        play={storyPlay("1009", { crown: "gold", scoreRank: 7 })}
        lane={STORY_LANE}
        order={0}
        i18n={i18nOf(globals)}
        heading="story-heading"
      />
    </Box>
  ),
};

/** The difficulty, crown and rank keep their room while Hiroba's icons are on their way. */
export const IconsOnTheirWay: Story = {
  render: (_args, { globals }) => (
    <Box component="ul" sx={LIST}>
      {STORY_PLAYS.slice(0, 3).map((play, index) => (
        <HistoryRow
          key={`${play.songTitle}-${play.level}`}
          play={play}
          lane={WAITING_LANE}
          order={index}
          i18n={i18nOf(globals)}
        />
      ))}
    </Box>
  ),
};
