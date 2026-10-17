import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { touchOf } from "../story-kit/devices";
import { i18nOf } from "../story-kit/env";
import { FOCUS_RING, OpenButton } from "./open-button";

interface Args {
  readonly open: () => void;
}

const meta = {
  title: "Buttons/OpenButton",
  tags: ["my-page"],
  render: ({ open }, { globals }) => {
    const { t } = i18nOf(globals);
    return (
      <OpenButton
        id="story-open"
        label={t("costume.open")}
        hint={t("costume.openByLongPress")}
        action={{ open, byLongPress: touchOf(globals) }}
        sx={{ borderRadius: 1, ...FOCUS_RING }}
      >
        <Box sx={{ width: 120, height: 120, bgcolor: "#cfe8f7", borderRadius: 1 }} />
      </OpenButton>
    );
  },
  args: { open: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A picture that opens a page: a click and its tooltip on a PC; on an Android device a tap does
 * nothing and a long press opens it. */
export const OpensAPage: Story = {};
