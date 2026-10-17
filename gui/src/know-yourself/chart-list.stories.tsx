import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { fn } from "storybook/test";

import { i18nOf, localeOf } from "../story-kit/env";
import { STORY_KNOWN } from "../story-kit/know";
import { lookOf } from "../story-kit/songs";
import { STORY_LANE } from "../story-kit/story-pictures";
import { ChartList } from "./chart-list";
import { gapKindOf, gapsOf } from "./gaps";

interface Args {
  readonly narrows: boolean;
  readonly onAdd: (songs: readonly string[]) => void;
}

const meta = {
  title: "Rows and lists/ChartList",
  tags: ["know-yourself"],
  render: ({ narrows, onAdd }, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box sx={{ maxWidth: 720 }}>
        <ChartList
          id="story-charts"
          charts={gapsOf(STORY_KNOWN)}
          note={(chart) => i18n.t(gapKindOf(chart) === "never" ? "know.never" : "know.tried")}
          narrows={narrows}
          lookOf={(songNo) => lookOf(songNo, localeOf(globals))}
          opener={() => action("open the chart's details")}
          lane={STORY_LANE}
          i18n={i18n}
          onAdd={onAdd}
        />
      </Box>
    );
  },
  args: { narrows: true, onAdd: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Charts not cleared, the nearest first, with chips for never and already played. */
export const NotCleared: Story = {};

/** The same list with no chips. */
export const WithoutChips: Story = { args: { narrows: false } };
