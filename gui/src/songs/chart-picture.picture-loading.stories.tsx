import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { PictureLoading } from "./chart-picture";

const meta = {
  title: "Status/PictureLoading",
  tags: ["songs"],
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box sx={{ maxWidth: 480 }}>
        <PictureLoading
          label={i18n.t("details.drawnPicture", { difficulty: i18n.t("difficulty.oni") })}
        />
      </Box>
    );
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The skeleton a chart picture keeps its room with while it is on its way. */
export const Loading: Story = {};
