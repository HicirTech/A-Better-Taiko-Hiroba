import type { Meta, StoryObj } from "@storybook/react-vite";

import { IconGrid } from "../story-kit/icon-grid";
import { ArrowBackIcon, HistoryIcon, SearchIcon } from "./song-icons";

const meta = {
  title: "Foundations/Icons/SongIcons",
  tags: ["songs"],
  render: () => (
    <IconGrid
      icons={[
        ["SearchIcon", <SearchIcon key="search" />],
        ["ArrowBackIcon", <ArrowBackIcon key="back" />],
        ["HistoryIcon", <HistoryIcon key="history" />],
      ]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The song search's icons. */
export const Icons: Story = {};
