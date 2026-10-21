import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { IconGrid } from "../story-kit/icon-grid";
import * as icons from "./icons";

const SIZES = { display: "flex", alignItems: "center", gap: 1.5 } as const;

const meta = {
  title: "Foundations/Icons",
  tags: ["ui"],
  render: () => (
    <IconGrid
      icons={Object.entries(icons).map(([name, Icon]) => [
        name,
        <Box key={name} sx={SIZES}>
          <Icon />
          <Icon fontSize="small" />
        </Box>,
      ])}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every icon the app draws, by its name in the code: 24 px for a button, 20 px for a row. */
export const Icons: Story = {};
