import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { chartPicturePng } from "../../scripts/mock-pictures";
import { i18nOf } from "../story-kit/env";
import { pictureOf } from "../story-kit/picture-of";
import { PictureButton } from "./chart-picture";
import type { ShownChart } from "./chart-viewer";

interface Args {
  readonly onOpen: (chart: ShownChart) => void;
}

const meta = {
  title: "Buttons/PictureButton",
  tags: ["songs"],
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box sx={{ maxWidth: 480 }}>
        <PictureButton
          {...args}
          picture={pictureOf(chartPicturePng(2))}
          label={i18n.t("details.drawnPicture", { difficulty: i18n.t("difficulty.hard") })}
          drawn
        />
      </Box>
    );
  },
  args: { onOpen: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A chart picture as wide as its column, its corners rounded; a tap opens it. */
export const Picture: Story = {};
