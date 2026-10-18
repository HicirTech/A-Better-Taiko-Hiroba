import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  AddIcon,
  ArrowDropDownIcon,
  CheckIcon,
  CloseIcon,
  DragHandleIcon,
  SetsIcon,
} from "../../favorites/favorites-icons";
import {
  CostumeIcon,
  FavoritesIcon,
  KnowYourselfIcon,
  NameTitleIcon,
  OverviewIcon,
  HistoryIcon as PageHistoryIcon,
  RatingIcon,
  ScoresIcon,
  SettingsIcon,
} from "../../navigation/page-icons";
import { RefreshIcon } from "../../read-again/read-again-foot";
import { ArrowBackIcon, HistoryIcon, SearchIcon } from "../../songs/song-icons";
import { IconGrid } from "../icon-grid";

const meta = {
  title: "Foundations/Side by side",
  tags: ["gallery"],
  render: () => (
    <IconGrid
      icons={[
        ["favorites-icons/SetsIcon", <SetsIcon key="sets" />],
        ["favorites-icons/CloseIcon", <CloseIcon key="close" />],
        ["favorites-icons/CheckIcon", <CheckIcon key="check" />],
        ["favorites-icons/AddIcon", <AddIcon key="add" />],
        ["favorites-icons/DragHandleIcon", <DragHandleIcon key="drag" />],
        ["favorites-icons/ArrowDropDownIcon", <ArrowDropDownIcon key="drop" />],
        ["page-icons/OverviewIcon", <OverviewIcon key="overview" />],
        ["page-icons/HistoryIcon", <PageHistoryIcon key="page-history" />],
        ["page-icons/ScoresIcon", <ScoresIcon key="scores" />],
        ["page-icons/RatingIcon", <RatingIcon key="rating" />],
        ["page-icons/KnowYourselfIcon", <KnowYourselfIcon key="know" />],
        ["page-icons/CostumeIcon", <CostumeIcon key="costume" />],
        ["page-icons/NameTitleIcon", <NameTitleIcon key="name-title" />],
        ["page-icons/FavoritesIcon", <FavoritesIcon key="favorites" />],
        ["page-icons/SettingsIcon", <SettingsIcon key="settings" />],
        ["song-icons/SearchIcon", <SearchIcon key="search" />],
        ["song-icons/ArrowBackIcon", <ArrowBackIcon key="back" />],
        ["song-icons/HistoryIcon", <HistoryIcon key="song-history" />],
        ["read-again-foot/RefreshIcon", <RefreshIcon key="refresh" />],
      ]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every icon a module exports, by module, to see the ones drawn twice. */
export const SideBySide: Story = { name: "Side by side" };
