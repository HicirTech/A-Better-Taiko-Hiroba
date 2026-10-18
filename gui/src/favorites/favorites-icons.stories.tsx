import type { Meta, StoryObj } from "@storybook/react-vite";

import { IconGrid } from "../story-kit/icon-grid";
import {
  AddIcon,
  ArrowDropDownIcon,
  CheckIcon,
  CloseIcon,
  DragHandleIcon,
  SetsIcon,
} from "./favorites-icons";

const meta = {
  title: "Foundations/Icons/FavoritesIcons",
  tags: ["favorites"],
  render: () => (
    <IconGrid
      icons={[
        ["SetsIcon", <SetsIcon key="sets" />],
        ["CloseIcon", <CloseIcon key="close" />],
        ["CheckIcon", <CheckIcon key="check" />],
        ["AddIcon", <AddIcon key="add" />],
        ["DragHandleIcon", <DragHandleIcon key="drag" />],
        ["ArrowDropDownIcon", <ArrowDropDownIcon key="drop" />],
      ]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Material's icons, drawn inline because the icons package is not a dependency. */
export const Icons: Story = {};
