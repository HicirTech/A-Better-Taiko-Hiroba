import type { Meta, StoryObj } from "@storybook/react-vite";

import { IconGrid } from "../story-kit/icon-grid";
import {
  CostumeIcon,
  FavoritesIcon,
  HistoryIcon,
  KnowYourselfIcon,
  NameTitleIcon,
  OverviewIcon,
  RatingIcon,
  ScoresIcon,
  SettingsIcon,
} from "./page-icons";

const meta = {
  title: "Foundations/Icons/PageIcons",
  tags: ["navigation"],
  render: () => (
    <IconGrid
      icons={[
        ["OverviewIcon", <OverviewIcon key="overview" />],
        ["HistoryIcon", <HistoryIcon key="history" />],
        ["ScoresIcon", <ScoresIcon key="scores" />],
        ["RatingIcon", <RatingIcon key="rating" />],
        ["KnowYourselfIcon", <KnowYourselfIcon key="know" />],
        ["CostumeIcon", <CostumeIcon key="costume" />],
        ["NameTitleIcon", <NameTitleIcon key="name-title" />],
        ["FavoritesIcon", <FavoritesIcon key="favorites" />],
        ["SettingsIcon", <SettingsIcon key="settings" />],
      ]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each page's icon in the navigation, in its order. */
export const Icons: Story = {};
