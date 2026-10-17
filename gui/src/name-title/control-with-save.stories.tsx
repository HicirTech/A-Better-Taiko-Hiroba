import { Box, TextField } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { ControlWithSave } from "./control-with-save";

interface Args {
  readonly disabled: boolean;
  readonly onSave: () => void;
}

const meta = {
  title: "Buttons/ControlWithSave",
  tags: ["name-title"],
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box sx={{ maxWidth: 600 }}>
        <ControlWithSave id="story-save" i18n={i18n} {...args}>
          <TextField
            fullWidth
            label={i18n.t("name.heading")}
            defaultValue={STORY_PROFILE.nickname}
          />
        </ControlWithSave>
      </Box>
    );
  },
  args: { disabled: false, onSave: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A control with its Save on one row; the button goes under it when the row is too narrow. */
export const OneRow: Story = {};

export const NothingToSave: Story = { args: { disabled: true } };
