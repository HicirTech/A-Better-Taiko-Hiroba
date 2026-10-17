import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { IconWant } from "../session-port";
import { touchOf } from "../story-kit/devices";
import { i18nOf, STORY_TOAST } from "../story-kit/env";
import { STORY_LANE } from "../story-kit/story-pictures";
import { LegendItem } from "./legend-item";
import { RANK_COLOUR } from "./panel-colours";

interface Args {
  readonly icon: IconWant | null;
}

const meta = {
  title: "Stats/LegendItem",
  tags: ["my-page"],
  render: ({ icon }, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        <LegendItem
          id="story-rank-8"
          name={i18n.t("scoreRank.8")}
          percent="1.2%"
          colour={RANK_COLOUR[8]}
          icon={icon}
          count={i18n.t("panel.countOf", { count: "3", total: "240" })}
          order={0}
          lane={STORY_LANE}
          toast={touchOf(globals) ? STORY_TOAST : undefined}
        />
      </Box>
    );
  },
  args: { icon: { kind: "rankIcon", rank: 8 } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An item's icon and percent. */
export const WithIcon: Story = {};

/** Its coloured dot, where the item has no icon. */
export const DotOnly: Story = { args: { icon: null } };
